import type { Bucket, TimeseriesPoint, WaterRange } from "@agentic-insights/shared";
import type { ClassifiedUsageEvent } from "./types.js";
import { getBucketKey, getBucketLabel } from "./timezone.js";

function zeroRange(): WaterRange {
  return { low: 0, central: 0, high: 0 };
}

function addRange(target: WaterRange, source: WaterRange): void {
  target.low += source.low;
  target.central += source.central;
  target.high += source.high;
}

export function aggregateTimeseries(
  events: ClassifiedUsageEvent[],
  bucket: Bucket,
  timeZone: string
): TimeseriesPoint[] {
  const points = new Map<string, TimeseriesPoint>();

  for (const event of events) {
    const key = getBucketKey(event.ts, bucket, timeZone);
    const point =
      points.get(key) ??
      {
        key,
        label: getBucketLabel(event.ts, bucket, timeZone),
        tokens: 0,
        excludedTokens: 0,
        unestimatedTokens: 0,
        waterLitres: zeroRange()
      };

    point.tokens += event.totalTokens;
    addRange(point.waterLitres, event.waterLitres);
    if (event.classification === "excluded") {
      point.excludedTokens += event.totalTokens;
    }
    if (event.classification === "token_only") {
      point.unestimatedTokens += event.totalTokens;
    }

    points.set(key, point);
  }

  return [...points.values()].sort((a, b) => a.key.localeCompare(b.key));
}
