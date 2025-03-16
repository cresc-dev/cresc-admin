// import { useDrag } from "react-dnd";
import { api } from "@/services/api";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import {
  Button,
  Col,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Tag,
  Typography,
} from "antd";
import { useManageContext } from "../hooks/useManageContext";
import { DepsTable } from "./deps-table";
import { Commit } from "./commit";

const PackageList = ({
  dataSource,
  loading,
}: { dataSource?: Package[]; loading?: boolean }) => (
  <List
    loading={loading}
    className="packages"
    size="small"
    dataSource={dataSource}
    renderItem={(item) => <Item item={item} />}
  />
);
export default PackageList;

function remove(item: Package, appId: number) {
  Modal.confirm({
    title: `It CANNOT be recovered after the deletion. Are you sure you want to delete "${item.name}"?`,
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
        <Form.Item name="note" label="Remark">
          <Input
            placeholder="Add Remark"
            onChange={({ target }) => (note = target.value)}
          />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select
            onSelect={(value: Package["status"]) => {
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

const Item = ({ item }: { item: Package }) => {
  const { appId } = useManageContext();
  return (
    // const [_, drag] = useDrag(() => ({ item, type: "package" }));
    <div className="bg-white my-0 [&_li]:!px-0">
      <List.Item className="p-2">
        <List.Item.Meta
          title={
            <Row align="middle">
              <Col flex={1}>
                {item.name}
                {item.status && item.status !== "normal" && (
                  <Tag className="ml-2">{status[item.status]}</Tag>
                )}
              </Col>
              <DepsTable deps={item.deps} name={"Package " + item.name} />
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
                  Remark: {item.note}
                </Typography.Paragraph>
              )}
              Build Time: {item.buildTime}
            </>
          }
        />
      </List.Item>
    </div>
  );
};
const status = {
  paused: "Paused",
  expired: "Expired",
};
