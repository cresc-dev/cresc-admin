import dayjs, { type ConfigType } from 'dayjs';

// Display formatters live here. Missing values (null / undefined / NaN /
// Infinity) render as `missing` (default '-') rather than 0: not observed is
// different from observed as zero.

const MISSING = '-';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Grouped count; keeps decimals as-is. */
export function formatCount(
  value: number | null | undefined,
  missing = MISSING,
) {
  return isFiniteNumber(value) ? value.toLocaleString() : missing;
}

/** Rounds to an integer before grouping, for averages and similar counts. */
export function formatInteger(
  value: number | null | undefined,
  missing = MISSING,
) {
  return isFiniteNumber(value) ? Math.round(value).toLocaleString() : missing;
}

/** Ratio (0..1) to percentage. */
export function formatPercent(
  ratio: number | null | undefined,
  digits = 1,
  missing = MISSING,
) {
  return isFiniteNumber(ratio) ? `${(ratio * 100).toFixed(digits)}%` : missing;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** 1024-based, scales from B to PB; larger values keep fewer decimals. */
export function formatBytes(
  value: number | null | undefined,
  missing = MISSING,
) {
  if (!isFiniteNumber(value) || value < 0) {
    return missing;
  }
  let scaled = value;
  let unit = 0;
  while (scaled >= 1024 && unit < BYTE_UNITS.length - 1) {
    scaled /= 1024;
    unit += 1;
  }
  if (unit === 0) {
    return `${scaled} B`;
  }
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${scaled.toFixed(digits)} ${BYTE_UNITS[unit]}`;
}

export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';
export const DATE_TIME_SECONDS_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/** Date and time; empty or unparsable values render as `missing`. */
export function formatDateTime(
  value: ConfigType | null | undefined,
  { seconds = false, missing = MISSING } = {},
) {
  if (value == null || value === '') {
    return missing;
  }
  const date = dayjs(value);
  if (!date.isValid()) {
    return missing;
  }
  return date.format(seconds ? DATE_TIME_SECONDS_FORMAT : DATE_TIME_FORMAT);
}
