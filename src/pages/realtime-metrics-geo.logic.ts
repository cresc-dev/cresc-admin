// Region breakdown for the realtime page: the server accumulates the
// completed update checks of each app per calendar day (UTC+8) under
// app_geo:<day>:<appKey>; today's entry keeps growing live. This module
// only sums and ranks within a window; it never touches the time series.

export interface AppGeoDay {
  date: string;
  requests: number;
  regions: Record<string, number>;
}

export interface AppGeoResponse {
  days: AppGeoDay[];
  retentionDays: number;
  regionResolver: boolean;
}

export type GeoWindow = 'today' | '7d' | '30d';

export const GEO_WINDOWS: GeoWindow[] = ['today', '7d', '30d'];

export const GEO_WINDOW_DAYS: Record<GeoWindow, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
};

// Fetch the full 30 days once; switching windows only re-sums on the client.
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
  regionCount: number;
  top: GeoRegionShare[];
  // Everything past the Top N folded together; null when nothing is left.
  rest: { regions: number; count: number; percent: number } | null;
}

export const parseGeoWindow = (value: string | null): GeoWindow =>
  GEO_WINDOWS.includes(value as GeoWindow) ? (value as GeoWindow) : 'today';

/**
 * `days` arrives newest first; a window sums the first N of them. The unknown
 * region takes part in the total and the ranking (it is often the largest
 * bucket, and hiding it would skew every share) but is also reported alone.
 */
export const summarizeGeo = (
  days: readonly AppGeoDay[] | undefined,
  window: GeoWindow,
  limit = GEO_TOP_LIMIT,
): GeoSummary => {
  const totals = new Map<string, number>();
  for (const day of (days ?? []).slice(0, GEO_WINDOW_DAYS[window])) {
    for (const [rawRegion, count] of Object.entries(day.regions ?? {})) {
      if (!Number.isFinite(count) || count <= 0) continue;
      const region = rawRegion.trim() || UNKNOWN_REGION;
      totals.set(region, (totals.get(region) ?? 0) + count);
    }
  }
  const total = Array.from(totals.values()).reduce((sum, n) => sum + n, 0);
  const ranked = Array.from(totals.entries())
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
  const top = ranked.slice(0, limit);
  const tail = ranked.slice(limit);
  const restCount = tail.reduce((sum, item) => sum + item.count, 0);
  return {
    total,
    unknown: totals.get(UNKNOWN_REGION) ?? 0,
    regionCount: ranked.length,
    top,
    rest:
      tail.length > 0
        ? {
            regions: tail.length,
            count: restCount,
            percent: total > 0 ? (restCount / total) * 100 : 0,
          }
        : null,
  };
};
