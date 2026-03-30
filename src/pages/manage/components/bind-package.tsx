import {
  ArrowRightOutlined,
  CloudDownloadOutlined,
  ExperimentOutlined,
  LinkOutlined,
  RestOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Checkbox,
  Dropdown,
  type MenuProps,
  Modal,
  Table,
} from 'antd';
import { useMemo, useState } from 'react';
import { api } from '@/services/api';
import { useManageContext } from '../hooks/useManageContext';

type DepChangeType = 'Added' | 'Removed' | 'Changed';

type DepChangeRow = {
  key: string;
  dependency: string;
  oldVersion: string;
  newVersion: string;
  changeType: DepChangeType;
};

type DepChangeSummary = {
  added: number;
  removed: number;
  changed: number;
};

type DepChangeFilters = Record<DepChangeType, boolean>;

function getDepsChangeSummary(changes: DepChangeRow[]): DepChangeSummary {
  return changes.reduce(
    (acc, item) => {
      if (item.changeType === 'Added') {
        acc.added += 1;
      } else if (item.changeType === 'Removed') {
        acc.removed += 1;
      } else {
        acc.changed += 1;
      }
      return acc;
    },
    { added: 0, removed: 0, changed: 0 },
  );
}

function getDepsChangeColumns({
  summary,
  filters,
  onFilterChange,
}: {
  summary: DepChangeSummary;
  filters: DepChangeFilters;
  onFilterChange: (type: DepChangeType, checked: boolean) => void;
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
            Added {summary.added}
          </span>
          ,
          <Checkbox
            checked={filters.Removed}
            onChange={({ target }) => {
              onFilterChange('Removed', target.checked);
            }}
          />
          <span className="ml-1" style={{ color: '#16a34a', fontWeight: 700 }}>
            Removed {summary.removed}
          </span>
          ,
          <Checkbox
            checked={filters.Changed}
            onChange={({ target }) => {
              onFilterChange('Changed', target.checked);
            }}
          />
          <span className="ml-1" style={{ color: '#d97706', fontWeight: 700 }}>
            Changed {summary.changed}
          </span>
          )
        </span>
      ),
      dataIndex: 'dependency',
      key: 'dependency',
      ellipsis: true,
    },
    {
      title: 'Version Change',
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
              <span style={{ color: '#dc2626', fontWeight: 700 }}>Added</span>
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
            <span style={{ color: '#16a34a', fontWeight: 700 }}>Removed</span>
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

function getDepsChanges(
  oldDeps?: Record<string, string>,
  newDeps?: Record<string, string>,
): DepChangeRow[] | null {
  if (!oldDeps || !newDeps) {
    return null;
  }
  const rows: DepChangeRow[] = [];
  const keys = Object.keys({ ...oldDeps, ...newDeps }).sort((a, b) =>
    a.localeCompare(b),
  );
  for (const key of keys) {
    const oldValue = oldDeps[key];
    const newValue = newDeps[key];
    if (oldValue === undefined && newValue !== undefined) {
      rows.push({
        key,
        dependency: key,
        oldVersion: '-',
        newVersion: newValue,
        changeType: 'Added',
      });
      continue;
    }
    if (oldValue !== undefined && newValue === undefined) {
      rows.push({
        key,
        dependency: key,
        oldVersion: oldValue,
        newVersion: '-',
        changeType: 'Removed',
      });
      continue;
    }
    if (
      oldValue !== newValue &&
      oldValue !== undefined &&
      newValue !== undefined
    ) {
      rows.push({
        key,
        dependency: key,
        oldVersion: oldValue,
        newVersion: newValue,
        changeType: 'Changed',
      });
    }
  }
  return rows;
}

const DepsChangeConfirmContent = ({
  packageName,
  versionDisplayName,
  changes,
}: {
  packageName: string;
  versionDisplayName: string | number;
  changes: DepChangeRow[];
}) => {
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
      }),
    [summary, filters],
  );

  return (
    <div>
      <div>Target Native Package: {packageName}</div>
      <div>OTA Version: {versionDisplayName}</div>
      <Alert
        className="mt-3"
        showIcon
        type="warning"
        message={
          <span>
            Changes in pure JavaScript dependencies are usually safe. If any
            changed dependency includes <strong>native code</strong>, the OTA
            update may cause feature issues or even crashes. Please review
            carefully and run a full QR-code based test before publishing to
            production.
          </span>
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
          emptyText: 'No dependency changes match the current filters.',
        }}
      />
    </div>
  );
};

const BindPackage = ({
  versionId,
  versionDeps,
  versionName,
}: {
  versionId: number;
  versionDeps?: Record<string, string>;
  versionName?: string;
}) => {
  const {
    packages: allPackages,
    appId,
    bindings,
    packageMap,
  } = useManageContext();
  const availablePackages = allPackages;

  const publishToPackage = (
    pkg: { id: number; name: string; deps?: Record<string, string> },
    rollout?: number,
  ) => {
    const publish = () =>
      api.upsertBinding({
        appId,
        packageId: pkg.id,
        versionId,
        rollout,
      });
    const changes = getDepsChanges(pkg.deps, versionDeps);
    if (!changes || changes.length === 0) {
      void publish();
      return;
    }
    Modal.confirm({
      title: 'Dependency changes detected. Continue publishing?',
      maskClosable: true,
      okButtonProps: { danger: true },
      okText: 'Publish anyway',
      cancelText: 'Cancel',
      width: 820,
      content: (
        <DepsChangeConfirmContent
          packageName={pkg.name}
          versionDisplayName={versionName || versionId}
          changes={changes}
        />
      ),
      async onOk() {
        await publish();
      },
    });
  };

  const bindedPackages = (() => {
    const result = [];
    const matchedBindings: {
      id?: number;
      packageId: number;
      rollout: number | null | undefined;
    }[] = bindings.filter((b) => b.versionId === versionId);

    if (matchedBindings.length === 0 || allPackages.length === 0) return null;

    for (const binding of matchedBindings) {
      const p = packageMap.get(binding.packageId);
      if (!p) {
        continue;
      }
      const rolloutConfig = binding.rollout;
      const isFull =
        rolloutConfig === 100 ||
        rolloutConfig === undefined ||
        rolloutConfig === null;
      const rolloutConfigNumber = Number(rolloutConfig);
      const items: MenuProps['items'] = isFull
        ? []
        : [
            {
              key: 'full',
              label: 'Full Release',
              icon: <CloudDownloadOutlined />,
              onClick: () => publishToPackage(p),
            },
          ];

      if (rolloutConfigNumber < 50 && !isFull) {
        items.push({
          key: 'staged',
          label: 'Staged Release',
          icon: <ExperimentOutlined />,
          children: [1, 2, 5, 10, 20, 50].reduce<
            NonNullable<MenuProps['items']>
          >((acc, percentage) => {
            if (percentage > rolloutConfigNumber) {
              acc.push({
                key: `${percentage}`,
                label: `${percentage}%`,
                onClick: () => publishToPackage(p, percentage),
              });
            }
            return acc;
          }, []),
        });
      }
      if (items.length > 0) {
        items.push({ type: 'divider' });
      }
      items.push({
        key: 'unpublish',
        label: 'Unpublish',
        icon: <RestOutlined />,
        onClick: () => {
          const bindingId = binding.id;
          if (bindingId) {
            api.deleteBinding({ appId, bindingId });
          } else {
            api.updatePackage({
              appId,
              packageId: p.id,
              params: { versionId: null },
            });
          }
        },
      });
      const button = (
        <Button
          size="small"
          color="primary"
          variant={isFull ? 'filled' : 'dashed'}
        >
          <span className="font-bold">{p.name}</span>
          <span className="text-xs">{isFull ? '' : `(${rolloutConfig}%)`}</span>
        </Button>
      );
      result.push(
        <Dropdown key={p.id} menu={{ items }}>
          {button}
        </Dropdown>,
      );
    }
    return result;
  })();

  return (
    <div className="flex flex-wrap gap-1">
      {bindedPackages}
      {availablePackages.length !== 0 && (
        <Dropdown
          menu={{
            items: availablePackages.map((p) => ({
              key: `pkg-${p.id}`,
              label: p.name,
              children: [
                {
                  key: `pkg-${p.id}-full`,
                  label: 'Full Release',
                  icon: <CloudDownloadOutlined />,
                  onClick: () => publishToPackage(p),
                },
                {
                  key: `pkg-${p.id}-staged`,
                  label: 'Staged Release',
                  icon: <ExperimentOutlined />,
                  children: [1, 2, 5, 10, 20, 50].map((percentage) => ({
                    key: `pkg-${p.id}-staged-${percentage}`,
                    label: `${percentage}%`,
                    onClick: () => publishToPackage(p, percentage),
                  })),
                },
              ],
            })),
          }}
          className="ant-typography-edit"
        >
          <Button type="link" size="small" icon={<LinkOutlined />}>
            Publish
          </Button>
        </Dropdown>
      )}
    </div>
  );
};

export default BindPackage;
