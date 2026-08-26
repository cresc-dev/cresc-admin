import dayjs from 'dayjs';

/** Categorized metrics point: counts split by category within one time bucket. */
export interface CategoryPoint {
  time: string;
  value: number;
  category: string;
  sharePercent?: number;
}

const DEFAULT_TOP_N = 10;

const neverTotal = () => false;

/** Sum the category counts per time bucket. */
export function sumByTime<P extends CategoryPoint>(
  points: readonly P[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const point of points) {
    totals.set(point.time, (totals.get(point.time) || 0) + point.value);
  }
  return totals;
}

/**
 * Attach each non-total point's share within its time bucket. The denominator
 * prefers the server-provided total point (the deduplicated real request
 * count) and falls back to the sum of the bucket's categories; points with a
 * zero denominator are left untouched (no sharePercent). Total points are
 * returned as-is.
 */
export function attachSharePercent<P extends CategoryPoint>(
  points: readonly P[],
  isTotal: (point: P) => boolean = neverTotal,
): P[] {
  const timeTotals = new Map<
    string,
    { total: number; fallback: number; hasTotal: boolean }
  >();

  for (const point of points) {
    let entry = timeTotals.get(point.time);
    if (!entry) {
      entry = { total: 0, fallback: 0, hasTotal: false };
      timeTotals.set(point.time, entry);
    }
    if (isTotal(point)) {
      entry.total += point.value;
      entry.hasTotal = true;
    } else {
      entry.fallback += point.value;
    }
  }

  return points.map((point) => {
    if (isTotal(point)) {
      return point;
    }
    const entry = timeTotals.get(point.time);
    const denominator = entry
      ? entry.hasTotal
        ? entry.total
        : entry.fallback
      : 0;
    if (denominator <= 0) {
      return point;
    }
    return {
      ...point,
      sharePercent: (point.value / denominator) * 100,
    };
  });
}

/** Sum the categories per time bucket into one total series, ascending by time. */
export function buildTotalSeries<P extends CategoryPoint>(
  points: readonly P[],
  label: string,
): CategoryPoint[] {
  if (!points.length) return [];
  return Array.from(sumByTime(points).entries())
    .map(([time, value]) => ({ time, value, category: label }))
    .sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf());
}

export interface SeriesAggregate {
  /** Cumulative value per category (excluding total points) over the whole window. */
  categoryTotals: Map<string, number>;
  /** Categories sorted by cumulative value, descending. */
  sortedCategories: string[];
  /** The top N categories with their cumulative values. */
  topCategories: Array<readonly [string, number]>;
  /** Whether the data carries server-provided total points. */
  hasTotal: boolean;
  /** Total requests in the window: the sum of total points when present, else the sum of categories. */
  total: number;
}

/** Window-level aggregate of a categorized series: ranking, top N, total. */
export function aggregateSeries<P extends CategoryPoint>(
  points: readonly P[],
  {
    isTotal = neverTotal,
    topN = DEFAULT_TOP_N,
  }: { isTotal?: (point: P) => boolean; topN?: number } = {},
): SeriesAggregate {
  const categoryTotals = new Map<string, number>();
  let hasTotal = false;
  let totalSum = 0;
  let nonTotalSum = 0;
  for (const point of points) {
    if (isTotal(point)) {
      hasTotal = true;
      totalSum += point.value;
      continue;
    }
    nonTotalSum += point.value;
    categoryTotals.set(
      point.category,
      (categoryTotals.get(point.category) || 0) + point.value,
    );
  }

  const sortedCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);
  const topCategories = sortedCategories
    .slice(0, topN)
    .map((category) => [category, categoryTotals.get(category) || 0] as const);

  return {
    categoryTotals,
    sortedCategories,
    topCategories,
    hasTotal,
    total: hasTotal ? totalSum : nonTotalSum,
  };
}

/**
 * Default legend selection and color domain for a line chart. Only the top N
 * categories are selected by default (dozens of lines would blur together);
 * pinned categories are selected even outside the top N, since the line an
 * entry link points at is usually low-volume. The color domain follows the
 * ranking, with the total (if any) always first.
 */
export function buildLegendDefaults(
  sortedCategories: readonly string[],
  {
    totalLabel,
    pinned = [],
    topN = DEFAULT_TOP_N,
  }: { totalLabel?: string; pinned?: readonly string[]; topN?: number } = {},
): { defaultLegendValues: string[]; colorDomain: string[] } {
  const topCategories = sortedCategories.slice(0, topN);
  const extras = pinned.filter(
    (label) =>
      sortedCategories.includes(label) && !topCategories.includes(label),
  );
  const selection = [...topCategories, ...extras];
  return {
    defaultLegendValues: totalLabel ? [totalLabel, ...selection] : selection,
    colorDomain: totalLabel
      ? [totalLabel, ...sortedCategories]
      : [...sortedCategories],
  };
}
