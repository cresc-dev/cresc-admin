import { SettingFilled } from '@ant-design/icons';
import {
  Breadcrumb,
  Button,
  Col,
  Form,
  Grid,
  Layout,
  Modal,
  message,
  Row,
  Space,
  Tabs,
  Tag,
} from 'antd';

import { Link, useParams } from 'react-router-dom';
import './manage.css';

import { useEffect } from 'react';
import PlatformIcon from '@/components/platform-icon';
import { api } from '@/services/api';
import { useApp } from '@/utils/hooks';
import PackageList from './components/package-list';
import SettingModal from './components/setting-modal';
import VersionTable from './components/version-table';
import { ManageProvider, useManageContext } from './hooks/useManageContext';

const ManageDashBoard = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { packages, unusedPackages, packagesLoading } = useManageContext();
  const packageTabItems = [
    {
      key: 'all',
      label: 'All',
      children: <PackageList dataSource={packages} loading={packagesLoading} />,
    },
    {
      key: 'unused',
      label: 'Unused',
      children: (
        <PackageList dataSource={unusedPackages} loading={packagesLoading} />
      ),
    },
  ];

  if (isMobile) {
    return (
      <Tabs
        defaultActiveKey="versions"
        size="small"
        items={[
          {
            key: 'versions',
            label: 'OTA Versions',
            children: <VersionTable />,
          },
          {
            key: 'packages',
            label: 'Native Packages',
            children: (
              <div className="rounded-lg bg-white px-4 pb-4 pt-1">
                <Tabs
                  defaultActiveKey="all"
                  size="small"
                  items={packageTabItems}
                />
              </div>
            ),
          },
        ]}
      />
    );
  }

  return (
    <Layout>
      <Layout.Sider
        theme="light"
        className="p-4 pt-0 h-full rounded-lg"
        width={240}
        style={{ marginRight: 16, maxWidth: '100%' }}
      >
        <div className="py-4">Native Packages</div>
        <Tabs size="middle" items={packageTabItems} />
      </Layout.Sider>
      <Layout.Content className="!p-0" style={{ minWidth: 0 }}>
        <VersionTable />
      </Layout.Content>
    </Layout>
  );
};

export const Manage = () => {
  const [modal, contextHolder] = Modal.useModal();
  const screens = Grid.useBreakpoint();
  const params = useParams<{ id?: string }>();
  const id = Number(params.id!);
  const { app } = useApp(id);
  const [form] = Form.useForm<App>();
  useEffect(() => {
    if (app) {
      form.setFieldsValue(app);
    }
  }, [app, form]);

  return (
    <Form layout="vertical" form={form} initialValues={app}>
      <Row className="mb-4 flex-col gap-3 md:flex-row md:items-center">
        <Col flex={1} className="min-w-0">
          <Breadcrumb
            items={[
              {
                title: <Link to="/apps">Apps</Link>,
              },
              {
                title: (
                  <span className="inline-flex max-w-full items-center gap-1">
                    <PlatformIcon platform={app?.platform} className="mr-1" />
                    <span className="max-w-[160px] truncate md:max-w-none">
                      {app?.name}
                    </span>
                    {app?.status === 'paused' && (
                      <Tag className="ml-2">Paused</Tag>
                    )}
                  </span>
                ),
              },
            ]}
          />
        </Col>
        <Space.Compact
          direction={!screens.md ? 'vertical' : 'horizontal'}
          className="w-full md:w-auto"
        >
          <Button
            type="primary"
            icon={<SettingFilled />}
            className="w-full md:w-auto"
            onClick={() => {
              modal.confirm({
                icon: null,
                closable: true,
                maskClosable: true,
                width: !screens.md ? 'calc(100vw - 32px)' : 520,
                content: <SettingModal />,
                async onOk() {
                  try {
                    await api.updateApp(id, {
                      name: form.getFieldValue('name') as string,
                      downloadUrl: form.getFieldValue('downloadUrl') as string,
                      status: form.getFieldValue('status') as
                        | 'normal'
                        | 'paused',
                      ignoreBuildTime: form.getFieldValue('ignoreBuildTime') as
                        | 'enabled'
                        | 'disabled',
                    });
                  } catch (e) {
                    message.error((e as Error).message);
                    return;
                  }
                  message.success('Settings updated');
                },
              });
            }}
          >
            App Settings
          </Button>
        </Space.Compact>
      </Row>
      <ManageProvider appId={id} app={app}>
        {contextHolder}
        <ManageDashBoard />
      </ManageProvider>
    </Form>
  );
};
export const Component = Manage;
