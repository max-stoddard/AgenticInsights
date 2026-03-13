import type { Bucket } from "@agentic-insights/shared";

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
}

interface ZonedDateTimeParts extends ZonedDateParts {
  hour: number;
  minute: number;
  second: number;
}

const datePartsFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateTimePartsFormatterCache = new Map<string, Intl.DateTimeFormat>();
const labelFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDatePartsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = datePartsFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  datePartsFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getDateTimePartsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = dateTimePartsFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  dateTimePartsFormatterCache.set(timeZone, formatter);
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
  const parts = getDatePartsFormatter(timeZone).formatToParts(new Date(ts));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

function getZonedDateTimeParts(ts: number, timeZone: string): ZonedDateTimeParts {
  const parts = getDateTimePartsFormatter(timeZone).formatToParts(new Date(ts));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
    hour: Number(parts.find((part) => part.type === "hour")?.value),
    minute: Number(parts.find((part) => part.type === "minute")?.value),
    second: Number(parts.find((part) => part.type === "second")?.value)
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toPseudoUtcDate(parts: ZonedDateParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function fromPseudoUtcDate(date: Date): ZonedDateParts {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function startOfIsoWeek(parts: ZonedDateParts): Date {
  const date = toPseudoUtcDate(parts);
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
  const jan4WeekStart = startOfIsoWeek(fromPseudoUtcDate(jan4));
  const diffDays = Math.round((weekStart.getTime() - jan4WeekStart.getTime()) / 86_400_000);
  return {
    isoYear,
    isoWeek: Math.floor(diffDays / 7) + 1,
    start: weekStart
  };
}

function addDays(parts: ZonedDateParts, amount: number): ZonedDateParts {
  const date = toPseudoUtcDate(parts);
  date.setUTCDate(date.getUTCDate() + amount);
  return fromPseudoUtcDate(date);
}

function addMonths(parts: ZonedDateParts, amount: number): ZonedDateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1 + amount, 1));
  return fromPseudoUtcDate(date);
}

function getOffsetMs(ts: number, timeZone: string): number {
  const parts = getZonedDateTimeParts(ts, timeZone);
  const asUtcTs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtcTs - ts;
}

function zonedDateTimeToUtcTs(parts: ZonedDateTimeParts, timeZone: string): number {
  const guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let candidate = guess - getOffsetMs(guess, timeZone);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const offset = getOffsetMs(candidate, timeZone);
    const nextCandidate = guess - offset;
    if (nextCandidate === candidate) {
      break;
    }
    candidate = nextCandidate;
  }

  return candidate;
}

function zonedDateToUtcTs(parts: ZonedDateParts, timeZone: string): number {
  return zonedDateTimeToUtcTs({ ...parts, hour: 0, minute: 0, second: 0 }, timeZone);
}

function getBucketStartParts(parts: ZonedDateParts, bucket: Bucket): ZonedDateParts {
  if (bucket === "day") {
    return parts;
  }

  if (bucket === "month") {
    return {
      year: parts.year,
      month: parts.month,
      day: 1
    };
  }

  const isoWeek = getIsoWeek(parts);
  return fromPseudoUtcDate(isoWeek.start);
}

export function getBucketStartTs(ts: number, bucket: Bucket, timeZone: string): number {
  return zonedDateToUtcTs(getBucketStartParts(getZonedDateParts(ts, timeZone), bucket), timeZone);
}

export function getNextBucketStartTs(startTs: number, bucket: Bucket, timeZone: string): number {
  const parts = getZonedDateParts(startTs, timeZone);
  const nextParts =
    bucket === "month" ? addMonths(parts, 1) : addDays(parts, bucket === "week" ? 7 : 1);
  return zonedDateToUtcTs(nextParts, timeZone);
}

export function shiftZonedDateTimeByDays(ts: number, amount: number, timeZone: string): number {
  const parts = getZonedDateTimeParts(ts, timeZone);
  const shiftedDateParts = addDays(parts, amount);
  return zonedDateTimeToUtcTs(
    {
      ...shiftedDateParts,
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second
    },
    timeZone
  );
}

export function getBucketKey(ts: number, bucket: Bucket, timeZone: string): string {
  return getBucketKeyFromStart(getBucketStartTs(ts, bucket, timeZone), bucket, timeZone);
}

export function getBucketKeyFromStart(startTs: number, bucket: Bucket, timeZone: string): string {
  const parts = getZonedDateParts(startTs, timeZone);
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
  return getBucketLabelFromStart(getBucketStartTs(ts, bucket, timeZone), bucket, timeZone);
}

export function getBucketLabelFromStart(startTs: number, bucket: Bucket, timeZone: string): string {
  if (bucket === "day") {
    return getLabelFormatter(timeZone, {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date(startTs));
  }

  if (bucket === "month") {
    return getLabelFormatter(timeZone, {
      month: "short",
      year: "numeric"
    }).format(new Date(startTs));
  }

  return `Week of ${getLabelFormatter(timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(startTs))}`;
}
