import { api } from "@/services/api";
import { getUserEmail } from "@/services/auth";
import { useMutation } from "@tanstack/react-query";
import { Button, Result, message } from "antd";
import { useEffect } from "react";
import { rootRouterPath, router } from "../router";

export const Welcome = () => {
  useEffect(() => {
    if (!getUserEmail()) {
      router.navigate(rootRouterPath.login);
    }
  }, []);

  const { mutate: sendEmail, isPending } = useMutation({
    mutationFn: () => api.sendEmail({ email: getUserEmail() }),
    onSuccess: () => {
      message.info("Email sent successfully, please check your inbox");
    },
    onError: () => {
      message.error("Email sending failed");
    },
  });

  return (
    <Result
      title={
        <>
          Thank you for your attention to the hot update service provided by React Native Chinese Website
          <br />
          We have sent an activation email to your email address
          <br />
          Please click the activation link in the email to activate your account
          <div className="h-6" />
        </>
      }
      subTitle="If you do not receive the activation email, please click"
      extra={
        <Button type="primary" onClick={() => sendEmail()} loading={isPending}>
          Resend
        </Button>
      }
    />
  );
};

export const Component = Welcome;
