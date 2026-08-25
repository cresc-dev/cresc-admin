import type { Area, DualAxes, Line, Pie } from '@ant-design/plots';
import {
  type ComponentProps,
  type ComponentType,
  lazy,
  Suspense,
  useCallback,
  useState,
} from 'react';
import { SectionErrorBoundary } from './section-error-boundary';
import { ChartSkeleton } from './skeletons';

type ChartComponentType = 'Area' | 'Line' | 'Pie' | 'DualAxes';

// Import from @ant-design/plots only, and pick each chart's export with a
// static property name: @ant-design/charts is just a shell that does
// `export * from graphs/plots`, and a dynamic `module[type]` makes the bundler
// give up on tree-shaking and drag the whole G6 graph library (~780KB) along.
const chartLoaders: Record<
  ChartComponentType,
  () => Promise<{ default: ComponentType<any> }>
> = {
  Area: () =>
    import('@ant-design/plots').then((m) => ({
      default: m.Area as ComponentType<any>,
    })),
  Line: () =>
    import('@ant-design/plots').then((m) => ({
      default: m.Line as ComponentType<any>,
    })),
  Pie: () =>
    import('@ant-design/plots').then((m) => ({
      default: m.Pie as ComponentType<any>,
    })),
  DualAxes: () =>
    import('@ant-design/plots').then((m) => ({
      default: m.DualAxes as ComponentType<any>,
    })),
};

function createLazyChart(type: ChartComponentType) {
  return lazy(chartLoaders[type]);
}

interface AsyncChartProps<T extends ChartComponentType> {
  chartType: T;
  errorTitle: string;
  height?: number;
  chartProps: Record<string, any>;
}

function AsyncChartWrapper<T extends ChartComponentType>({
  chartType,
  errorTitle,
  height,
  chartProps,
}: AsyncChartProps<T>) {
  const [retryCount, setRetryCount] = useState(0);
  const [LazyComponent, setLazyComponent] = useState(() =>
    createLazyChart(chartType),
  );

  const handleReset = useCallback(() => {
    setLazyComponent(() => createLazyChart(chartType));
    setRetryCount((c) => c + 1);
  }, [chartType]);

  return (
    <SectionErrorBoundary title={errorTitle} onReset={handleReset}>
      <Suspense
        key={retryCount}
        fallback={<ChartSkeleton height={height || 300} />}
      >
        <LazyComponent {...chartProps} />
      </Suspense>
    </SectionErrorBoundary>
  );
}

export function AsyncArea({
  height,
  ...props
}: ComponentProps<typeof Area> & { height?: number }) {
  return (
    <AsyncChartWrapper
      chartType="Area"
      errorTitle="图表渲染异常"
      height={height}
      chartProps={{ ...props, height }}
    />
  );
}

export function AsyncLine({
  height,
  ...props
}: ComponentProps<typeof Line> & { height?: number }) {
  return (
    <AsyncChartWrapper
      chartType="Line"
      errorTitle="折线图渲染异常"
      height={height}
      chartProps={{ ...props, height }}
    />
  );
}

export function AsyncPie({
  height,
  ...props
}: ComponentProps<typeof Pie> & { height?: number }) {
  return (
    <AsyncChartWrapper
      chartType="Pie"
      errorTitle="饼图渲染异常"
      height={height}
      chartProps={{ ...props, height }}
    />
  );
}

export function AsyncDualAxes({
  height,
  ...props
}: ComponentProps<typeof DualAxes> & { height?: number }) {
  return (
    <AsyncChartWrapper
      chartType="DualAxes"
      errorTitle="双轴图表渲染异常"
      height={height}
      chartProps={{ ...props, height }}
    />
  );
}
