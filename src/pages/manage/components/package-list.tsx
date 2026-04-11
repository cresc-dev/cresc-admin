// import { useDrag } from "react-dnd";

import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import {
  Button,
  Col,
  Form,
  Input,
  List,
  Modal,
  Popover,
  Row,
  Select,
  Tag,
  Typography,
} from 'antd';
import { Link } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { api } from '@/services/api';
import { useManageContext } from '../hooks/useManageContext';
import { Commit } from './commit';
import { DepsTable } from './deps-table';

const PackageList = ({
  dataSource,
  loading,
}: {
  dataSource?: Package[];
  loading?: boolean;
}) => {
  const { app, packageTimestampWarnings } = useManageContext();
  const realtimeMetricsPath = app?.appKey
    ? `${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
        appKey: app.appKey,
        attribute: 'packageVersion_buildTime',
      }).toString()}`
    : undefined;

  return (
    <List
      loading={loading}
      className="packages"
      size="small"
      dataSource={dataSource}
      renderItem={(item) => (
        <Item
          item={item}
          warningTimestamps={packageTimestampWarnings.get(item.id) ?? []}
          realtimeMetricsPath={realtimeMetricsPath}
        />
      )}
    />
  );
};
export default PackageList;

function remove(item: Package, appId: number) {
  Modal.confirm({
    title: `This action cannot be undone. Delete "${item.name}"?`,
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await api.deletePackage({ appId, packageId: item.id });
    },
  });
}

function edit(item: Package, appId: number) {
  let { note, status } = item;
  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form layout="vertical" initialValues={item}>
        <Form.Item name="note" label="Note">
          <Input
            placeholder="Add a note"
            onChange={({ target }) => (note = target.value)}
          />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select
            onSelect={(value: Package['status']) => {
              status = value;
            }}
          >
            <Select.Option value="normal">Normal</Select.Option>
            <Select.Option value="paused">Paused</Select.Option>
            <Select.Option value="expired">Expired</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    ),
    async onOk() {
      await api.updatePackage({
        appId,
        packageId: item.id,
        params: { note, status },
      });
    },
  });
}

const TimestampWarning = ({
  warningTimestamps,
  realtimeMetricsPath,
}: {
  warningTimestamps: string[];
  realtimeMetricsPath: string;
}) => (
  <Popover
    trigger="hover"
    content={
      <div className="max-w-72 text-xs leading-5">
        <div>Detected mismatched timestamps:</div>
        <div className="mt-1 break-all text-gray-700">
          {warningTimestamps.map((timestamp) => (
            <div key={timestamp}>{timestamp}</div>
          ))}
        </div>
        <div className="mt-2">
          Enable &quot;Ignore Build Time&quot; in App Settings, otherwise these
          packages cannot receive hot updates.
        </div>
        <div className="mt-1">
          <Link to={realtimeMetricsPath}>
            Click here to view real-time data
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

const Item = ({
  item,
  warningTimestamps,
  realtimeMetricsPath,
}: {
  item: Package;
  warningTimestamps: string[];
  realtimeMetricsPath?: string;
}) => {
  const { appId } = useManageContext();
  const hasTimestampWarning = warningTimestamps.length > 0;
  return (
    // const [_, drag] = useDrag(() => ({ item, type: "package" }));
    <div className="bg-white my-0 [&_li]:!px-0">
      <List.Item className="p-2">
        <List.Item.Meta
          title={
            <Row align="middle">
              <Col flex={1}>
                <div className="flex flex-wrap items-center">
                  <span>{item.name}</span>
                  {hasTimestampWarning && realtimeMetricsPath && (
                    <TimestampWarning
                      warningTimestamps={warningTimestamps}
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
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => edit(item, appId)}
              />
              <Button
                type="link"
                icon={<DeleteOutlined />}
                onClick={() => remove(item, appId)}
                danger
              />
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
                  Note: {item.note}
                </Typography.Paragraph>
              )}
              Build time: {item.buildTime}
            </>
          }
        />
      </List.Item>
    </div>
  );
};
const status = {
  paused: 'Paused',
  expired: 'Expired',
};
