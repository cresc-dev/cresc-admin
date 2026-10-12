import { ArrowRightOutlined } from '@ant-design/icons';
import { Alert, Checkbox, Table } from 'antd';
import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  type DepChangeFilters,
  type DepChangeRow,
  type DepChangeSummary,
  type DepChangeType,
  getDepsChangeSummary,
} from './bind-package.logic';

function getDepsChangeColumns({
  summary,
  filters,
  onFilterChange,
  t,
}: {
  summary: DepChangeSummary;
  filters: DepChangeFilters;
  onFilterChange: (type: DepChangeType, checked: boolean) => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return [
    {
      title: (
        <span>
          Dependencies (
          <Checkbox
            checked={filters.Added}
            onChange={({ target }) => {
              onFilterChange('Added', target.checked);
            }}
          />
          <span className="ml-1" style={{ color: '#dc2626', fontWeight: 700 }}>
            {t('bind_package.change_added')} {summary.added}
          </span>
          ,
          <Checkbox
            checked={filters.Removed}
            onChange={({ target }) => {
              onFilterChange('Removed', target.checked);
            }}
          />
          <span className="ml-1" style={{ color: '#16a34a', fontWeight: 700 }}>
            {t('bind_package.change_removed')} {summary.removed}
          </span>
          ,
          <Checkbox
            checked={filters.Changed}
            onChange={({ target }) => {
              onFilterChange('Changed', target.checked);
            }}
          />
          <span className="ml-1" style={{ color: '#d97706', fontWeight: 700 }}>
            {t('bind_package.change_changed')} {summary.changed}
          </span>
          )
        </span>
      ),
      dataIndex: 'dependency',
      key: 'dependency',
      ellipsis: true,
    },
    {
      title: t('bind_package.col_version_change'),
      key: 'versionChange',
      ellipsis: true,
      render: (_: unknown, record: DepChangeRow) => {
        if (record.changeType === 'Changed') {
          return (
            <span className="font-mono">
              <span style={{ color: '#d97706', fontWeight: 600 }}>
                {record.oldVersion}
              </span>
              <ArrowRightOutlined className="mx-2 text-gray-400" />
              <span style={{ color: '#d97706', fontWeight: 600 }}>
                {record.newVersion}
              </span>
            </span>
          );
        }

        if (record.changeType === 'Added') {
          return (
            <span className="font-mono">
              <span style={{ color: '#dc2626', fontWeight: 700 }}>
                {t('bind_package.change_added')}
              </span>
              <span className="mx-2 text-gray-400">|</span>
              <span style={{ color: '#6b7280' }}>{record.oldVersion}</span>
              <ArrowRightOutlined className="mx-2 text-gray-400" />
              <span style={{ color: '#dc2626', fontWeight: 600 }}>
                {record.newVersion}
              </span>
            </span>
          );
        }

        return (
          <span className="font-mono">
            <span style={{ color: '#16a34a', fontWeight: 700 }}>
              {t('bind_package.change_removed')}
            </span>
            <span className="mx-2 text-gray-400">|</span>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>
              {record.oldVersion}
            </span>
            <ArrowRightOutlined className="mx-2 text-gray-400" />
            <span style={{ color: '#6b7280' }}>{record.newVersion}</span>
          </span>
        );
      },
    },
  ];
}

export const DepsChangeConfirmContent = ({
  packageName,
  versionDisplayName,
  changes,
}: {
  packageName: string;
  versionDisplayName: string | number;
  changes: DepChangeRow[];
}) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<DepChangeFilters>({
    Added: true,
    Removed: true,
    Changed: true,
  });

  const summary = useMemo(() => getDepsChangeSummary(changes), [changes]);
  const filteredChanges = useMemo(
    () => changes.filter((item) => filters[item.changeType]),
    [changes, filters],
  );
  const columns = useMemo(
    () =>
      getDepsChangeColumns({
        summary,
        filters,
        onFilterChange: (type, checked) => {
          setFilters((prev) => ({ ...prev, [type]: checked }));
        },
        t,
      }),
    [summary, filters, t],
  );

  return (
    <div>
      <div>
        {t('bind_package.target_package')} {packageName}
      </div>
      <div>
        {t('bind_package.ota_version')} {versionDisplayName}
      </div>
      <Alert
        className="mt-3"
        showIcon
        type="warning"
        message={
          <Trans
            i18nKey="bind_package.native_warning"
            components={{ strong: <strong /> }}
          />
        }
      />
      <Table<DepChangeRow>
        className="mt-3"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={filteredChanges}
        scroll={{ y: 320 }}
        locale={{
          emptyText: t('bind_package.no_dep_changes'),
        }}
      />
    </div>
  );
};
