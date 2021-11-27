import { Button, Result } from "antd";
import store from "../../store";

export default () => (
  <Result
    status="success"
    title="Password updated, please sign in again."
    extra={[
      <Button key="login" type="primary" onClick={() => store.history.push("/login")}>
        Sign in
      </Button>,
    ]}
  />
);
