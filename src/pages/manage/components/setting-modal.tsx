import { rootRouterPath, router } from "@/router";
import { api } from "@/services/api";
import { useUserInfo } from "@/utils/hooks";
import { DeleteFilled } from "@ant-design/icons";
import { Button, Form, Input, Modal, Switch, Typography } from "antd";
import { useManageContext } from "../hooks/useManageContext";

const SettingModal = () => {
  const { user } = useUserInfo();
  const { appId } = useManageContext();
  const appKey = Form.useWatch("appKey") as string;
  const ignoreBuildTime = Form.useWatch("ignoreBuildTime") as string;

  return (
    <>
      <Form.Item label="AppId" layout="vertical">
        <Typography.Paragraph className="!mb-0" type="secondary" copyable>
          {appId}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label="AppKey" name="appKey" layout="vertical">
        <Typography.Paragraph className="!mb-0" type="secondary" copyable>
          {appKey}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label="App Name" name="name" layout="vertical">
        <Input />
      </Form.Item>
      <Form.Item
        label="Native Package Download URL (When the native version on the user side expires, it will use this address to download)"
        name="downloadUrl"
        layout="vertical"
      >
        <Input />
      </Form.Item>
      <Form.Item
        layout="vertical"
        label="Enable Hot Update"
        name="status"
        normalize={(value) => (value ? "normal" : "paused")}
        getValueProps={(value) => ({
          value: value === "normal" || value === null || value === undefined,
        })}
      >
        <Switch checkedChildren="Enabled" unCheckedChildren="Paused" />
      </Form.Item>
      <Form.Item
        layout="vertical"
        label="Ignore Build Time Check (Only available for Premium and above)"
        name="ignoreBuildTime"
        normalize={(value) => (value ? "enabled" : "disabled")}
        getValueProps={(value) => ({ value: value === "enabled" })}
      >
        <Switch
          disabled={
            (user?.tier === "free" || user?.tier === "standard") &&
            ignoreBuildTime !== "enabled"
          }
          checkedChildren="Enabled"
          unCheckedChildren="Disabled"
        />
      </Form.Item>
      <Form.Item label="Delete App" layout="vertical">
        <Button
          type="primary"
          icon={<DeleteFilled />}
          onClick={() => {
            Modal.confirm({
              title: "The app cannot be recovered after deletion",
              okText: "Confirm Delete",
              okButtonProps: { danger: true },
              async onOk() {
                await api.deleteApp(appId);
                Modal.destroyAll();
                router.navigate(rootRouterPath.apps);
              },
            });
          }}
          danger
        >
          删除
        </Button>
      </Form.Item>
    </>
  );
};

export default SettingModal;
