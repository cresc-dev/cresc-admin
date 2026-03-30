import { Layout, Typography } from 'antd';

export default () => (
  <Layout.Footer className="text-center">
    <Typography.Paragraph type="secondary">
      cresc.dev © {new Date().getFullYear()} CHARMLOT PTE. LTD.
    </Typography.Paragraph>
  </Layout.Footer>
);
