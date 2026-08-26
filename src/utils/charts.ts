import type { Dayjs, ManipulateType } from 'dayjs';
import dayjs from 'dayjs';
import type { RefObject } from 'react';

/** Minimal point shape for a time-series line chart; every metrics page's points are a superset. */
export interface TimeSeriesPoint {
  time: string;
  value: number;
  category: string;
}

type ChartController = {
  emit: (...args: unknown[]) => unknown;
  on: (...args: unknown[]) => unknown;
};

export interface TimeSeriesLineOptions<P extends TimeSeriesPoint> {
  data: P[];
  isDark: boolean;
  height: number;
  /** x-axis title; hidden when omitted (the version health trend has none). */
  xTitle?: string;
  /** y-axis title; hidden when omitted. */
  yTitle?: string;
  /** Time format for x-axis ticks, default 'MM/DD HH:mm'; same-day panels use 'HH:mm'. */
  axisTimeFormat?: string;
  /** Value text of a tooltip item; G2's default rendering when omitted. */
  formatTooltipValue?: (point: P) => string;
  /** Merge simultaneously hit lines into one tooltip, on by default. */
  sharedTooltip?: boolean;
  /** Color domain order (drives the legend order); an empty array means unspecified. */
  colorDomain?: readonly string[];
  /**
   * Legend items selected by default. G2's legend:filter can only fire after
   * rendering, by which time the closure value is stale, so the latest value
   * is read from a ref; no default filtering when omitted.
   */
  legendValuesRef?: RefObject<string[]>;
}

const DEFAULT_AXIS_TIME_FORMAT = 'MM/DD HH:mm';
const TOOLTIP_TIME_FORMAT = 'MM/DD HH:mm';

/**
 * Time-series line config shared by the metrics pages: theme follows dark
 * mode, x-axis formatted as time, smooth curves, legend on top. Everything
 * that differs between pages is folded into the options.
 */
export function buildTimeSeriesLineConfig<P extends TimeSeriesPoint>({
  data,
  isDark,
  height,
  xTitle,
  yTitle,
  axisTimeFormat = DEFAULT_AXIS_TIME_FORMAT,
  formatTooltipValue,
  sharedTooltip = true,
  colorDomain,
  legendValuesRef,
}: TimeSeriesLineOptions<P>) {
  return {
    theme: isDark ? 'classicDark' : 'classic',
    interaction: {
      legendFilter: true,
      tooltip: { shared: sharedTooltip },
    },
    data,
    xField: (point: P) => new Date(point.time),
    yField: 'value',
    colorField: 'category',
    shapeField: 'smooth',
    axis: {
      x: {
        ...(xTitle === undefined ? {} : { title: xTitle }),
        labelAutoRotate: true,
        labelFormatter: (value: string) => {
          const parsed = dayjs(value);
          return parsed.isValid() ? parsed.format(axisTimeFormat) : value;
        },
      },
      y: yTitle === undefined ? {} : { title: yTitle },
    },
    tooltip: {
      title: (point: P) => dayjs(point.time).format(TOOLTIP_TIME_FORMAT),
      ...(formatTooltipValue
        ? {
            items: [
              (point: P) => ({
                name: point.category,
                value: formatTooltipValue(point),
              }),
            ],
          }
        : {}),
    },
    legend: {
      position: 'top',
    },
    scale: colorDomain?.length
      ? {
          color: { domain: [...colorDomain] },
        }
      : undefined,
    ...(legendValuesRef
      ? {
          onReady: ({ chart }: { chart: ChartController }) => {
            try {
              chart.on('afterrender', () => {
                const values = legendValuesRef.current;
                if (!values.length) return;
                chart.emit('legend:filter', {
                  data: { channel: 'color', values },
                });
              });
            } catch (error) {
              console.error(error);
            }
          },
        }
      : {}),
    height,
  };
}

export type RangePresetKey = '1h' | '6h' | '24h' | '3d' | '7d' | '30d';

// Order is the display order in the RangePicker: short windows first
const RANGE_PRESET_DURATIONS: ReadonlyArray<
  [RangePresetKey, number, ManipulateType]
> = [
  ['1h', 1, 'hour'],
  ['6h', 6, 'hour'],
  ['24h', 24, 'hour'],
  ['3d', 3, 'day'],
  ['7d', 7, 'day'],
  ['30d', 30, 'day'],
];

/**
 * "Last N hours/days" presets for a RangePicker. labelKeys lists only the
 * windows a page shows and their label keys (namespaces differ per page, see
 * constants/i18n-keys.ts); the order is fixed. Each call ends at "now", so
 * call it during render rather than caching the result.
 */
export function getRangePresets(
  t: (key: string) => string,
  labelKeys: Partial<Record<RangePresetKey, string>>,
  now: Dayjs = dayjs(),
): Array<{ label: string; value: [Dayjs, Dayjs] }> {
  const presets: Array<{ label: string; value: [Dayjs, Dayjs] }> = [];
  for (const [key, amount, unit] of RANGE_PRESET_DURATIONS) {
    const labelKey = labelKeys[key];
    if (!labelKey) continue;
    presets.push({
      label: t(labelKey),
      value: [now.subtract(amount, unit), now],
    });
  }
  return presets;
}
