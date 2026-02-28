import { Button, Result } from "antd";

export default function Success() {
  return (
    <Result
      status="success"
      title="Password updated successfully. Please log in again."
      extra={[
        <Button key="login" type="primary" href="/#/login">
          Log in
        </Button>,
      ]}
    />
  );
}
