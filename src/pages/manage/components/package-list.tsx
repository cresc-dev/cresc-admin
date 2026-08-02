// import { useDrag } from "react-dnd";

import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  List,
  Modal,
  Popover,
  Row,
  Select,
  Tag,
  Tooltip,
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
import { Commit } from './commit';
import { DepsTable } from './deps-table';

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
        <div className="max-w-72 text-xs leading-5">
          {warnings.timestamps.length > 0 && (
            <div>
              <div>{t('package_list.mismatch_title')}</div>
              <div className="mt-1 break-all text-gray-700">
                {warnings.timestamps.map((timestamp) => (
                  <div key={timestamp}>{timestamp}</div>
                ))}
              </div>
              <div className="mt-2">{t('package_list.mismatch_desc')}</div>
            </div>
          )}
          {warnings.hashes.length > 0 && (
            <div className={warnings.timestamps.length > 0 ? 'mt-3' : ''}>
              <div>{t('package_list.hash_mismatch_title')}</div>
              <div className="mt-1 break-all text-gray-700">
                {warnings.hashes.map((hash) => (
                  <div key={hash}>
                    <code>
                      {hash.length > 16 ? `${hash.slice(0, 16)}…` : hash}
                    </code>
                  </div>
                ))}
              </div>
              <div className="mt-2">{t('package_list.hash_mismatch_desc')}</div>
            </div>
          )}
          <div className="mt-1">
            <Link to={realtimeMetricsPath}>
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

const Item = ({
  item,
  selected,
  onSelectedChange,
  warnings,
  realtimeMetricsPath,
}: {
  item: Package;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  warnings: PackageMetricWarnings;
  realtimeMetricsPath?: string;
}) => {
  const { t } = useTranslation();
  const { appId } = useManageContext();
  const { canPublish } = useWorkspacePermissions();
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
                <div className="flex flex-wrap items-center">
                  <span>{item.name}</span>
                  {hasMetricWarning && realtimeMetricsPath && (
                    <MetricWarning
                      warnings={warnings}
                      realtimeMetricsPath={realtimeMetricsPath}
                    />
                  )}
                  {item.status && item.status !== 'normal' && (
                    <Tag className="ml-2">{status[item.status]}</Tag>
                  )}
                </div>
              </Col>
              <DepsTable deps={item.deps} name={`Package ${item.name}`} />
              <Commit commit={item.commit} />
              {canPublish && (
                <>
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => setEditing(true)}
                  />
                  <Button
                    type="link"
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      remove(item, appId, deletePackage.mutateAsync)
                    }
                    danger
                  />
                </>
              )}
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
              {item.bundleHash ? (
                <>
                  {t('package_list.bundle_hash')}{' '}
                  <Tooltip title={item.bundleHash}>
                    <code>{item.bundleHash.slice(0, 16)}…</code>
                  </Tooltip>
                </>
              ) : (
                <>
                  {t('package_list.build_time')} {item.buildTime}
                </>
              )}
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
