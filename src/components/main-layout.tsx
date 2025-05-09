import { logout } from "@/services/auth";
import { useUserInfo } from "@/utils/hooks";
import {
  CommentOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  ReadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Row, message } from "antd";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import Footer from "./footer";
import Sider from "./sider";

const MainLayout = () => {
  const { user } = useUserInfo();
  return (
    <Layout>
      <Sider />
      <Layout>
        <Layout.Header style={style.header}>
          <Row className="h-full" justify="end">
            <Menu mode="horizontal" selectable={false}>
              <Menu.Item key="issues" icon={<CommentOutlined />}>
                <ExtLink href="https://github.com/reactnativecn/react-native-pushy/issues">
                  Discussion
                </ExtLink>
              </Menu.Item>
              <Menu.Item key="document" icon={<ReadOutlined />}>
                <ExtLink href="https://pushy.reactnative.cn/docs/getting-started.html">
                  Documentation
                </ExtLink>
              </Menu.Item>
              <Menu.Item key="about" icon={<InfoCircleOutlined />}>
                <ExtLink href="https://reactnative.cn/about.html">
                  About Us
                </ExtLink>
              </Menu.Item>
              {user && (
                <Menu.SubMenu
                  key="user"
                  icon={<UserOutlined />}
                  title={user.name}
                >
                  <Menu.Item
                    key="logout"
                    onClick={() => {
                      logout();
                      message.info("You have logged out");
                    }}
                    icon={<LogoutOutlined />}
                  >
                    Logout
                  </Menu.Item>
                </Menu.SubMenu>
              )}
            </Menu>
          </Row>
        </Layout.Header>
        <Layout.Content id="main-body" style={style.body}>
          <div className="h-full">
            <Outlet />
          </div>
          <Footer />
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

interface ExtLinkProps {
  children: ReactNode;
  href: string;
}

const ExtLink = ({ children, href }: ExtLinkProps) => (
  <a
    href={href}
    target="_blank"
    onClick={(e) => e.stopPropagation()}
    rel="noreferrer"
  >
    {children}
  </a>
);

const style: Style = {
  header: {
    background: "#fff",
    height: 48,
    lineHeight: "46px",
    boxShadow: "2px 1px 4px rgba(0, 21, 41, 0.08)",
    zIndex: 1,
  },
  body: {
    overflow: "auto",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    paddingBottom: 0,
  },
};
