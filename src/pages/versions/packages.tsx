import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Col, Form, Input, List, Modal, Row, Select, Tag, Typography } from "antd";
// import { useDrag } from "react-dnd";
import request from "../../request";
import state, { fetchPackages, fetchVersions } from "./state";

export default ({ dataSource }: { dataSource: Package[] }) => (
  <List
    className="packages"
    size="small"
    dataSource={dataSource}
    renderItem={(item) => <Item item={item} />}
  />
);

function remove(item: Package) {
  Modal.confirm({
    title: "Are you sure?",
    content: `Do you really want to delete the package "${item.name}"? It cannot be undone.`,
    okText: "Delete",
    cancelText: "Cancel",
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await request("delete", `app/${state.app?.id}/package/${item.id}`);
      fetchPackages();
      fetchVersions(1);
    },
  });
}

function edit(item: Package) {
  console.log(item.note);
  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form layout="vertical" initialValues={item}>
        <Form.Item name="note" label="Note">
          <Input
            placeholder="Add note for this package"
            onChange={({ target }) => (item.note = target.value)}
          />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select
            onSelect={(value) => {
              // @ts-ignore
              item.status = value;
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
      const { note, status } = item;
      await request("put", `app/${state.app?.id}/package/${item.id}`, { note, status });
      fetchPackages();
    },
  });
}

const Item = ({ item }: { item: Package }) => {
  // const [_, drag] = useDrag(() => ({ item, type: "package" }));
  return (
    <div style={{ margin: "0 -8px", background: "#fff" }}>
      <List.Item style={{ padding: "8px" }}>
        <List.Item.Meta
          title={
            <Row align="middle">
              <Col flex={1}>
                {item.name}
                {item.status && item.status != "normal" && (
                  <Tag style={{ marginLeft: 8 }}>{status[item.status]}</Tag>
                )}
              </Col>
              <Button type="link" icon={<EditOutlined />} onClick={() => edit(item)} />
              <Button type="link" icon={<DeleteOutlined />} onClick={() => remove(item)} danger />
            </Row>
          }
          description={
            <>
              {item.note && (
                <Typography.Paragraph
                  style={{ marginBottom: 0 }}
                  type="secondary"
                  ellipsis={{ tooltip: item.note }}
                >
                  Note: {item.note}
                </Typography.Paragraph>
              )}
              BuildTime: {item.buildTime}
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
