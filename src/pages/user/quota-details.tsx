import { Progress, Tag, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

export type QuotaUsageRow = {
  key: string;
  label: string;
  limit: number;
  loading?: boolean;
  note: string;
  percent: number;
  status: 'exception' | 'normal';
  value: string;
};

export function QuotaDetailsPanel({
  dailyQuota,
  last7dAvg,
  last7dCounts,
  remainingChecks,
  rows,
  sizeLimits,
}: {
  dailyQuota: number;
  last7dAvg?: number;
  last7dCounts?: number[];
  remainingChecks?: number;
  rows: QuotaUsageRow[];
  sizeLimits: Array<{ label: string; value: string }>;
}) {
  const { t } = useTranslation();
  const remainingPercent =
    typeof remainingChecks === 'number'
      ? Math.max(0, Math.min(100, (remainingChecks / dailyQuota) * 100))
      : 0;
  const status =
    remainingChecks !== undefined && remainingChecks <= 0
      ? 'exception'
      : 'normal';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-container">
      <div className="grid items-stretch gap-4 border-slate-100 border-b bg-gradient-to-br from-slate-50 to-container p-4 lg:grid-cols-2">
        <div className="flex min-h-[150px] flex-col">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-medium text-slate-900">
                {t('user.daily_checks')}
              </div>
              <div className="mt-0.5 text-slate-500 text-xs">
                {t('user.daily_checks_desc')}
              </div>
            </div>
            {status === 'exception' && (
              <Tag color="red">{t('user.over_limit')}</Tag>
            )}
          </div>
          <div className="mt-4">
            <div>
              <div className="text-[11px] text-gray-500">
                {t('user.remaining_today')}
              </div>
              <div className="mt-1 font-semibold text-2xl leading-none tabular-nums">
                {remainingChecks === undefined
                  ? dailyQuota.toLocaleString()
                  : Math.max(0, remainingChecks).toLocaleString()}
              </div>
              <div className="mt-1 text-gray-500 text-xs">
                Limit {dailyQuota.toLocaleString()} / day
              </div>
            </div>
          </div>
          <div className="mt-5">
            <Progress
              className="mb-0"
              percent={remainingPercent}
              showInfo={false}
              size="small"
              status={status}
            />
          </div>
        </div>
        <MiniQuotaBars
          dailyQuota={dailyQuota}
          title={`7-day average remaining ${formatOptionalNumber(last7dAvg)} (${formatQuotaDateRangeLabel()})`}
          tooltipSuffix="checks"
          values={last7dCounts}
        />
      </div>

      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div
            className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(140px,0.9fr)_minmax(180px,1fr)_minmax(180px,1.2fr)] md:items-center"
            key={row.key}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{row.label}</span>
                {row.status === 'exception' && (
                  <Tag color="red">{t('user.over_limit')}</Tag>
                )}
              </div>
              <div className="mt-0.5 text-slate-500 text-xs">{row.note}</div>
            </div>
            <div className="font-semibold tabular-nums">{row.value}</div>
            <Progress
              percent={row.percent}
              showInfo={false}
              size="small"
              status={row.status}
            />
          </div>
        ))}
      </div>

      <div className="border-slate-100 border-t bg-slate-50/70 px-4 py-3">
        <div className="mb-2 font-medium text-slate-700 text-xs">
          {t('user.limits')}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {sizeLimits.map((item) => (
            <div key={item.label}>
              <div className="text-[11px] text-slate-500">{item.label}</div>
              <div className="mt-0.5 font-medium">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniQuotaBars({
  dailyQuota,
  title,
  tooltipSuffix,
  values,
}: {
  dailyQuota: number;
  title: string;
  tooltipSuffix: string;
  values?: number[];
}) {
  const { t } = useTranslation();
  const bars = (values ?? [])
    .slice(0, 7)
    .reverse()
    .map((value, index, array) => {
      const daysAgo = array.length - index - 1;
      return {
        daysAgo,
        dateLabel: formatQuotaDateLabel(daysAgo),
        value,
      };
    });

  return (
    <div className="flex h-full min-h-[150px] flex-col rounded-lg border border-slate-200/70 bg-container/70 p-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
        <span>{title}</span>
      </div>
      {bars.length > 0 ? (
        <div className="mt-2 flex flex-1 items-end gap-1.5">
          {bars.map((bar) => {
            const percent =
              dailyQuota > 0
                ? Math.max(
                    bar.value > 0 ? 4 : 0,
                    Math.min(100, (Math.max(0, bar.value) / dailyQuota) * 100),
                  )
                : 0;
            return (
              <div
                className="flex h-full min-w-0 flex-1 flex-col items-center"
                key={`${bar.daysAgo}-days-ago`}
              >
                <div className="flex min-h-0 w-full flex-1 items-end rounded bg-slate-100">
                  <Tooltip
                    title={`${bar.dateLabel}: ${bar.value.toLocaleString()} ${tooltipSuffix}`}
                  >
                    <div
                      className="w-full rounded bg-blue-500 transition-colors hover:bg-blue-600"
                      style={{ height: `${percent}%` }}
                    />
                  </Tooltip>
                </div>
                <span className="mt-1 text-[10px] text-gray-400 tabular-nums">
                  {bar.dateLabel}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 flex flex-1 items-center justify-center rounded bg-container text-gray-400 text-xs">
          {t('user.no_7day_details')}
        </div>
      )}
    </div>
  );
}

function formatOptionalNumber(value?: number) {
  return typeof value === 'number' ? Math.max(0, value).toLocaleString() : '-';
}

function formatQuotaDateLabel(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatShortQuotaDate(date);
}

function formatQuotaDateRangeLabel() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return `${formatShortQuotaDate(start)} - ${formatShortQuotaDate(end)}`;
}

function formatShortQuotaDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
