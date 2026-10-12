// Region breakdown: the server accumulates the completed update checks of
// each app per calendar day of the time zone the request names (the
// browser's); today's entry keeps growing live. This module only sums and
// ranks within a window; it never touches the time series. Top N truncation
// is left to BarList.

import type { AppGeoDay } from '@/services/api';

// Fetch the full 30 days once; switching the range only re-sums on the client.
export const GEO_FETCH_DAYS = 30;
export const GEO_TOP_LIMIT = 12;

// Literal the server writes when it cannot resolve a region
// (normalizeCountry); translated separately in the UI.
export const UNKNOWN_REGION = '未知';

export interface GeoRegionShare {
  region: string;
  count: number;
  percent: number;
}

export interface GeoSummary {
  total: number;
  unknown: number;
  /** Every region, most requests first; ties sorted by name. */
  regions: GeoRegionShare[];
}

/**
 * `days` arrives newest first; a window sums the first N of them. The unknown
 * region takes part in the total and the ranking (it is often the largest
 * bucket, and hiding it would skew every share) but is also reported alone.
 * labelOf maps a server label to its display name (see utils/region); summing
 * by display name is what folds a country's code form and the legacy Chinese
 * form into one row. The unknown label never goes through it.
 */
export const summarizeGeo = (
  days: readonly AppGeoDay[] | undefined,
  windowDays: number,
  labelOf: (region: string) => string = (region) => region,
): GeoSummary => {
  const totals = new Map<string, number>();
  for (const day of (days ?? []).slice(0, windowDays)) {
    for (const [rawRegion, count] of Object.entries(day.regions ?? {})) {
      if (!Number.isFinite(count) || count <= 0) continue;
      const trimmed = rawRegion.trim();
      const region =
        !trimmed || trimmed === UNKNOWN_REGION
          ? UNKNOWN_REGION
          : labelOf(trimmed) || UNKNOWN_REGION;
      totals.set(region, (totals.get(region) ?? 0) + count);
    }
  }
  const total = Array.from(totals.values()).reduce((sum, n) => sum + n, 0);
  const regions = Array.from(totals.entries())
    .sort(([leftRegion, leftCount], [rightRegion, rightCount]) =>
      rightCount === leftCount
        ? leftRegion.localeCompare(rightRegion)
        : rightCount - leftCount,
    )
    .map(([region, count]) => ({
      region,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    }));
  return {
    total,
    unknown: totals.get(UNKNOWN_REGION) ?? 0,
    regions,
  };
};
