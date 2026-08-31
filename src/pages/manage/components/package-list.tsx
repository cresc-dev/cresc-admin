// import { useDrag } from "react-dnd";

import {
  BarcodeOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  JavaScriptOutlined,
  PullRequestOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Col,
  Dropdown,
  Form,
  Input,
  List,
  type MenuProps,
  Modal,
  message,
  Popover,
  Row,
  Select,
  Tag,
  Typography,
} from 'antd';
import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import i18n from '@/i18n';
import { rootRouterPath } from '@/router';
import {
  useDeletePackage,
  useDeletePackages,
  useUpdatePackage,
} from '@/services/mutations';
import {
  type PackageMetricWarnings,
  useWorkspacePermissions,
} from '@/utils/hooks';
import { useManageContext } from '../hooks/useManageContext';
import { CommitModal } from './commit';
import { DepsModal } from './deps-table';

const PackageList = ({
  dataSource,
  loading,
  selectedPackageIds,
  setSelectedPackageIds,
}: {
  dataSource?: Package[];
  loading?: boolean;
  selectedPackageIds: number[];
  setSelectedPackageIds: Dispatch<SetStateAction<number[]>>;
}) => {
  const { t } = useTranslation();
  const { app, appId, packageMetricWarnings } = useManageContext();
  const { canPublish } = useWorkspacePermissions();
  const deletePackages = useDeletePackages();
  const selectedPackageIdSet = useMemo(
    () => new Set(selectedPackageIds),
    [selectedPackageIds],
  );
  const selectedPackages = useMemo(
    () => dataSource?.filter((item) => selectedPackageIdSet.has(item.id)) ?? [],
    [dataSource, selectedPackageIdSet],
  );
  const hasSelectedVisiblePackages = selectedPackages.length > 0;
  // carry the warning window (7 days) and the flagged timestamps/hashes so
  // the realtime page can pin those categories into the default legend
  // (the Top 10 cutoff would otherwise hide low-volume categories)
  const buildRealtimeMetricsPath = (
    item: Package,
    warnings: PackageMetricWarnings,
  ) =>
    app?.appKey
      ? `${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
          appKey: app.appKey,
          attribute: 'packageVersion_buildTime',
          range: '7d',
          focus: [...warnings.timestamps, ...warnings.hashes]
            .map((value) => `${item.name}_${value}`)
            .join(','),
        }).toString()}`
      : undefined;

  const togglePackageSelection = (packageId: number, checked: boolean) => {
    setSelectedPackageIds((prev) => {
      if (checked) {
        return [...new Set([...prev, packageId])];
      }
      return prev.filter((id) => id !== packageId);
    });
  };

  return (
    <List
      loading={loading}
      className="packages"
      size="small"
      dataSource={dataSource}
      footer={
        hasSelectedVisiblePackages && canPublish ? (
          <div className="px-2">
            <Button
              className="w-full sm:w-auto"
              danger
              icon={<DeleteOutlined />}
              onClick={() =>
                removeSelectedPackages(
                  selectedPackages,
                  appId,
                  deletePackages.mutateAsync,
                  () => {
                    setSelectedPackageIds((prev) =>
                      prev.filter(
                        (id) =>
                          !selectedPackages.some((item) => item.id === id),
                      ),
                    );
                  },
                )
              }
            >
              {t('package_list.delete_button')}
            </Button>
          </div>
        ) : undefined
      }
      renderItem={(item) => {
        const warnings =
          packageMetricWarnings.get(item.id) ?? EMPTY_METRIC_WARNINGS;
        return (
          <Item
            item={item}
            selected={selectedPackageIdSet.has(item.id)}
            onSelectedChange={(checked) =>
              togglePackageSelection(item.id, checked)
            }
            warnings={warnings}
            realtimeMetricsPath={buildRealtimeMetricsPath(item, warnings)}
            canPublish={canPublish}
          />
        );
      }}
    />
  );
};
export default PackageList;

function removeSelectedPackages(
  items: Package[],
  appId: number,
  deletePackages: (variables: {
    appId: number;
    packageIds: number[];
  }) => Promise<unknown>,
  onSuccess: () => void,
) {
  if (items.length === 0) {
    return;
  }
  Modal.confirm({
    title: i18n.t('package_list.batch_delete_title'),
    content: (
      <div>
        <Typography.Paragraph type="danger">
          {i18n.t('package_list.batch_delete_warning')}
        </Typography.Paragraph>
        <div className="max-h-48 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id}>{item.name}</div>
          ))}
        </div>
      </div>
    ),
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await deletePackages({
        appId,
        packageIds: items.map((item) => item.id),
      });
      onSuccess();
    },
  });
}

function remove(
  item: Package,
  appId: number,
  deletePackage: (variables: {
    appId: number;
    packageId: number;
  }) => Promise<unknown>,
) {
  Modal.confirm({
    title: i18n.t('package_list.single_delete_title', { name: item.name }),
    content: (
      <Typography.Paragraph type="danger">
        {i18n.t('package_list.single_delete_warning')}
      </Typography.Paragraph>
    ),
    maskClosable: true,
    keyboard: true,
    okButtonProps: { danger: true },
    async onOk() {
      await deletePackage({ appId, packageId: item.id });
    },
  });
}

const EditPackageModal = ({
  item,
  appId,
  onClose,
}: {
  item: Package;
  appId: number;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<{
    note?: string;
    status?: Package['status'];
  }>();
  const updatePackage = useUpdatePackage();

  return (
    <Modal
      open
      maskClosable
      keyboard
      destroyOnClose
      title={
        <span className="font-semibold text-base text-[var(--ant-color-text)]">
          {t('common.edit')}
        </span>
      }
      confirmLoading={updatePackage.isPending}
      onCancel={onClose}
      onOk={async () => {
        const { note, status } = await form.validateFields();
        try {
          await updatePackage.mutateAsync({
            appId,
            packageId: item.id,
            params: { note, status },
          });
        } catch {
          // request layer already toasts the error; keep the modal open
          return;
        }
        onClose();
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ note: item.note, status: item.status }}
        className="pt-2"
      >
        <Form.Item name="note" label={t('package_list.note')}>
          <Input placeholder={t('package_list.add_note')} />
        </Form.Item>
        <Form.Item name="status" label={t('package_list.status')}>
          <Select>
            <Select.Option value="normal">
              {t('package_list.status_normal')}
            </Select.Option>
            <Select.Option value="paused">
              {t('package_list.status_paused')}
            </Select.Option>
            <Select.Option value="expired">
              {t('package_list.status_expired')}
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

const EMPTY_METRIC_WARNINGS: PackageMetricWarnings = {
  timestamps: [],
  hashes: [],
};

const MetricWarning = ({
  warnings,
  realtimeMetricsPath,
}: {
  warnings: PackageMetricWarnings;
  realtimeMetricsPath: string;
}) => {
  const { t } = useTranslation();
  return (
    <Popover
      trigger="hover"
      content={
        <div className="max-w-72 text-xs leading-5 text-[var(--ant-color-text)]">
          {warnings.timestamps.length > 0 && (
            <div>
              <div className="font-medium">
                {t('package_list.mismatch_title')}
              </div>
              <div className="mt-1 break-all text-[var(--ant-color-text-secondary)]">
                {warnings.timestamps.map((timestamp) => (
                  <div key={timestamp}>{timestamp}</div>
                ))}
              </div>
              <div className="mt-2 text-[var(--ant-color-text-secondary)]">
                {t('package_list.mismatch_desc')}
              </div>
            </div>
          )}
          {warnings.hashes.length > 0 && (
            <div className={warnings.timestamps.length > 0 ? 'mt-3' : ''}>
              <div className="font-medium">
                {t('package_list.hash_mismatch_title')}
              </div>
              <div className="mt-1 break-all text-[var(--ant-color-text-secondary)]">
                {warnings.hashes.map((hash) => (
                  <div key={hash}>
                    <code>
                      {hash.length > 16 ? `${hash.slice(0, 16)}…` : hash}
                    </code>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[var(--ant-color-text-secondary)]">
                {t('package_list.hash_mismatch_desc')}
              </div>
            </div>
          )}
          <div className="mt-2 pt-1 border-t border-[var(--ant-color-border-secondary)]">
            <Link
              to={realtimeMetricsPath}
              className="text-[var(--ant-color-primary)] hover:underline"
            >
              {t('package_list.view_realtime')}
            </Link>
          </div>
        </div>
      }
    >
      <span className="ml-2 inline-flex cursor-help items-center text-amber-500">
        <ExclamationCircleFilled />
      </span>
    </Popover>
  );
};

const PackageNameCell = ({
  item,
  canPublish,
  onDelete,
  onEdit,
}: {
  item: Package;
  canPublish: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) => {
  const { t } = useTranslation();
  const [modalType, setModalType] = useState<'deps' | 'commit' | null>(null);

  const infoItem = item.bundleHash
    ? {
        key: 'hash',
        icon: <BarcodeOutlined className="mt-1 self-start shrink-0" />,
        label: (
          <div className="flex flex-col gap-0.5 py-0.5 max-w-[240px]">
            <span className="text-[11px] text-[var(--ant-color-text-secondary)]">
              {t('package_list.bundle_hash').replace(/[:：]$/, '')}
            </span>
            <span className="font-mono text-xs text-[var(--ant-color-text)] break-all leading-snug">
              {item.bundleHash}
            </span>
          </div>
        ),
      }
    : item.buildTime
      ? {
          key: 'buildTime',
          icon: <ClockCircleOutlined className="mt-1 self-start shrink-0" />,
          label: (
            <div className="flex flex-col gap-0.5 py-0.5 max-w-[240px]">
              <span className="text-[11px] text-[var(--ant-color-text-secondary)]">
                {t('package_list.build_time').replace(/[:：]$/, '')}
              </span>
              <span className="text-xs text-[var(--ant-color-text)] break-all leading-snug">
                {item.buildTime}
              </span>
            </div>
          ),
        }
      : null;

  const menuItems: MenuProps['items'] = [
    {
      type: 'group',
      label: (
        <span className="font-semibold text-xs text-[var(--ant-color-text)] max-w-[240px] truncate block">
          {item.name}
        </span>
      ),
    },
    {
      type: 'divider',
    },
    ...(canPublish
      ? [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: t('common.edit'),
          },
        ]
      : []),
    {
      key: 'deps',
      icon: <JavaScriptOutlined />,
      label: t('deps_table.js_deps_heading'),
    },
    {
      key: 'commit',
      icon: <PullRequestOutlined />,
      label: t('commit.title'),
    },
    ...(infoItem
      ? [
          {
            type: 'divider' as const,
          },
          infoItem,
        ]
      : []),
    ...(canPublish
      ? [
          {
            type: 'divider' as const,
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: t('common.delete'),
            danger: true,
          },
        ]
      : []),
  ];

  return (
    <div className="flex-1 min-w-0">
      <Dropdown
        menu={{
          items: menuItems,
          onClick: async ({ key }) => {
            if (key === 'edit') {
              onEdit();
            } else if (key === 'delete') {
              onDelete();
            } else if (key === 'hash' && item.bundleHash) {
              try {
                await navigator.clipboard.writeText(item.bundleHash);
                message.success(t('admin_apps.copied'));
              } catch {
                message.error(t('admin_apps.copy_failed'));
              }
            } else if (key === 'buildTime' && item.buildTime) {
              try {
                await navigator.clipboard.writeText(item.buildTime);
                message.success(t('admin_apps.copied'));
              } catch {
                message.error(t('admin_apps.copy_failed'));
              }
            } else if (key === 'deps' || key === 'commit') {
              setModalType(key);
            }
          },
        }}
        trigger={['hover']}
        placement="bottomLeft"
      >
        <div className="w-full cursor-pointer py-1 px-1.5 -mx-1.5 rounded hover:bg-[var(--ant-color-fill-secondary)] transition-colors">
          <Typography.Text
            strong
            className="block max-w-[14rem] md:max-w-xs truncate text-[var(--ant-color-text)]"
          >
            {item.name}
          </Typography.Text>
        </div>
      </Dropdown>

      {modalType === 'deps' && (
        <DepsModal
          open
          onClose={() => setModalType(null)}
          deps={item.deps}
          name={`Package ${item.name}`}
        />
      )}
      {modalType === 'commit' && (
        <CommitModal
          open
          onClose={() => setModalType(null)}
          commit={item.commit}
        />
      )}
    </div>
  );
};

const Item = ({
  item,
  selected,
  onSelectedChange,
  warnings,
  realtimeMetricsPath,
  canPublish,
}: {
  item: Package;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  warnings: PackageMetricWarnings;
  realtimeMetricsPath?: string;
  /** Resolved once by the list and passed down, so items don't each mount a query observer */
  canPublish: boolean;
}) => {
  const { t } = useTranslation();
  const { appId } = useManageContext();
  const deletePackage = useDeletePackage();
  const [editing, setEditing] = useState(false);
  const hasMetricWarning =
    warnings.timestamps.length > 0 || warnings.hashes.length > 0;
  return (
    // const [_, drag] = useDrag(() => ({ item, type: "package" }));
    <div className="bg-container my-0 [&_li]:!px-0">
      <List.Item className="p-2">
        <List.Item.Meta
          title={
            <Row align="middle" className="w-full" wrap={false}>
              <Col flex="none" className="pr-4 leading-none">
                <Checkbox
                  checked={selected}
                  onChange={({ target }) => onSelectedChange(target.checked)}
                />
              </Col>
              <Col flex="auto" className="min-w-0">
                <div className="flex items-center">
                  <PackageNameCell
                    item={item}
                    canPublish={canPublish}
                    onEdit={() => setEditing(true)}
                    onDelete={() =>
                      remove(item, appId, deletePackage.mutateAsync)
                    }
                  />
                  {hasMetricWarning && realtimeMetricsPath && (
                    <MetricWarning
                      warnings={warnings}
                      realtimeMetricsPath={realtimeMetricsPath}
                    />
                  )}
                  {item.status && item.status !== 'normal' && (
                    <Tag className="ml-2 shrink-0">{status[item.status]}</Tag>
                  )}
                </div>
              </Col>
            </Row>
          }
          description={
            <>
              {item.note && (
                <Typography.Paragraph
                  className="mb-0"
                  type="secondary"
                  ellipsis={{ tooltip: item.note }}
                >
                  {t('package_list.note_prefix')} {item.note}
                </Typography.Paragraph>
              )}
              {/* content identity (new-CLI uploads only) wins over build time:
                  it is the precise binary identity; old packages fall back */}
              <div className="text-xs flex flex-col gap-1 text-[var(--ant-color-text-secondary)]">
                {item.bundleHash ? (
                  <div>
                    {t('package_list.bundle_hash')}{' '}
                    <code className="text-[var(--ant-color-text)]">
                      {item.bundleHash.slice(0, 16)}…
                    </code>
                  </div>
                ) : (
                  <div>
                    {t('package_list.build_time')} {item.buildTime}
                  </div>
                )}
              </div>
            </>
          }
        />
      </List.Item>
      {editing && (
        <EditPackageModal
          item={item}
          appId={appId}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
};
const status = {
  paused: i18n.t('package_list.status_map_paused'),
  expired: i18n.t('package_list.status_map_expired'),
};
