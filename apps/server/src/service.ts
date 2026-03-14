import fs from "node:fs";
import type {
  Bucket,
  CoverageClassification,
  IndexingPhase,
  IndexingStatus,
  MethodologyResponse,
  ModelUsageEntry,
  ModelUsageStatus,
  OverviewDiagnostics,
  OverviewResponse,
  TimeseriesPoint,
  TimeseriesResponse,
  WeeklyGrowthMetric,
  WeeklyGrowthSummary,
  WaterRange
} from "@agentic-insights/shared";
import { getOrCreateCalibration, buildSignature } from "./calibration.js";
import { parseClaudeProjectFile, parseClaudeSessionMetaFile } from "./claude.js";
import { getTuiLogPath, listClaudeProjectFiles, listClaudeSessionMetaFiles, listSessionFiles } from "./discovery.js";
import { getCodexHomeConfig, getDefaultClaudeHome } from "./paths.js";
import { parseSessionFile, parseSessionPrompts, parseTuiFallback } from "./parser.js";
import { aggregateDayTimeseries, aggregateFromDayBuckets } from "./aggregation.js";
import { getBucketStartTs, shiftZonedDateTimeByDays } from "./timezone.js";
import {
  BENCHMARK_COEFFICIENTS,
  PRICING_CATALOG_METADATA,
  PRICING_TABLE,
  calculateEventCostUsd,
  canonicalizeDisplayIdentity,
  getMethodologySourcesByTab,
  getPricingEntry
} from "./pricing.js";
import type { ClassifiedUsageEvent, CoverageDetailAggregate, DataSnapshot, PromptRecord, RawUsageEvent } from "./types.js";

interface DiscoveredInputs {
  codexHome: string;
  claudeHome: string;
  dataPath: string;
  signature: string;
  fingerprint: Array<{ path: string; mtimeMs: number; size: number }>;
  foundArtifacts: boolean;
  codexConfiguredInvalid: boolean;
  codexFiles: Array<{ path: string; mtimeMs: number; size: number }>;
  claudeProjectFiles: Array<{ path: string; mtimeMs: number; size: number }>;
  claudeSessionMetaFiles: Array<{ path: string; mtimeMs: number; size: number }>;
  tuiLogPath: string;
}

interface DashboardServiceOptions {
  scheduleIndexingTask?: (task: () => void) => void;
}

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
    const existing = map.get(event.id);
    if (!existing || event.ts < existing.ts) {
      map.set(event.id, event);
    }
  }
  return [...map.values()].sort((a, b) => a.ts - b.ts);
}

function dedupePrompts(prompts: PromptRecord[]): PromptRecord[] {
  const map = new Map<string, PromptRecord>();
  for (const prompt of prompts) {
    const existing = map.get(prompt.id);
    if (!existing || prompt.ts < existing.ts) {
      map.set(prompt.id, prompt);
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
    promptRecords: [],
    coverageDetails: [],
    exclusions: [],
    pricingTable: PRICING_TABLE,
    pricingCatalog: PRICING_CATALOG_METADATA,
    sourcesByTab: getMethodologySourcesByTab([]),
    benchmarks: BENCHMARK_COEFFICIENTS,
    calibration: null,
    lastIndexedAt: null,
    diagnostics
  };
}

function createIndexingStatus(phase: IndexingPhase, startedAt: number, updatedAt: number = startedAt): IndexingStatus {
  return {
    phase,
    startedAt,
    updatedAt
  };
}

function getNoDataMessage(foundArtifacts: boolean): string {
  if (foundArtifacts) {
    return "Local coding agent data was found, but no token history could be parsed yet.";
  }

  return "No local coding agent usage files were found in the tracked directories yet.";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The local coding agent usage directories could not be read.";
}

function formatSourceLabel(source: string): string {
  const normalized = source.trim().toLowerCase();
  if (!normalized || normalized === "unknown") {
    return "Unknown";
  }

  if (normalized === "vscode") {
    return "VS Code extension";
  }

  if (normalized === "cli" || normalized === "exec") {
    return "CLI";
  }

  if (normalized === "claude_code") {
    return "Claude Code";
  }

  return normalized
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function addCoverageDetail(
  details: Map<string, CoverageDetailAggregate>,
  event: RawUsageEvent,
  classification: CoverageClassification,
  reason: string | null
): void {
  const displayIdentity = canonicalizeDisplayIdentity(event.provider, event.model);
  const source = formatSourceLabel(event.source);
  const key = [displayIdentity.provider, displayIdentity.model, source, classification, reason ?? ""].join("|");
  const current = details.get(key) ?? {
    provider: displayIdentity.provider,
    model: displayIdentity.model,
    source,
    tokens: 0,
    events: 0,
    classification,
    reason
  };

  current.tokens += event.totalTokens;
  current.events += 1;
  details.set(key, current);
}

function getMonitoredDataPath(codexHome: string, claudeHome: string): string {
  return `${codexHome}\n${claudeHome}`;
}

function isLocalProvider(provider: string): boolean {
  return provider.trim().toLowerCase() === "ollama";
}

function isSyntheticModel(provider: string, model: string): boolean {
  return provider === "anthropic" && model === "<synthetic>";
}

function buildModelStatus(
  item: ModelUsageEntry & { localTokens: number; unknownTokens: number }
): Pick<ModelUsageEntry, "status" | "statusNote"> {
  const statusBuckets: Array<{ status: ModelUsageStatus; tokens: number; priority: number }> = [
    { status: "unknown", tokens: item.unknownTokens, priority: 3 },
    { status: "local", tokens: item.localTokens, priority: 2 },
    { status: "allowed", tokens: item.supportedTokens + item.unestimatedTokens, priority: 1 }
  ];

  const [dominantStatus] = [...statusBuckets].sort((left, right) => {
    if (right.tokens !== left.tokens) {
      return right.tokens - left.tokens;
    }

    return right.priority - left.priority;
  });

  const notes: string[] = [];
  const hasExternalPricing = getPricingEntry(item.provider, item.model) !== null;

  if (dominantStatus && dominantStatus.status === "unknown" && item.unknownTokens === item.totalTokens) {
    notes.push("pricing not available yet");
  }

  if (dominantStatus && dominantStatus.status === "local" && item.localTokens === item.totalTokens) {
    notes.push("local usage");
    if (!hasExternalPricing) {
      notes.push("pricing not available yet");
    }
  }

  if (item.localTokens > 0 && item.localTokens < item.totalTokens) {
    notes.push("includes local usage");
  }

  if (item.unknownTokens > 0 && item.unknownTokens < item.totalTokens) {
    notes.push("includes unpriced usage");
  }

  if (item.unestimatedTokens > 0) {
    notes.push("includes fallback-only usage");
  }

  return {
    status: dominantStatus?.status ?? "allowed",
    statusNote: notes.length > 0 ? [...new Set(notes)].join(" · ") : null
  };
}

function buildModelUsage(coverageDetails: CoverageDetailAggregate[]): ModelUsageEntry[] {
  const usage = new Map<
    string,
    ModelUsageEntry & {
      localTokens: number;
      unknownTokens: number;
    }
  >();

  for (const detail of coverageDetails) {
    if (isSyntheticModel(detail.provider, detail.model)) {
      continue;
    }

    const key = `${detail.provider}:${detail.model}`;
    const current = usage.get(key) ?? {
      provider: detail.provider,
      model: detail.model,
      totalTokens: 0,
      events: 0,
      supportedTokens: 0,
      excludedTokens: 0,
      unestimatedTokens: 0,
      status: "allowed" as const,
      statusNote: null,
      localTokens: 0,
      unknownTokens: 0
    };

    current.totalTokens += detail.tokens;
    current.events += detail.events;

    if (detail.classification === "supported") {
      current.supportedTokens += detail.tokens;
    } else if (detail.classification === "excluded") {
      current.excludedTokens += detail.tokens;
      if (detail.reason?.startsWith("Local usage: ")) {
        current.localTokens += detail.tokens;
      } else if (detail.reason?.startsWith("Unknown model: ")) {
        current.unknownTokens += detail.tokens;
      }
    } else {
      current.unestimatedTokens += detail.tokens;
    }

    usage.set(key, current);
  }

  return [...usage.values()]
    .map((item) => ({
      provider: item.provider,
      model: item.model,
      totalTokens: item.totalTokens,
      events: item.events,
      supportedTokens: item.supportedTokens,
      excludedTokens: item.excludedTokens,
      unestimatedTokens: item.unestimatedTokens,
      ...buildModelStatus(item)
    }))
    .sort((left, right) => {
      if (right.totalTokens !== left.totalTokens) {
        return right.totalTokens - left.totalTokens;
      }

      return `${left.provider}:${left.model}`.localeCompare(`${right.provider}:${right.model}`);
    });
}

function buildCoverageSummary(snapshot: DataSnapshot): OverviewResponse["coverageSummary"] {
  return {
    sessions: new Set([...snapshot.events.map((event) => event.sessionId), ...snapshot.promptRecords.map((prompt) => prompt.sessionId)]).size,
    prompts: snapshot.promptRecords.length,
    excludedModels: snapshot.coverageDetails.filter((item) => item.classification === "excluded").length
  };
}

function buildWeeklyGrowthMetric(current: number, previous: number): WeeklyGrowthMetric {
  return {
    current,
    previous,
    increase: Math.max(current - previous, 0)
  };
}

function isWithinWindow(ts: number, startTs: number, endTs: number): boolean {
  return ts >= startTs && ts <= endTs;
}

function countSessionsInWindow(snapshot: DataSnapshot, startTs: number, endTs: number): number {
  const sessionIds = new Set<string>();

  for (const event of snapshot.events) {
    if (isWithinWindow(event.ts, startTs, endTs)) {
      sessionIds.add(event.sessionId);
    }
  }

  for (const prompt of snapshot.promptRecords) {
    if (isWithinWindow(prompt.ts, startTs, endTs)) {
      sessionIds.add(prompt.sessionId);
    }
  }

  return sessionIds.size;
}

function countPromptsInWindow(promptRecords: PromptRecord[], startTs: number, endTs: number): number {
  return promptRecords.filter((prompt) => isWithinWindow(prompt.ts, startTs, endTs)).length;
}

function countSupportedTokensInWindow(events: ClassifiedUsageEvent[], startTs: number, endTs: number): number {
  return events.reduce((total, event) => {
    if (event.classification !== "supported" || !isWithinWindow(event.ts, startTs, endTs)) {
      return total;
    }

    return total + event.totalTokens;
  }, 0);
}

function buildWeeklyGrowth(snapshot: DataSnapshot, timeZone: string, nowTs: number = Date.now()): WeeklyGrowthSummary {
  const currentWeekStartTs = getBucketStartTs(nowTs, "week", timeZone);
  const previousAlignedTs = shiftZonedDateTimeByDays(nowTs, -7, timeZone);
  const previousWeekStartTs = getBucketStartTs(previousAlignedTs, "week", timeZone);

  return {
    sessions: buildWeeklyGrowthMetric(
      countSessionsInWindow(snapshot, currentWeekStartTs, nowTs),
      countSessionsInWindow(snapshot, previousWeekStartTs, previousAlignedTs)
    ),
    prompts: buildWeeklyGrowthMetric(
      countPromptsInWindow(snapshot.promptRecords, currentWeekStartTs, nowTs),
      countPromptsInWindow(snapshot.promptRecords, previousWeekStartTs, previousAlignedTs)
    ),
    tokens: buildWeeklyGrowthMetric(
      countSupportedTokensInWindow(snapshot.events, currentWeekStartTs, nowTs),
      countSupportedTokensInWindow(snapshot.events, previousWeekStartTs, previousAlignedTs)
    )
  };
}

function buildOverviewFromSnapshot(
  snapshot: DataSnapshot,
  timeZone: string,
  options: {
    diagnostics?: OverviewDiagnostics;
    indexing?: IndexingStatus | null;
  } = {}
): OverviewResponse {
  const coverageSummary = buildCoverageSummary(snapshot);
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
    coverageSummary,
    weeklyGrowth: buildWeeklyGrowth(snapshot, timeZone),
    modelUsage: buildModelUsage(snapshot.coverageDetails),
    coverageDetails: snapshot.coverageDetails,
    exclusions: snapshot.exclusions,
    lastIndexedAt: snapshot.lastIndexedAt,
    calibration: snapshot.calibration,
    indexing: options.indexing ?? null,
    diagnostics: options.diagnostics ?? snapshot.diagnostics
  };
}

function classifyEvents(rawEvents: RawUsageEvent[], signature: string): Pick<DataSnapshot, "events" | "coverageDetails" | "exclusions" | "calibration"> {
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
  const coverageDetails = new Map<string, CoverageDetailAggregate>();

  const events: ClassifiedUsageEvent[] = rawEvents.map((event) => {
    if (
      event.transport === "tui_fallback" ||
      event.inputTokens === null ||
      event.cachedInputTokens === null ||
      event.outputTokens === null
    ) {
      const reason = "Token totals are available, but token splits needed for pricing-weighted estimation are missing.";
      addCoverageDetail(coverageDetails, event, "token_only", reason);

      return {
        ...event,
        classification: "token_only",
        waterLitres: zeroRange(),
        eventCostUsd: null,
        exclusionReason: reason
      };
    }

    const displayIdentity = canonicalizeDisplayIdentity(event.provider, event.model);
    const pricing = getPricingEntry(event.provider, event.model);
    if (isLocalProvider(event.provider)) {
      const reason = `Local usage: ${displayIdentity.model}`;
      addCoverageDetail(coverageDetails, event, "excluded", reason);

      return {
        ...event,
        classification: "excluded",
        waterLitres: zeroRange(),
        eventCostUsd: null,
        exclusionReason: reason
      };
    }

    if (!pricing) {
      const reason = `Unknown model: ${displayIdentity.model}`;
      addCoverageDetail(coverageDetails, event, "excluded", reason);

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
    addCoverageDetail(coverageDetails, event, "supported", null);

    return {
      ...event,
      classification: "supported",
      waterLitres,
      eventCostUsd,
      exclusionReason: null
    };
  });

  const sortedCoverageDetails = [...coverageDetails.values()].sort((a, b) => {
    if (b.tokens !== a.tokens) {
      return b.tokens - a.tokens;
    }

    return [a.provider, a.model, a.source].join("|").localeCompare([b.provider, b.model, b.source].join("|"));
  });

  return {
    events,
    coverageDetails: sortedCoverageDetails,
    exclusions: sortedCoverageDetails.flatMap((item) => {
      if (item.classification !== "excluded" || item.reason === null) {
        return [];
      }

      return [
        {
          provider: item.provider,
          model: item.model,
          source: item.source,
          tokens: item.tokens,
          events: item.events,
          reason: item.reason
        }
      ];
    }),
    calibration
  };
}

export class DashboardService {
  private lastCompletedSnapshot: DataSnapshot | null = null;
  private lastCompletedSignature: string | null = null;
  private indexingStatus: IndexingStatus | null = null;
  private indexingPromise: Promise<void> | null = null;
  private dayTimeseriesCache = new Map<string, TimeseriesPoint[]>();
  private timeseriesCache = new Map<string, TimeseriesPoint[]>();
  private scheduleIndexingTask: (task: () => void) => void;

  public constructor(options: DashboardServiceOptions = {}) {
    this.scheduleIndexingTask = options.scheduleIndexingTask ?? ((task) => queueMicrotask(task));
  }

  public getOverview(timeZone: string): OverviewResponse {
    const discovery = this.discoverInputs();
    if (discovery instanceof Error) {
      return buildOverviewFromSnapshot(this.cacheCompletedSnapshot(this.createReadErrorSnapshot(discovery)), timeZone);
    }

    if (this.lastCompletedSignature === discovery.signature && this.lastCompletedSnapshot) {
      return buildOverviewFromSnapshot(this.lastCompletedSnapshot, timeZone);
    }

    if (!this.indexingPromise) {
      this.startIndexing(discovery);
    }

    if (this.lastCompletedSignature === discovery.signature && this.lastCompletedSnapshot && !this.indexingPromise) {
      return buildOverviewFromSnapshot(this.lastCompletedSnapshot, timeZone);
    }

    return this.buildIndexingOverview(timeZone, discovery.dataPath, discovery.signature);
  }

  public getTimeseries(bucket: Bucket, timeZone: string): TimeseriesResponse {
    const snapshot = this.getMaterializedSnapshot();
    const cacheKey = this.getTimeseriesCacheKey(snapshot.signature, bucket, timeZone);
    const cached = this.timeseriesCache.get(cacheKey);

    if (cached) {
      return {
        bucket,
        points: cached
      };
    }

    const dayPoints = this.getDayTimeseries(snapshot, timeZone);
    const points = bucket === "day" ? dayPoints : aggregateFromDayBuckets(dayPoints, bucket, timeZone);
    this.timeseriesCache.set(cacheKey, points);

    return {
      bucket,
      points
    };
  }

  public getMethodology(): MethodologyResponse {
    const snapshot = this.getMaterializedSnapshot();
    return {
      pricingTable: snapshot.pricingTable,
      benchmarkCoefficients: snapshot.benchmarks,
      calibration: snapshot.calibration,
      exclusions: snapshot.exclusions,
      pricingCatalog: snapshot.pricingCatalog,
      sourcesByTab: snapshot.sourcesByTab
    };
  }

  private discoverInputs(): DiscoveredInputs | Error {
    const codexHomeConfig = getCodexHomeConfig();
    const codexHome = codexHomeConfig.path;
    const claudeHome = getDefaultClaudeHome();
    const dataPath = getMonitoredDataPath(codexHome, claudeHome);

    try {
      const codexExists = fs.existsSync(codexHome);
      const codexIsDirectory = codexExists && fs.statSync(codexHome).isDirectory();
      const claudeExists = fs.existsSync(claudeHome);
      const claudeIsDirectory = claudeExists && fs.statSync(claudeHome).isDirectory();

      const codexFiles = codexIsDirectory ? listSessionFiles(codexHome) : [];
      const tuiLogPath = getTuiLogPath(codexHome);
      const logFingerprint =
        codexIsDirectory && fs.existsSync(tuiLogPath)
          ? [{ path: tuiLogPath, mtimeMs: Math.floor(fs.statSync(tuiLogPath).mtimeMs), size: fs.statSync(tuiLogPath).size }]
          : [];
      const claudeProjectFiles = claudeIsDirectory ? listClaudeProjectFiles(claudeHome) : [];
      const claudeSessionMetaFiles = claudeIsDirectory ? listClaudeSessionMetaFiles(claudeHome) : [];
      const fingerprint = [
        ...codexFiles.map((file) => ({ path: file.path, mtimeMs: file.mtimeMs, size: file.size })),
        ...logFingerprint,
        ...claudeProjectFiles.map((file) => ({ path: file.path, mtimeMs: file.mtimeMs, size: file.size })),
        ...claudeSessionMetaFiles.map((file) => ({ path: file.path, mtimeMs: file.mtimeMs, size: file.size }))
      ];
      const foundArtifacts = fingerprint.length > 0;
      const codexConfiguredInvalid =
        codexHomeConfig.fromEnv && (!codexExists || (codexExists && !codexIsDirectory));
      const signature = buildSignature({
        codexHome,
        claudeHome,
        codexHomeState: codexIsDirectory ? "ready" : "empty",
        fileFingerprint: fingerprint
      });
      return {
        codexHome,
        claudeHome,
        dataPath,
        signature,
        fingerprint,
        foundArtifacts,
        codexConfiguredInvalid,
        codexFiles,
        claudeProjectFiles,
        claudeSessionMetaFiles,
        tuiLogPath
      };
    } catch (error) {
      return new Error(getErrorMessage(error));
    }
  }

  private buildIndexingOverview(timeZone: string, dataPath: string, signature: string): OverviewResponse {
    const diagnostics = createDiagnostics("indexing", dataPath, null);
    const indexing = this.indexingStatus;
    const snapshot = this.lastCompletedSnapshot ?? createSnapshot(signature, diagnostics);
    return buildOverviewFromSnapshot(snapshot, timeZone, { diagnostics, indexing });
  }

  private getMaterializedSnapshot(): DataSnapshot {
    const discovery = this.discoverInputs();
    if (discovery instanceof Error) {
      return this.cacheCompletedSnapshot(this.createReadErrorSnapshot(discovery));
    }

    if (this.lastCompletedSignature === discovery.signature && this.lastCompletedSnapshot) {
      return this.lastCompletedSnapshot;
    }

    return this.cacheCompletedSnapshot(this.buildSnapshot(discovery));
  }

  private buildSnapshot(discovery: DiscoveredInputs): DataSnapshot {
    const dataPath = discovery.dataPath;
    const startedAt = this.indexingStatus?.startedAt ?? Date.now();
    this.setIndexingPhase("parsing", startedAt);

    const fallbackMap = parseTuiFallback(discovery.tuiLogPath);
    const codexEvents = discovery.codexFiles.flatMap((file) => parseSessionFile(file.path, fallbackMap));
    const codexPrompts = discovery.codexFiles.flatMap((file) => parseSessionPrompts(file.path));

    const claudeSessionModels = new Map<string, string>();
    const parsedClaudeProjects = discovery.claudeProjectFiles.map((file) => parseClaudeProjectFile(file.path));
    const claudeProjectEvents = parsedClaudeProjects.flatMap((parsed) => {
      for (const [sessionId, model] of parsed.sessionModels.entries()) {
        if (!claudeSessionModels.has(sessionId)) {
          claudeSessionModels.set(sessionId, model);
        }
      }
      return parsed.events;
    });
    const claudeProjectPrompts = parsedClaudeProjects.flatMap((parsed) => parsed.prompts);
    const claudeMetaEvents = discovery.claudeSessionMetaFiles.flatMap((file) =>
      parseClaudeSessionMetaFile(file.path, {
        sessionModels: claudeSessionModels,
        sessionsWithProjectEvents: new Set(claudeProjectEvents.map((event) => event.sessionId))
      })
    );

    const rawEvents = dedupeEvents([...codexEvents, ...claudeProjectEvents, ...claudeMetaEvents]);
    const promptRecords = dedupePrompts([...codexPrompts, ...claudeProjectPrompts]);
    const diagnostics =
      rawEvents.length > 0 || promptRecords.length > 0
        ? createDiagnostics("ready", dataPath, null)
        : discovery.codexConfiguredInvalid
          ? createDiagnostics(
              "read_error",
              dataPath,
              !fs.existsSync(discovery.codexHome) ? "Configured Codex home does not exist." : "Configured Codex home is not a directory."
            )
          : createDiagnostics("no_data", dataPath, getNoDataMessage(discovery.foundArtifacts));

    this.setIndexingPhase("estimating", startedAt);
    const classified = classifyEvents(rawEvents, discovery.signature);

    this.setIndexingPhase("finalizing", startedAt);
    const lastIndexedAt = discovery.fingerprint.length > 0 ? Math.max(...discovery.fingerprint.map((file) => file.mtimeMs)) : null;

    return {
      signature: discovery.signature,
      events: classified.events,
      promptRecords,
      coverageDetails: classified.coverageDetails,
      exclusions: classified.exclusions,
      pricingTable: PRICING_TABLE,
      pricingCatalog: PRICING_CATALOG_METADATA,
      sourcesByTab: getMethodologySourcesByTab(rawEvents.map((event) => event.provider)),
      benchmarks: BENCHMARK_COEFFICIENTS,
      calibration: classified.calibration,
      lastIndexedAt,
      diagnostics
    };
  }

  private startIndexing(discovery: DiscoveredInputs): void {
    const startedAt = Date.now();
    let resolveIndexing!: () => void;
    this.indexingStatus = createIndexingStatus("discovering", startedAt);
    this.indexingPromise = new Promise<void>((resolve) => {
      resolveIndexing = resolve;
    });
    this.scheduleIndexingTask(() => {
      try {
        const snapshot = this.buildSnapshot(discovery);
        this.cacheCompletedSnapshot(snapshot);
      } catch (error) {
        this.cacheCompletedSnapshot(this.createReadErrorSnapshot(error));
      } finally {
        this.indexingPromise = null;
        this.indexingStatus = null;
        resolveIndexing();
      }
    });
  }

  private createReadErrorSnapshot(error: unknown): DataSnapshot {
    const codexHome = getCodexHomeConfig().path;
    const claudeHome = getDefaultClaudeHome();
    const dataPath = getMonitoredDataPath(codexHome, claudeHome);
    const diagnostics = createDiagnostics("read_error", dataPath, getErrorMessage(error));

    return createSnapshot(
      buildSignature({
        codexHome,
        claudeHome,
        codexHomeState: "read_error",
        fileFingerprint: []
      }),
      diagnostics
    );
  }

  private setIndexingPhase(phase: IndexingPhase, startedAt: number): void {
    this.indexingStatus = createIndexingStatus(phase, startedAt, Date.now());
  }

  private getDayTimeseries(snapshot: DataSnapshot, timeZone: string): TimeseriesPoint[] {
    const cacheKey = `${snapshot.signature}|${timeZone}`;
    const cached = this.dayTimeseriesCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const points = aggregateDayTimeseries(snapshot.events, timeZone);
    this.dayTimeseriesCache.set(cacheKey, points);
    this.timeseriesCache.set(this.getTimeseriesCacheKey(snapshot.signature, "day", timeZone), points);
    return points;
  }

  private getTimeseriesCacheKey(signature: string, bucket: Bucket, timeZone: string): string {
    return `${signature}|${bucket}|${timeZone}`;
  }

  private cacheCompletedSnapshot(snapshot: DataSnapshot): DataSnapshot {
    if (this.lastCompletedSnapshot?.signature !== snapshot.signature) {
      this.dayTimeseriesCache.clear();
      this.timeseriesCache.clear();
    }

    this.lastCompletedSnapshot = snapshot;
    this.lastCompletedSignature = snapshot.signature;
    return snapshot;
  }
}
