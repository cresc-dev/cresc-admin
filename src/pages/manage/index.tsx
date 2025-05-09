import { SettingFilled } from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Col,
  Form,
  Layout,
  Modal,
  Row,
  Space,
  Tabs,
  Tag,
  message,
} from "antd";

import { Link, useParams } from "react-router-dom";
import "./manage.css";

import { api } from "@/services/api";
import { useApp } from "@/utils/hooks";
import { useEffect } from "react";
import PackageList from "./components/package-list";
import SettingModal from "./components/setting-modal";
import VersionTable from "./components/version-table";
import { ManageProvider, useManageContext } from "./hooks/useManageContext";
import PlatformIcon from "@/components/platform-icon";

const ManageDashBoard = () => {
  const { packages, unusedPackages, packagesLoading } = useManageContext();
  return (
    <Layout>
      <Layout.Sider
        theme="light"
        className="p-4 pt-0 mr-4 h-full rounded-lg"
        width={240}
      >
        <div className="py-4">Native Packages</div>
        <Tabs>
          <Tabs.TabPane tab="All" key="all">
            <PackageList dataSource={packages} loading={packagesLoading} />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Unused" key="unused">
            <PackageList
              dataSource={unusedPackages}
              loading={packagesLoading}
            />
          </Tabs.TabPane>
        </Tabs>
      </Layout.Sider>
      <Layout.Content className="!p-0">
        <VersionTable />
      </Layout.Content>
    </Layout>
  );
};

export const Manage = () => {
  const [modal, contextHolder] = Modal.useModal();
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
      <Row className="mb-4">
        <Col flex={1}>
          <Breadcrumb>
            <Breadcrumb.Item>
              <Link to="/apps">App List</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <PlatformIcon platform={app?.platform} className="mr-1" />
              {app?.name}
              {app?.status === "paused" && <Tag className="ml-2">Paused</Tag>}
            </Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Space.Compact>
          <Button
            type="primary"
            icon={<SettingFilled />}
            onClick={() => {
              modal.confirm({
                icon: null,
                closable: true,
                maskClosable: true,
                content: <SettingModal />,
                async onOk() {
                  try {
                    await api.updateApp(id, {
                      name: form.getFieldValue("name") as string,
                      downloadUrl: form.getFieldValue("downloadUrl") as string,
                      status: form.getFieldValue("status") as
                        | "normal"
                        | "paused",
                      ignoreBuildTime: form.getFieldValue("ignoreBuildTime") as
                        | "enabled"
                        | "disabled",
                    });
                  } catch (e) {
                    message.error((e as Error).message);
                    return;
                  }
                  message.success("Successfully updated");
                },
              });
            }}
          >
            App Settings
          </Button>
        </Space.Compact>
      </Row>
      <ManageProvider appId={id}>
        {contextHolder}
        <ManageDashBoard />
      </ManageProvider>
    </Form>
  );
};
export const Component = Manage;
