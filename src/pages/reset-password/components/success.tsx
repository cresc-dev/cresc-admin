import { Button, Result } from "antd";

export default function Success() {
  return (
    <Result
      status="success"
      title="Password set successfully, please log in again"
      extra={[
        <Button key="login" type="primary" href="/#/login">
          Login
        </Button>,
      ]}
    />
  );
}
