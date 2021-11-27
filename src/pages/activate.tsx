import { LoadingOutlined } from "@ant-design/icons";
import { Button, Result } from "antd";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import request, { RequestError } from "../request";

const state = observable.object({ loading: true, error: "" });

export default observer(() => {
  const { search } = useLocation();
  const token = new URLSearchParams(search).get("code");
  useEffect(() => {
    request("post", "user/active", { token })
      .then(() => runInAction(() => (state.loading = false)))
      .catch(({ message }: RequestError) =>
        runInAction(() => (state.error = message ?? "Activation failed"))
      );
  }, []);
  if (state.error) {
    return <Result status="error" title={state.error} />;
  }
  if (state.loading) {
    return <Result icon={<LoadingOutlined />} title="Activating..." />;
  }
  return (
    <Result
      status="success"
      title="Activated"
      extra={
        <Link to="/login" replace>
          <Button type="primary" loading={state.loading}>
            Sign in now
          </Button>
        </Link>
      }
    />
  );
});
