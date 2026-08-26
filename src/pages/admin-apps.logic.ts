import { parseOptionalPositiveInt } from '@/utils/table-state';

/** Pure logic for the admin apps page: table URL config and filter normalization */

// checkCount is aggregated from Redis after the fact and is not a SQL column, so it cannot be sorted.
export const SORTABLE_COLUMNS = new Set([
  'id',
  'name',
  'appKey',
  'platform',
  'userId',
  'status',
  'createdAt',
]);

export const PLATFORM_VALUES = ['ios', 'android', 'harmony'];
export const STATUS_VALUES = ['normal', 'paused'];

// Header filter columns; values are mirrored into same-named URL params
export const FILTER_KEYS = ['platform', 'status', 'userId'] as const;

// The user id is typed by hand; normalize it before writing it back to the
// URL so "0"/"abc" cannot leave behind a filter that never applies.
export const normalizeFilter = (key: string, value: string | undefined) => {
  if (key !== 'userId') {
    return value;
  }
  const userId = parseOptionalPositiveInt(value ?? null);
  return userId ? String(userId) : undefined;
};

// Enum values in the URL may be hand-edited; anything outside the whitelist counts as no filter
const pickAllowed = (value: string | null, allowed: readonly string[]) => {
  const param = value ?? undefined;
  return param && allowed.includes(param) ? param : undefined;
};

export const parsePlatformFilter = (value: string | null) =>
  pickAllowed(value, PLATFORM_VALUES);

export const parseStatusFilter = (value: string | null) =>
  pickAllowed(value, STATUS_VALUES);
