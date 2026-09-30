import { Alert, Card, Select, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  observationBytes,
  observationNumber,
  observationPercent,
} from './release-insights-format';
import type {
  ArtifactInsight,
  ReleaseVersionInsight,
  RolloutInsight,
} from './release-insights-types';
import { HeaderHint, useAppVersionFunnel } from './shared';

export type ReleaseSection = 'rollout' | 'hermes';

export const ReleaseInsightsPanel = ({
  appKey,
  days,
  isAdmin = false,
  section,
}: {
  appKey: string;
  days: number;
  /**
   * Only administrators see the HermesBase compilation and artifact size
   * section. It is a diagnostic view of our own build pipeline: customers
   * cannot act on it, and a dropped base means the CLI fell back to a plain
   * compile while the release itself is fine.
   */
  isAdmin?: boolean;
  /** Render only one card; omit to render all of them in order. */
  section?: ReleaseSection;
}) => {
  const { t } = useTranslation();
  const text = {
    title: t('app_insights.release.title'),
    gray: t('app_insights.release.gray'),
    grayQuestion: t('app_insights.release.gray_question'),
    missing: t('app_insights.release.missing'),
    unavailable: t('app_insights.release.unavailable'),
    upgrade: t('app_insights.release.upgrade'),
    inference: t('app_insights.release.inference'),
    partial: t('app_insights.release.partial'),
    expired: t('app_insights.release.expired'),
    noGray: t('app_insights.release.no_gray'),
    day: t('app_insights.release.day'),
    rule: t('app_insights.release.rule'),
    exposed: t('app_insights.release.exposed'),
    hit: t('app_insights.release.hit'),
    miss: t('app_insights.release.miss'),
    unknown: t('app_insights.release.unknown'),
    unknownHint: t('app_insights.release.unknown_hint'),
    rate: t('app_insights.release.rate'),
    status: t('app_insights.release.status'),
    hermes: t('app_insights.release.hermes'),
    version: t('app_insights.release.version'),
    outcome: t('app_insights.release.outcome'),
    base: t('app_insights.release.base'),
    detail: t('app_insights.release.detail'),
    artifacts: t('app_insights.release.artifacts'),
    empty: t('app_insights.release.empty'),
    from: t('app_insights.release.from'),
    format: t('app_insights.release.format'),
    patch: t('app_insights.release.patch'),
    full: t('app_insights.release.full'),
    reduction: t('app_insights.release.reduction'),
    observedAt: t('app_insights.release.observed_at'),
    distinction: t('app_insights.release.distinction'),
    used: t('app_insights.release.used'),
    rejected: t('app_insights.release.rejected'),
    dumpFailed: t('app_insights.release.dump_failed'),
    none: t('app_insights.release.none'),
    unreported: t('app_insights.release.unreported'),
    observed: t('app_insights.release.observed'),
    limited: t('app_insights.release.limited'),
    unknownStatus: t('app_insights.release.unknown_status'),
  };
  const query = useAppVersionFunnel(appKey, days);
  const dateSelectID = useId();
  const [selectedDate, setSelectedDate] = useState<string>();
  const insights = query.data?.releaseInsights;
  const day =
    insights?.days.find((item) => item.date === selectedDate) ??
    insights?.days[0];
  const number = (value: number | null | undefined) =>
    observationNumber(value, text.missing);
  const status = (value: string) => (
    <Tag>
      {value === 'observed'
        ? text.observed
        : value === 'partial'
          ? text.limited
          : text.unknownStatus}
    </Tag>
  );
  const name = (hash: string) =>
    insights?.versions.find((item) => item.hash === hash)?.name || hash;
  const rolloutColumns: ColumnsType<RolloutInsight> = [
    {
      title: text.rule,
      key: 'rule',
      render: (_, row) => (
        <div>
          <div>
            {row.packageVersion} → {name(row.targetHash)}
          </div>
        </div>
      ),
    },
    { title: text.exposed, dataIndex: 'exposedDevices', render: number },
    { title: text.hit, dataIndex: 'hitDevices', render: number },
    { title: text.miss, dataIndex: 'missDevices', render: number },
    {
      title: <HeaderHint label={text.unknown} hint={text.unknownHint} />,
      dataIndex: 'unknownDevices',
      render: number,
    },
    {
      title: text.rate,
      key: 'rate',
      render: (_, row) => (
        <span className="whitespace-nowrap tabular-nums">
          {row.rollout == null ? text.missing : `${row.rollout}%`}
          <span className="mx-1 text-gray-400">/</span>
          {observationPercent(row.hitRate, text.missing)}
        </span>
      ),
    },
    { title: text.status, dataIndex: 'status', render: status },
  ];
  const artifactColumns: ColumnsType<ArtifactInsight> = [
    {
      title: text.from,
      dataIndex: 'fromHash',
      render: (value: string) => <code>{value}</code>,
    },
    {
      title: text.format,
      key: 'format',
      render: (_, row) => `${row.format} / ${row.state}`,
    },
    {
      title: text.patch,
      dataIndex: 'artifactBytes',
      render: (value: number | null) => observationBytes(value, text.missing),
    },
    {
      title: text.full,
      dataIndex: 'fullBytes',
      render: (value: number | null) => observationBytes(value, text.missing),
    },
    {
      title: text.reduction,
      dataIndex: 'reduction',
      render: (value: number | null) => observationPercent(value, text.missing),
    },
    { title: text.observedAt, dataIndex: 'observedAt' },
  ];
  const outcomes: Record<string, string> = {
    used: text.used,
    rejected: text.rejected,
    'dump-failed': text.dumpFailed,
    none: text.none,
    unreported: text.unreported,
  };
  const versionColumns: ColumnsType<ReleaseVersionInsight> = [
    {
      title: text.version,
      key: 'version',
      render: (_, row) => (
        <div>
          {row.name || row.hash}
          <div className="text-xs text-gray-500">{row.hash}</div>
        </div>
      ),
    },
    {
      title: text.outcome,
      dataIndex: 'hermesBaseOutcome',
      render: (value: string) => (
        <Tag>{outcomes[value] ?? text.unreported}</Tag>
      ),
    },
    {
      title: text.base,
      key: 'base',
      render: (_, row) =>
        // bytecodeVersion 0: the bundle is plain JS, not Hermes bytecode
        `${row.baseVersionId ?? '—'} / ${row.bytecodeVersion === 0 ? 'JS' : (row.bytecodeVersion ?? '—')}`,
    },
    {
      title: text.detail,
      dataIndex: 'hermesBaseDetail',
      ellipsis: true,
    },
    { title: text.artifacts, dataIndex: 'artifactStatus', render: status },
  ];
  const unavailableMessage = (
    <Alert
      showIcon
      type="info"
      title={
        query.isLoading
          ? '…'
          : query.error || insights?.status === 'unavailable'
            ? text.unavailable
            : text.upgrade
      }
    />
  );
  const available = !!insights && insights.status !== 'unavailable';
  const dateSelect = (name: ReleaseSection) =>
    available && (
      <span className="flex items-center gap-2 text-sm font-normal">
        <label htmlFor={`${dateSelectID}-${name}`}>{text.day}</label>
        <Select
          id={`${dateSelectID}-${name}`}
          size="small"
          value={day?.date}
          onChange={setSelectedDate}
          options={insights.days.map((item) => ({
            value: item.date,
            label: item.date,
          }))}
          className="w-36"
        />
      </span>
    );
  const dayNotice = (
    <>
      {day && (day.limited || day.status === 'partial') && (
        <Alert showIcon type="warning" title={text.partial} />
      )}
      {(day?.status === 'expired' || day?.status === 'unavailable') && (
        <Alert
          type="info"
          title={day.status === 'expired' ? text.expired : text.missing}
        />
      )}
    </>
  );
  const dayReadable =
    day?.status !== 'expired' && day?.status !== 'unavailable';
  const show = (name: ReleaseSection) => !section || section === name;
  // Older server or unavailable data: show the notice once, in the first card's place.
  if (!available) {
    return show('rollout') ? (
      <Card size="small" title={text.title}>
        <Spin spinning={query.isLoading}>{unavailableMessage}</Spin>
      </Card>
    ) : null;
  }
  return (
    <>
      {show('rollout') && (
        <Card size="small" title={text.gray} extra={dateSelect('rollout')}>
          <div className="flex flex-col gap-3">
            <p className="m-0 text-sm text-gray-500">{text.grayQuestion}</p>
            {dayNotice}
            {dayReadable && (
              <Table
                rowKey="id"
                dataSource={day?.cohorts ?? []}
                columns={rolloutColumns}
                scroll={{ x: 1200 }}
                size="small"
                pagination={false}
                locale={{ emptyText: text.noGray }}
              />
            )}
            <p className="m-0 text-xs text-gray-400">{text.inference}</p>
          </div>
        </Card>
      )}
      {show('hermes') && isAdmin && (
        <Card size="small" title={text.hermes}>
          <div className="flex flex-col gap-3">
            <p className="m-0 text-sm text-gray-500">{text.distinction}</p>
            <Table
              rowKey="hash"
              dataSource={insights.versions}
              columns={versionColumns}
              scroll={{ x: 950 }}
              size="small"
              pagination={{ pageSize: 10 }}
              expandable={{
                expandedRowRender: (row) => (
                  <Table
                    rowKey="key"
                    dataSource={row.artifacts}
                    columns={artifactColumns}
                    size="small"
                    scroll={{ x: 1000 }}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: text.empty }}
                  />
                ),
              }}
            />
          </div>
        </Card>
      )}
    </>
  );
};
