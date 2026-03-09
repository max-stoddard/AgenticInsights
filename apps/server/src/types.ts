import type { CalibrationSnapshot, OverviewDiagnostics, PricingEntry, WaterRange } from "@agentic-insights/shared";

export interface FileRecord {
  path: string;
  mtimeMs: number;
  size: number;
}

export interface RawUsageEvent {
  id: string;
  sessionId: string;
  ts: number;
  provider: string;
  model: string;
  source: string;
  totalTokens: number;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  splitSource: "last_usage" | "derived_totals" | "missing";
  transport: "session" | "tui_fallback";
}

export interface ClassifiedUsageEvent extends RawUsageEvent {
  classification: "supported" | "excluded" | "token_only";
  waterLitres: WaterRange;
  eventCostUsd: number | null;
  exclusionReason: string | null;
}

export interface ExclusionAggregate {
  provider: string;
  model: string;
  tokens: number;
  events: number;
  reason: string;
}

export interface DataSnapshot {
  signature: string;
  events: ClassifiedUsageEvent[];
  exclusions: ExclusionAggregate[];
  pricingTable: PricingEntry[];
  sourceLinks: Array<{ label: string; url: string }>;
  benchmarks: WaterRange;
  calibration: CalibrationSnapshot | null;
  lastIndexedAt: number | null;
  diagnostics: OverviewDiagnostics;
}
