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
  ReleaseDelivery,
  ReleaseVersionInsight,
  RolloutInsight,
} from './release-insights-types';
import { useAppVersionFunnel } from './shared';

export const ReleaseInsightsPanel = ({
  appKey,
  days,
}: {
  appKey: string;
  days: number;
}) => {
  const { t } = useTranslation();
  const text = {
    title: t('app_insights.release.title'),
    gray: t('app_insights.release.gray'),
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
    rate: t('app_insights.release.rate'),
    reasons: t('app_insights.release.reasons'),
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
    offers: t('app_insights.release.offers'),
    offersNote: t('app_insights.release.offers_note'),
    target: t('app_insights.release.target'),
    kind: t('app_insights.release.kind'),
    reason: t('app_insights.release.reason'),
    count: t('app_insights.release.count'),
    requests: t('app_insights.release.requests'),
    used: t('app_insights.release.used'),
    rejected: t('app_insights.release.rejected'),
    dumpFailed: t('app_insights.release.dump_failed'),
    none: t('app_insights.release.none'),
    unreported: t('app_insights.release.unreported'),
    observed: t('app_insights.release.observed'),
    limited: t('app_insights.release.limited'),
    unknownStatus: t('app_insights.release.unknown_status'),
    current: t('app_insights.release.current'),
    experimental: t('app_insights.release.experimental'),
    pending: t('app_insights.release.pending'),
    mismatch: t('app_insights.release.mismatch'),
    noPatch: t('app_insights.release.no_patch'),
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
      width: 270,
      render: (_, row) => (
        <div>
          <div>
            {row.packageVersion} · {name(row.targetHash)}
          </div>
          <div className="text-xs text-gray-500">
            {row.rollout == null ? text.missing : `${row.rollout}%`} ·{' '}
            {row.algorithm}
          </div>
          <code className="text-xs">{row.id.slice(0, 12)}</code>
        </div>
      ),
    },
    { title: text.exposed, dataIndex: 'exposedDevices', render: number },
    { title: text.hit, dataIndex: 'hitDevices', render: number },
    { title: text.miss, dataIndex: 'missDevices', render: number },
    { title: text.unknown, dataIndex: 'unknownDevices', render: number },
    {
      title: text.rate,
      dataIndex: 'hitRate',
      render: (value: number | null) => observationPercent(value, text.missing),
    },
    {
      title: text.reasons,
      key: 'reasons',
      width: 220,
      render: (_, row) => (
        <div>
          <div>
            {text.requests}: {number(row.requests.unknown)}
          </div>
          <div className="text-xs">
            UUID: {number(row.requests.missingUUID)} · SDK:{' '}
            {number(row.requests.missingSDK)} · Rule:{' '}
            {number(row.requests.missingRule)}
          </div>
        </div>
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
        `${row.baseVersionId ?? '—'} / ${row.bytecodeVersion ?? '—'}`,
    },
    { title: text.detail, dataIndex: 'hermesBaseDetail', ellipsis: true },
    { title: text.artifacts, dataIndex: 'artifactStatus', render: status },
  ];
  const reasons: Record<string, string> = {
    response_artifacts_pending: text.pending,
    bundle_mismatch_observed: text.mismatch,
    no_patch_offered: text.noPatch,
  };
  const deliveryColumns: ColumnsType<ReleaseDelivery> = [
    { title: text.version, dataIndex: 'hash', render: name },
    {
      title: text.target,
      dataIndex: 'target',
      render: (value: string) =>
        value === 'exp' ? text.experimental : text.current,
    },
    { title: text.kind, dataIndex: 'kind' },
    {
      title: text.reason,
      dataIndex: 'reason',
      render: (value: string) => reasons[value] ?? value,
    },
    { title: text.count, dataIndex: 'count', render: number },
  ];
  return (
    <Card title={text.title} className="mb-4">
      <Spin spinning={query.isLoading}>
        {!insights || insights.status === 'unavailable' ? (
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
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="font-medium">{text.gray}</h3>
            <Alert showIcon type="info" title={text.inference} />
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={dateSelectID}>{text.day}</label>
              <Select
                id={dateSelectID}
                value={day?.date}
                onChange={setSelectedDate}
                options={insights.days.map((item) => ({
                  value: item.date,
                  label: item.date,
                }))}
                className="w-44"
              />
            </div>
            {day && (day.limited || day.status === 'partial') && (
              <Alert showIcon type="warning" title={text.partial} />
            )}
            {day?.status === 'expired' || day?.status === 'unavailable' ? (
              <Alert
                type="info"
                title={day.status === 'expired' ? text.expired : text.missing}
              />
            ) : (
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
            <h3 className="font-medium">{text.hermes}</h3>
            <Alert showIcon type="info" title={text.distinction} />
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
            <h3 className="font-medium">{text.offers}</h3>
            <p className="text-sm text-gray-500">{text.offersNote}</p>
            <Table
              rowKey="id"
              dataSource={day?.deliveries ?? []}
              columns={deliveryColumns}
              size="small"
              scroll={{ x: 800 }}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: text.missing }}
            />
          </div>
        )}
      </Spin>
    </Card>
  );
};
