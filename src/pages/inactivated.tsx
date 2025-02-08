import { api } from "@/services/api";
import { getUserEmail } from "@/services/auth";
import { useMutation } from "@tanstack/react-query";
import { Button, Result, message } from "antd";
import { useEffect } from "react";
import { rootRouterPath, router } from "../router";

export const Inactivated = () => {
  useEffect(() => {
    if (!getUserEmail()) {
      router.navigate(rootRouterPath.login);
    }
  }, []);
  const { mutate: sendEmail, isPending } = useMutation({
    mutationFn: () => api.sendEmail({ email: getUserEmail() }),
    onSuccess: () => {
      message.info("Email sent successfully, please check your email");
    },
    onError: () => {
      message.error("Email sending failed");
    },
  });
  return (
    <Result
      title="Your account is not activated, please check your email"
      subTitle="If you did not receive the activation email, please click"
      extra={[
        <Button
          key="resend"
          type="primary"
          onClick={() => sendEmail()}
          loading={isPending}
        >
          Resend
        </Button>,
        <Button key="back" href="/user">
          Back to login
        </Button>,
      ]}
    />
  );
};

export const Component = Inactivated;
