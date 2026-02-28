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
      message.info("Activation email sent. Please check your inbox.");
    },
    onError: () => {
      message.error("Failed to send activation email.");
    },
  });

  return (
    <Result
      title={
        <>
          Thanks for choosing Cresc hot updates for React Native.
          <br />
          We have sent an activation email to your address.
          <br />
          Click the activation link in the email to activate your account.
          <div className="h-6" />
        </>
      }
      subTitle="Didn't receive the activation email?"
      extra={
        <Button type="primary" onClick={() => sendEmail()} loading={isPending}>
          Resend email
        </Button>
      }
    />
  );
};

export const Component = Welcome;
