import { api } from "@/services/api";
import { LoadingOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Result } from "antd";
import { Link, useLocation } from "react-router-dom";

export const Activate = () => {
  const { search } = useLocation();
  const token = new URLSearchParams(search).get("code") || "";
  const { isLoading, error } = useQuery({
    queryKey: ["activate", token],
    queryFn: () => api.activate({ token }),
    enabled: !!token,
  });
  if (error) {
    return <Result status="error" title={error.message} />;
  }
  if (isLoading) {
    return <Result icon={<LoadingOutlined />} title="Activating, please wait" />;
  }
  return (
    <Result
      status="success"
      title="Activation successful"
      extra={
        <Link to="/login" replace>
          <Button type="primary">Please login</Button>
        </Link>
      }
    />
  );
};

export const Component = Activate;
