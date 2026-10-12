import { localToday } from '@/utils/timezone';
import type { ObservationStatus } from './types';

// Base helpers for the insights page: view and day-range URL params, the
// snapshot date, count validation and ranking. Traffic, version funnel and
// failure breakdown summaries live in traffic / funnel / breakdown.logic.ts.

export const INSIGHT_DAY_OPTIONS = [7, 14, 30] as const;
export type InsightDays = (typeof INSIGHT_DAY_OPTIONS)[number];
export const DEFAULT_INSIGHT_DAYS: InsightDays = 7;
export const INSIGHT_VIEWS = [
  'overview',
  'versions',
  'traffic',
  'audience',
  'failures',
] as const;
export type InsightView = (typeof INSIGHT_VIEWS)[number];

export const parseInsightDays = (value: string | null): InsightDays => {
  const parsed = Number(value);
  // Old links with days=35 land on today's largest option.
  if (parsed === 35) return 30;
  return INSIGHT_DAY_OPTIONS.includes(parsed as InsightDays)
    ? (parsed as InsightDays)
    : DEFAULT_INSIGHT_DAYS;
};

export const parseInsightView = (value: string | null): InsightView =>
  INSIGHT_VIEWS.includes(value as InsightView)
    ? (value as InsightView)
    : 'overview';

/** Prefer the server's snapshot date; legacy Cresc responses echo a timezone. */
export const insightToday = (
  now: number = Date.now(),
  timezone?: string,
): string => {
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date(now));
      const part = (type: string) =>
        parts.find((item) => item.type === type)?.value;
      return `${part('year')}-${part('month')}-${part('day')}`;
    } catch {
      // Unknown legacy zones fall back to the browser calendar, never UTC+8.
    }
  }
  return localToday(new Date(now));
};

export const validCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const countOf = (value: unknown): number =>
  validCount(value) ? value : 0;
export const percentOf = (part: number, total: number) =>
  total > 0 ? (part / total) * 100 : 0;

export const observationCount = (
  value: number | null | undefined,
  status?: ObservationStatus,
): number | null =>
  status === 'unavailable' || !validCount(value) ? null : value;

/** A legacy zero UUID count may mean missing/expired collection, not zero
 * devices. An explicit observed zero is valid and participates in the mean. */
export const deviceObservationCount = (
  value: number | null | undefined,
  status?: ObservationStatus,
): number | null =>
  status === undefined && value === 0 ? null : observationCount(value, status);

export interface RankedItem {
  key: string;
  count: number;
  percent: number;
}

export const rankCounts = (
  counts: Readonly<Record<string, number>> | undefined,
): RankedItem[] => {
  const entries = Object.entries(counts ?? {}).filter(
    ([, count]) => validCount(count) && count > 0,
  );
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  return entries
    .sort(([leftKey, leftCount], [rightKey, rightCount]) =>
      rightCount === leftCount
        ? leftKey.localeCompare(rightKey)
        : rightCount - leftCount,
    )
    .map(([key, count]) => ({ key, count, percent: percentOf(count, total) }));
};

export const addCounts = (
  target: Record<string, number>,
  source: Readonly<Record<string, number>> | undefined,
) => {
  for (const [key, count] of Object.entries(source ?? {})) {
    if (validCount(count) && count > 0) {
      target[key] = (target[key] ?? 0) + count;
    }
  }
};

// Legacy enum identifiers for shared key mappings; rollback reports ONLY.
export type FunnelHealth = 'healthy' | 'warning' | 'critical' | null;

export const shortHash = (hash: string) =>
  hash.length > 12 ? `${hash.slice(0, 12)}…` : hash;
