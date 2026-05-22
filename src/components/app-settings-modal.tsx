import { DeleteFilled } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Form,
  Grid,
  Input,
  Modal,
  message,
  Spin,
  Switch,
  Typography,
} from 'antd';
import { useEffect } from 'react';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { useUserInfo } from '@/utils/hooks';

export interface AppSettingsTarget {
  id: number;
  name?: string;
  appKey?: string | null;
  downloadUrl?: string | null;
  status?: string | null;
  ignoreBuildTime?: 'enabled' | 'disabled' | null;
}

type AppSettingsFormValues = Pick<
  App,
  'appKey' | 'downloadUrl' | 'ignoreBuildTime' | 'name' | 'status'
>;

export function useAppSettingsModal() {
  const [modal, contextHolder] = Modal.useModal();
  const [form] = Form.useForm<AppSettingsFormValues>();
  const screens = Grid.useBreakpoint();

  const openAppSettings = (app: AppSettingsTarget) => {
    form.resetFields();
    form.setFieldsValue(normalizeAppSettings(app));
    modal.confirm({
      title: 'App Settings',
      icon: null,
      closable: true,
      maskClosable: true,
      width: !screens.md ? 'calc(100vw - 32px)' : 520,
      content: (
        <AppSettingsModalContent appId={app.id} form={form} initialApp={app} />
      ),
      async onOk() {
        try {
          const values = form.getFieldsValue();
          await api.updateApp(app.id, {
            name: values.name,
            downloadUrl: values.downloadUrl,
            status: values.status,
            ignoreBuildTime: values.ignoreBuildTime,
          });
        } catch (error) {
          message.error((error as Error).message);
          return Promise.reject(error);
        }
        message.success('Settings updated');
      },
    });
  };

  return { contextHolder, openAppSettings };
}

function AppSettingsModalContent({
  appId,
  form,
  initialApp,
}: {
  appId: number;
  form: ReturnType<typeof Form.useForm<AppSettingsFormValues>>[0];
  initialApp: AppSettingsTarget;
}) {
  const { user } = useUserInfo();
  const { data: app, isLoading } = useQuery({
    queryKey: ['app', appId],
    queryFn: () => api.getApp(appId),
  });
  const appKey = Form.useWatch('appKey', form) as string;
  const ignoreBuildTime = Form.useWatch('ignoreBuildTime', form) as string;

  useEffect(() => {
    if (app) {
      form.setFieldsValue(normalizeAppSettings(app));
    }
  }, [app, form]);

  return (
    <Spin spinning={isLoading}>
      <Form
        layout="vertical"
        form={form}
        initialValues={normalizeAppSettings(initialApp)}
      >
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
          label="Native package download URL"
          name="downloadUrl"
          layout="vertical"
        >
          <Input />
        </Form.Item>
        <Form.Item
          layout="vertical"
          label="Enable hot updates"
          name="status"
          normalize={(value) => (value ? 'normal' : 'paused')}
          getValueProps={(value) => ({
            value: value === 'normal' || value === null || value === undefined,
          })}
        >
          <Switch checkedChildren="Enabled" unCheckedChildren="Paused" />
        </Form.Item>
        <Form.Item
          layout="vertical"
          label="Ignore build timestamp (Premium and above)"
          name="ignoreBuildTime"
          normalize={(value) => (value ? 'enabled' : 'disabled')}
          getValueProps={(value) => ({ value: value === 'enabled' })}
        >
          <Switch
            disabled={
              (user?.tier === 'free' || user?.tier === 'standard') &&
              ignoreBuildTime !== 'enabled'
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
                title: 'Deleted apps cannot be restored',
                okText: 'Delete',
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
      </Form>
    </Spin>
  );
}

function normalizeAppSettings(app: AppSettingsTarget): AppSettingsFormValues {
  return {
    appKey: app.appKey ?? undefined,
    downloadUrl: app.downloadUrl ?? undefined,
    ignoreBuildTime: app.ignoreBuildTime ?? undefined,
    name: app.name ?? '',
    status: app.status === 'paused' ? 'paused' : 'normal',
  };
}
