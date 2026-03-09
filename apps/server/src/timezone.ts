import type { Bucket } from "@agentic-insights/shared";

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();
const labelFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = partsFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  partsFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getLabelFormatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}:${JSON.stringify(options)}`;
  const cached = labelFormatterCache.get(key);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone, ...options });
  labelFormatterCache.set(key, formatter);
  return formatter;
}

export function getZonedDateParts(ts: number, timeZone: string): ZonedDateParts {
  const parts = getPartsFormatter(timeZone).formatToParts(new Date(ts));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toUtcDate(parts: ZonedDateParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function fromUtcDate(date: Date): ZonedDateParts {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function startOfIsoWeek(parts: ZonedDateParts): Date {
  const date = toUtcDate(parts);
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday);
  return date;
}

function getIsoWeek(parts: ZonedDateParts): { isoYear: number; isoWeek: number; start: Date } {
  const weekStart = startOfIsoWeek(parts);
  const thursday = new Date(weekStart);
  thursday.setUTCDate(weekStart.getUTCDate() + 3);

  const isoYear = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4WeekStart = startOfIsoWeek(fromUtcDate(jan4));
  const diffDays = Math.round((weekStart.getTime() - jan4WeekStart.getTime()) / 86_400_000);
  return {
    isoYear,
    isoWeek: Math.floor(diffDays / 7) + 1,
    start: weekStart
  };
}

export function getBucketKey(ts: number, bucket: Bucket, timeZone: string): string {
  const parts = getZonedDateParts(ts, timeZone);
  if (bucket === "day") {
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  }

  if (bucket === "month") {
    return `${parts.year}-${pad(parts.month)}`;
  }

  const isoWeek = getIsoWeek(parts);
  return `${isoWeek.isoYear}-W${pad(isoWeek.isoWeek)}`;
}

export function getBucketLabel(ts: number, bucket: Bucket, timeZone: string): string {
  const parts = getZonedDateParts(ts, timeZone);

  if (bucket === "day") {
    return getLabelFormatter(timeZone, {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date(ts));
  }

  if (bucket === "month") {
    return getLabelFormatter(timeZone, {
      month: "short",
      year: "numeric"
    }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1)));
  }

  const weekStart = getIsoWeek(parts).start;
  return `Week of ${getLabelFormatter(timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(weekStart)}`;
}
