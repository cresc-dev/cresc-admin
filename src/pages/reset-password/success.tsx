import { Button, Result } from "antd";

export default () => (
  <Result
    status="success"
    title="Password updated, please sign in again."
    extra={[
      <Button key="login" type="primary" href="/login">
        Sign in
      </Button>,
    ]}
  />
);
