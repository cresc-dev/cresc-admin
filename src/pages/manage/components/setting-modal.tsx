import { DeleteFilled } from '@ant-design/icons';
import { Button, Form, Input, Modal, Switch, Typography } from 'antd';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { useManageContext } from '../hooks/useManageContext';

const SettingModal = () => {
  const { appId } = useManageContext();
  const appKey = Form.useWatch('appKey') as string;

  return (
    <>
      <Form.Item label="App ID" layout="vertical">
        <Typography.Paragraph className="!mb-0" type="secondary" copyable>
          {appId}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label="App Key" name="appKey" layout="vertical">
        <Typography.Paragraph className="!mb-0" type="secondary" copyable>
          {appKey}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label="App Name" name="name" layout="vertical">
        <Input />
      </Form.Item>
      <Form.Item
        label="Native Package Download URL (used when the installed native package is expired)"
        name="downloadUrl"
        layout="vertical"
      >
        <Input />
      </Form.Item>
      <Form.Item
        layout="vertical"
        label="Enable Hot Updates"
        name="status"
        normalize={(value) => (value ? 'normal' : 'paused')}
        getValueProps={(value) => ({
          value: value === 'normal' || value === null || value === undefined,
        })}
      >
        <Switch checkedChildren="Enabled" unCheckedChildren="Paused" />
      </Form.Item>
      <Form.Item label="Delete App" layout="vertical">
        <Button
          type="primary"
          icon={<DeleteFilled />}
          onClick={() => {
            Modal.confirm({
              title: 'This app cannot be recovered after deletion.',
              okText: 'Delete App',
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
          Delete
        </Button>
      </Form.Item>
    </>
  );
};

export default SettingModal;
