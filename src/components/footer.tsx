import { Layout, Typography } from "antd";

export default () => (
  <Layout.Footer style={style.footer}>
    <Typography.Paragraph type="secondary">
      cresc.dev © {new Date().getFullYear()} CHARMLOT PTE. LTD.
    </Typography.Paragraph>
  </Layout.Footer>
);

const style: Style = {
  footer: { textAlign: "center", paddingBottom: 0, background: "none" },
};
