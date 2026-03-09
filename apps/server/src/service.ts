import fs from "node:fs";
import type {
  MethodologyResponse,
  OverviewDiagnostics,
  OverviewResponse,
  TimeseriesResponse,
  WaterRange
} from "@agentic-insights/shared";
import { getOrCreateCalibration, buildSignature } from "./calibration.js";
import { listSessionFiles, getTuiLogPath } from "./discovery.js";
import { getCodexHomeConfig } from "./paths.js";
import { parseSessionFile, parseTuiFallback } from "./parser.js";
import { aggregateTimeseries } from "./aggregation.js";
import { BENCHMARK_COEFFICIENTS, PRICING_TABLE, calculateEventCostUsd, getMethodologySourceLinks, getPricingEntry } from "./pricing.js";
import type { ClassifiedUsageEvent, DataSnapshot, ExclusionAggregate, RawUsageEvent } from "./types.js";

function zeroRange(): WaterRange {
  return { low: 0, central: 0, high: 0 };
}

function scaleRange(base: WaterRange, multiplier: number): WaterRange {
  return {
    low: base.low * multiplier,
    central: base.central * multiplier,
    high: base.high * multiplier
  };
}

function sumRange(target: WaterRange, source: WaterRange): void {
  target.low += source.low;
  target.central += source.central;
  target.high += source.high;
}

function dedupeEvents(events: RawUsageEvent[]): RawUsageEvent[] {
  const map = new Map<string, RawUsageEvent>();
  for (const event of events) {
    const key = [
      event.sessionId,
      event.ts,
      event.totalTokens,
      event.inputTokens,
      event.outputTokens,
      event.cachedInputTokens,
      event.transport
    ].join("|");
    if (!map.has(key)) {
      map.set(key, event);
    }
  }
  return [...map.values()].sort((a, b) => a.ts - b.ts);
}

function createDiagnostics(
  state: OverviewDiagnostics["state"],
  codexHome: string,
  message: string | null
): OverviewDiagnostics {
  return {
    state,
    codexHome,
    message
  };
}

function createSnapshot(signature: string, diagnostics: OverviewDiagnostics): DataSnapshot {
  return {
    signature,
    events: [],
    exclusions: [],
    pricingTable: PRICING_TABLE,
    sourceLinks: getMethodologySourceLinks(),
    benchmarks: BENCHMARK_COEFFICIENTS,
    calibration: null,
    lastIndexedAt: null,
    diagnostics
  };
}

function getNoDataMessage(foundFiles: boolean, foundLog: boolean): string {
  if (foundFiles || foundLog) {
    return "Codex data was found, but no token history could be parsed yet.";
  }

  return "No Codex usage files were found in this directory yet.";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The local Codex usage directory could not be read.";
}

function classifyEvents(rawEvents: RawUsageEvent[], signature: string): Pick<DataSnapshot, "events" | "exclusions" | "calibration"> {
  const supportedCosts = rawEvents
    .flatMap((event) => {
      if (
        event.inputTokens === null ||
        event.cachedInputTokens === null ||
        event.outputTokens === null ||
        event.transport === "tui_fallback"
      ) {
        return [];
      }

      const pricing = getPricingEntry(event.provider, event.model);
      return pricing
        ? [calculateEventCostUsd(pricing, event.inputTokens, event.cachedInputTokens, event.outputTokens)]
        : [];
    })
    .filter((value) => value > 0);

  const calibration = getOrCreateCalibration(signature, supportedCosts);
  const exclusions = new Map<string, ExclusionAggregate>();

  const events: ClassifiedUsageEvent[] = rawEvents.map((event) => {
    if (
      event.transport === "tui_fallback" ||
      event.inputTokens === null ||
      event.cachedInputTokens === null ||
      event.outputTokens === null
    ) {
      return {
        ...event,
        classification: "token_only",
        waterLitres: zeroRange(),
        eventCostUsd: null,
        exclusionReason: "Token totals are available, but token splits needed for pricing-weighted estimation are missing."
      };
    }

    const pricing = getPricingEntry(event.provider, event.model);
    if (!pricing) {
      const reason =
        event.provider !== "openai"
          ? `Unsupported provider: ${event.provider}`
          : `Unsupported model: ${event.model}`;
      const exclusionKey = `${event.provider}:${event.model}:${reason}`;
      const current = exclusions.get(exclusionKey) ?? {
        provider: event.provider,
        model: event.model,
        tokens: 0,
        events: 0,
        reason
      };
      current.tokens += event.totalTokens;
      current.events += 1;
      exclusions.set(exclusionKey, current);

      return {
        ...event,
        classification: "excluded",
        waterLitres: zeroRange(),
        eventCostUsd: null,
        exclusionReason: reason
      };
    }

    const eventCostUsd = calculateEventCostUsd(pricing, event.inputTokens, event.cachedInputTokens, event.outputTokens);
    const waterLitres =
      calibration && calibration.referenceEventCostUsd > 0
        ? scaleRange(BENCHMARK_COEFFICIENTS, eventCostUsd / calibration.referenceEventCostUsd)
        : zeroRange();

    return {
      ...event,
      classification: "supported",
      waterLitres,
      eventCostUsd,
      exclusionReason: null
    };
  });

  return {
    events,
    exclusions: [...exclusions.values()].sort((a, b) => b.tokens - a.tokens),
    calibration
  };
}

export class DashboardService {
  private cachedSnapshot: DataSnapshot | null = null;

  public getOverview(): OverviewResponse {
    const snapshot = this.getSnapshot();
    const waterLitres = zeroRange();
    let totalTokens = 0;
    let supportedTokens = 0;
    let excludedTokens = 0;
    let unestimatedTokens = 0;
    let supportedEvents = 0;
    let excludedEvents = 0;
    let tokenOnlyEvents = 0;

    for (const event of snapshot.events) {
      totalTokens += event.totalTokens;
      sumRange(waterLitres, event.waterLitres);

      if (event.classification === "supported") {
        supportedTokens += event.totalTokens;
        supportedEvents += 1;
      } else if (event.classification === "excluded") {
        excludedTokens += event.totalTokens;
        excludedEvents += 1;
      } else {
        unestimatedTokens += event.totalTokens;
        tokenOnlyEvents += 1;
      }
    }

    return {
      tokenTotals: {
        totalTokens,
        supportedTokens,
        excludedTokens,
        unestimatedTokens
      },
      waterLitres,
      coverage: {
        supportedEvents,
        excludedEvents,
        tokenOnlyEvents
      },
      exclusions: snapshot.exclusions,
      lastIndexedAt: snapshot.lastIndexedAt,
      calibration: snapshot.calibration,
      diagnostics: snapshot.diagnostics
    };
  }

  public getTimeseries(bucket: "day" | "week" | "month", timeZone: string): TimeseriesResponse {
    const snapshot = this.getSnapshot();
    return {
      bucket,
      points: aggregateTimeseries(snapshot.events, bucket, timeZone)
    };
  }

  public getMethodology(): MethodologyResponse {
    const snapshot = this.getSnapshot();
    return {
      pricingTable: snapshot.pricingTable,
      benchmarkCoefficients: snapshot.benchmarks,
      calibration: snapshot.calibration,
      exclusions: snapshot.exclusions,
      sourceLinks: snapshot.sourceLinks
    };
  }

  private getSnapshot(): DataSnapshot {
    const codexHomeConfig = getCodexHomeConfig();
    const codexHome = codexHomeConfig.path;

    try {
      if (!fs.existsSync(codexHome)) {
        const diagnostics = codexHomeConfig.fromEnv
          ? createDiagnostics("read_error", codexHome, "Configured Codex home does not exist.")
          : createDiagnostics("no_data", codexHome, "No local Codex history was found yet.");
        return this.getOrCacheSnapshot(
          createSnapshot(buildSignature({ codexHome, codexHomeState: "missing", fileFingerprint: [] }), diagnostics)
        );
      }

      if (!fs.statSync(codexHome).isDirectory()) {
        const diagnostics = createDiagnostics("read_error", codexHome, "Configured Codex home is not a directory.");
        return this.getOrCacheSnapshot(
          createSnapshot(buildSignature({ codexHome, codexHomeState: "not_directory", fileFingerprint: [] }), diagnostics)
        );
      }

      const files = listSessionFiles(codexHome);
      const tuiLogPath = getTuiLogPath(codexHome);
      const logFingerprint = fs.existsSync(tuiLogPath)
        ? [{ path: tuiLogPath, mtimeMs: Math.floor(fs.statSync(tuiLogPath).mtimeMs), size: fs.statSync(tuiLogPath).size }]
        : [];
      const fingerprint = [...files.map((file) => ({ path: file.path, mtimeMs: file.mtimeMs, size: file.size })), ...logFingerprint];
      const fallbackMap = parseTuiFallback(tuiLogPath);
      const rawEvents = dedupeEvents(files.flatMap((file) => parseSessionFile(file.path, fallbackMap)));
      const diagnostics =
        rawEvents.length > 0
          ? createDiagnostics("ready", codexHome, null)
          : createDiagnostics("no_data", codexHome, getNoDataMessage(files.length > 0, logFingerprint.length > 0));
      const signature = buildSignature({
        codexHome,
        codexHomeState: diagnostics.state === "ready" ? "ready" : "empty",
        fileFingerprint: fingerprint
      });

      if (this.cachedSnapshot?.signature === signature) {
        return this.cachedSnapshot;
      }

      const classified = classifyEvents(rawEvents, signature);
      const lastIndexedAt = files.length > 0 ? Math.max(...files.map((file) => file.mtimeMs)) : null;

      this.cachedSnapshot = {
        signature,
        events: classified.events,
        exclusions: classified.exclusions,
        pricingTable: PRICING_TABLE,
        sourceLinks: getMethodologySourceLinks(),
        benchmarks: BENCHMARK_COEFFICIENTS,
        calibration: classified.calibration,
        lastIndexedAt,
        diagnostics
      };
      return this.cachedSnapshot;
    } catch (error) {
      const diagnostics = createDiagnostics("read_error", codexHome, getErrorMessage(error));
      return this.getOrCacheSnapshot(
        createSnapshot(
          buildSignature({
            codexHome,
            codexHomeState: "read_error",
            fileFingerprint: []
          }),
          diagnostics
        )
      );
    }
  }

  private getOrCacheSnapshot(snapshot: DataSnapshot): DataSnapshot {
    if (this.cachedSnapshot?.signature === snapshot.signature) {
      return this.cachedSnapshot;
    }

    this.cachedSnapshot = snapshot;
    return snapshot;
  }
}
