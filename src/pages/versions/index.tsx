import { DeleteFilled, SettingFilled } from "@ant-design/icons";
import { Breadcrumb, Button, Col, Layout, Row, Tabs, Tag } from "antd";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import "./index.css";
import PackageList from "./packages";
import state, { fetch } from "./state";
import VersionTable from "./versions";
import { removeApp } from "../apps/state";
import settingApp from "../apps/setting";

export default observer(() => {
  const id = Reflect.get(useParams(), "id");
  useEffect(() => fetch(id));
  const { app, packages, unused } = state;
  if (app == null) return null;
  return (
    <>
      <Row style={{ marginBottom: 16 }}>
        <Col flex={1}>
          <Breadcrumb>
            <Breadcrumb.Item>
              <Link to="/apps">Apps</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              {app?.name}
              {app?.status == "paused" && <Tag style={{ marginLeft: 8 }}>Pause</Tag>}
            </Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Button.Group>
          <Button
            size="small"
            type="primary"
            icon={<DeleteFilled />}
            onClick={() => removeApp(app)}
            danger
          >
            Remove
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<SettingFilled />}
            onClick={() => settingApp(app)}
          >
            Settings
          </Button>
        </Button.Group>
      </Row>
      <Layout>
        <Layout.Sider theme="light" style={style.sider} width={240}>
          <div className="ant-table-title" style={style.title}>
            Native Package
          </div>
          <Tabs>
            <Tabs.TabPane tab="All" key="all">
              <PackageList dataSource={packages} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Unused" key="unused">
              <PackageList dataSource={unused} />
            </Tabs.TabPane>
          </Tabs>
        </Layout.Sider>
        <Layout.Content style={{ padding: 0 }}>
          <VersionTable />
        </Layout.Content>
      </Layout>
    </>
  );
});

const style: Style = {
  sider: { marginRight: 16, padding: 16, paddingTop: 0, height: "100%" },
  title: { paddingLeft: 0, paddingRight: 0 },
};
