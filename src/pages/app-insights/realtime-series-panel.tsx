import { useQuery } from '@tanstack/react-query';
import { Card, DatePicker, Radio, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AsyncLine } from '@/components/lazy-chart';
import { RANGE_PRESET_LABEL_KEY } from '@/constants/i18n-keys';
import { api } from '@/services/api';
import { buildTimeSeriesLineConfig, getRangePresets } from '@/utils/charts';
import { patchSearchParams } from '@/utils/helper';
import {
  aggregateSeries,
  attachSharePercent,
  buildLegendDefaults,
} from '@/utils/metrics';
import { metricsKeys } from '@/utils/query-keys';
import { useThemeMode } from '@/utils/theme-mode';
import { Question } from './shared';

// The 5-minute live series (/metrics/app), moved here unchanged from the old
// real-time metrics page: the native-package timestamp/hash warnings link in
// with attribute / range / focus and must still land on this chart.

const { RangePicker } = DatePicker;

interface ChartDataPoint {
  time: string;
  value: number;
  category: string;
  attribute?: MetricAttribute;
  isTotal?: boolean;
  sharePercent?: number;
}

type MetricAttribute = 'hash' | 'packageVersion_buildTime';

interface FormattedCategory {
  label: string;
  attribute?: MetricAttribute;
  isTotal: boolean;
}

const CATEGORY_SEPARATOR = '';

const isTotalPoint = (point: ChartDataPoint) => Boolean(point.isTotal);

const formatCategory = (
  rawCategory: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): FormattedCategory => {
  const totalLabel = t('realtime_metrics.update_checks');
  if (!rawCategory) {
    return { label: t('realtime_metrics.unknown'), isTotal: false };
  }
  if (rawCategory === '_total' || rawCategory === 'total') {
    return { label: totalLabel, isTotal: true };
  }
  const parts = rawCategory.split(CATEGORY_SEPARATOR);
  if (parts.length >= 2) {
    const key = parts[0];
    let value = parts.slice(1).join();
    if (!value || value === 'unknown') {
      value = t('realtime_metrics.none');
    }
    if (key === 'hash') {
      return {
        label: `${t('realtime_metrics.bundle_prefix')} ${value}`,
        attribute: 'hash',
        isTotal: false,
      };
    }
    if (key === 'packageVersion_buildTime') {
      return {
        label: `${t('realtime_metrics.package_prefix')} ${value}`,
        attribute: 'packageVersion_buildTime',
        isTotal: false,
      };
    }
    if (key === 'packageVersion_bundleHash') {
      // The content-fingerprint composite shares the "native package" panel
      // with the buildTime composite (new clients report the fingerprint
      // instead); truncate the 64-hex tail for legend readability.
      return {
        label: `${t('realtime_metrics.package_prefix')} ${value.replace(
          /([0-9a-f]{64})$/,
          (h) => `${h.slice(0, 8)}…`,
        )}`,
        attribute: 'packageVersion_buildTime',
        isTotal: false,
      };
    }
  }
  if (
    rawCategory.endsWith(CATEGORY_SEPARATOR) ||
    rawCategory.endsWith(`${CATEGORY_SEPARATOR}unknown`)
  ) {
    return {
      label: rawCategory.replace(
        CATEGORY_SEPARATOR,
        `: ${t('realtime_metrics.none')}`,
      ),
      isTotal: false,
    };
  }
  return {
    label: rawCategory.replace(CATEGORY_SEPARATOR, ': '),
    isTotal: false,
  };
};

const getAttributeOptions = (t: (key: string) => string) => [
  { label: t('realtime_metrics.bundle'), value: 'hash' as const },
  {
    label: t('realtime_metrics.package'),
    value: 'packageVersion_buildTime' as const,
  },
];

const formatTooltipItem = (
  point: ChartDataPoint,
  t: (key: string, opts?: Record<string, unknown>) => string,
) => {
  const count = point.value.toLocaleString();
  if (point.isTotal || point.sharePercent === undefined) {
    return t('realtime_metrics.tooltip_count', { count });
  }
  return t('realtime_metrics.tooltip_count_percent', {
    count,
    percent: point.sharePercent.toFixed(1),
  });
};

/** An entry link carrying range / focus should land on the view holding this panel. */
export const hasRealtimeSeriesEntryParams = (searchParams: URLSearchParams) =>
  searchParams.has('range') || searchParams.has('focus');

export const RealtimeSeriesPanel = ({
  appKey,
}: {
  appKey: string | undefined;
  isAdmin: boolean;
}) => {
  const { t } = useTranslation();
  const { isDark } = useThemeMode();
  const [searchParams, setSearchParams] = useSearchParams({
    attribute: 'hash',
  });
  // The entry link may pick the window (the native-package timestamp warning
  // is computed over 7 days, so arriving from it needs the same window to show
  // the matching data); defaults to the last 24 hours.
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => {
    const rangeHours: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 24 * 7,
    };
    const hours = rangeHours[searchParams.get('range') ?? ''] ?? 24;
    return [dayjs().subtract(hours, 'hour'), dayjs()];
  });
  const legendValuesRef = useRef<string[]>([]);
  const selectedAttribute: MetricAttribute =
    searchParams.get('attribute') === 'packageVersion_buildTime'
      ? 'packageVersion_buildTime'
      : 'hash';

  const attributeOptions = getAttributeOptions(t);
  const totalLabel = t('realtime_metrics.update_checks');

  const { data, isLoading } = useQuery({
    queryKey: metricsKeys.app(
      appKey,
      dateRange[0].toISOString(),
      dateRange[1].toISOString(),
    ),
    queryFn: () =>
      api.getAppMetrics({
        appKey: appKey!,
        start: dateRange[0].toISOString(),
        end: dateRange[1].toISOString(),
      }),
    enabled: !!appKey && !!dateRange[0] && !!dateRange[1],
  });

  const chartData = useMemo(() => {
    if (!data?.data || !data?.dict) return [];
    const points: ChartDataPoint[] = [];
    for (const bucket of data.data) {
      for (const [dictIndex, count] of bucket.data) {
        const rawCategory = data.dict[dictIndex] || '';
        const { label, attribute, isTotal } = formatCategory(rawCategory, t);
        points.push({
          time: bucket.time,
          value: count,
          category: label,
          attribute,
          isTotal,
        });
      }
    }
    return points;
  }, [data, t]);

  const filteredChartData = useMemo(
    () =>
      attachSharePercent(
        chartData.filter(
          (point) => point.isTotal || point.attribute === selectedAttribute,
        ),
        isTotalPoint,
      ),
    [chartData, selectedAttribute],
  );

  const {
    categoryTotals,
    sortedCategories,
    topCategories,
    hasTotal,
    total: totalRequests,
  } = useMemo(
    () => aggregateSeries(filteredChartData, { isTotal: isTotalPoint }),
    [filteredChartData],
  );

  const topCategoryMax = topCategories[0]?.[1] ?? 0;

  const dateRangeLabel = useMemo(() => {
    return `${dateRange[0].format('YYYY/MM/DD HH:mm')} - ${dateRange[1].format('YYYY/MM/DD HH:mm')}`;
  }, [dateRange]);

  const selectedAttributeLabel = useMemo(() => {
    return (
      attributeOptions.find((option) => option.value === selectedAttribute)
        ?.label || selectedAttribute
    );
  }, [selectedAttribute, attributeOptions]);

  // Categories flagged by the entry link (native-package timestamp/hash
  // warnings) are pinned into the default legend regardless of the Top 10
  // cutoff — they are usually low-volume and would otherwise be hidden.
  const focusLabels = useMemo(() => {
    const focusParam = searchParams.get('focus') ?? '';
    return focusParam
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map(
        (value) =>
          // hash-warning focus values carry the full 64-hex fingerprint;
          // apply the same truncation as the legend labels so they match
          `${t('realtime_metrics.package_prefix')} ${value.replace(
            /([0-9a-f]{64})$/,
            (h) => `${h.slice(0, 8)}…`,
          )}`,
      );
  }, [searchParams, t]);

  const { defaultLegendValues, colorDomain } = useMemo(
    () =>
      buildLegendDefaults(sortedCategories, {
        totalLabel: hasTotal ? totalLabel : undefined,
        pinned: focusLabels,
      }),
    [sortedCategories, focusLabels, hasTotal, totalLabel],
  );

  legendValuesRef.current = defaultLegendValues;

  const lineConfig = buildTimeSeriesLineConfig({
    data: filteredChartData,
    isDark,
    height: 420,
    xTitle: t('realtime_metrics.time'),
    formatTooltipValue: (point) => formatTooltipItem(point, t),
    colorDomain,
    legendValuesRef,
  });

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates?.[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  return (
    <Card
      size="small"
      title={t('realtime_metrics.request_overview')}
      extra={
        <div className="flex flex-wrap items-center gap-2">
          <Radio.Group
            size="small"
            value={selectedAttribute}
            onChange={(e) => {
              patchSearchParams(setSearchParams, {
                attribute: e.target.value as MetricAttribute,
              });
            }}
            optionType="button"
            buttonStyle="solid"
          >
            {attributeOptions.map((option) => (
              <Radio.Button key={option.value} value={option.value}>
                {option.label}
              </Radio.Button>
            ))}
          </Radio.Group>
          <RangePicker
            size="small"
            showTime
            value={dateRange}
            onChange={handleDateChange}
            presets={getRangePresets(
              t,
              RANGE_PRESET_LABEL_KEY.realtime_metrics,
            )}
          />
        </div>
      }
    >
      <Question>{t('app_insights.series_question')}</Question>
      <Spin spinning={isLoading}>
        {!appKey ? (
          <div className="h-20 flex items-center justify-center text-gray-400">
            {t('realtime_metrics.please_select_app')}
          </div>
        ) : (
          <div className="mb-4 grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
              <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-500">
                  {t('realtime_metrics.total_requests')}
                </div>
                <div className="mt-1 text-2xl font-semibold leading-none tabular-nums">
                  {isLoading ? '-' : totalRequests.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {dateRangeLabel}
                </div>
              </div>
              <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-500">
                  {t('realtime_metrics.category_count')}
                </div>
                <div className="mt-1 text-2xl font-semibold leading-none tabular-nums">
                  {categoryTotals.size}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {t('realtime_metrics.current_dimension_label', {
                    dimension: selectedAttributeLabel,
                  })}
                </div>
              </div>
            </div>

            {topCategories.length > 0 ? (
              <div>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  }}
                >
                  {topCategories.map(([category, value], index) => {
                    const relativePercent =
                      topCategoryMax > 0 ? (value / topCategoryMax) * 100 : 0;
                    const barWidth =
                      value > 0 ? Math.max(relativePercent, 6) : 0;
                    const rankBadgeClass =
                      index === 0
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : index === 1
                          ? 'border-slate-200 bg-slate-50 text-slate-700'
                          : index === 2
                            ? 'border-orange-200 bg-orange-50 text-orange-700'
                            : 'border-gray-200 bg-gray-50 text-gray-600';

                    return (
                      <div
                        key={category}
                        className="min-w-0 rounded border border-gray-200 bg-container px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${rankBadgeClass}`}
                          >
                            TOP {index + 1}
                          </span>
                        </div>

                        <div className="mt-2 text-xl font-semibold leading-none tabular-nums text-gray-900">
                          {value.toLocaleString()}
                        </div>

                        <div className="mt-2 h-1.5 overflow-hidden rounded bg-gray-100">
                          <div
                            className="h-full rounded bg-primary"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>

                        <div
                          className="mt-2 truncate text-xs text-gray-500"
                          title={category}
                        >
                          {category}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center text-gray-400">
                {t('realtime_metrics.no_top_data')}
              </div>
            )}
          </div>
        )}
        {appKey &&
          (filteredChartData.length > 0 ? (
            <AsyncLine {...lineConfig} />
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400">
              {t('realtime_metrics.no_data')}
            </div>
          ))}
      </Spin>
      <div className="mt-3 text-xs text-gray-400">
        {t('app_insights.series_footnote')}
      </div>
    </Card>
  );
};
