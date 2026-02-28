import { api } from "@/services/api";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, Result, message } from "antd";
import { useState } from "react";

export default function SendEmail() {
  const [sent, setSent] = useState<boolean>(false);
  const { mutateAsync: sendEmail, isPending } = useMutation({
    mutationFn: (email: string) => api.resetpwdSendMail({ email }),
    onSuccess: () => {
      message.info("Reset email sent. Please check your inbox.");
    },
    onError: () => {
      message.error("Failed to send reset email.");
    },
  });

  if (sent) {
    return (
      <Result
        status="success"
        title="A verification email has been sent. Click the link in the email to continue."
        subTitle="The verification link is valid for 24 hours."
      />
    );
  }
  return (
    <Form
      className="w-80 mx-auto"
      onFinish={async (values: { email: string }) => {
        const email = values?.email;
        await sendEmail(email);
        setSent(true);
      }}
    >
      <Form.Item
        name="email"
        rules={[{ type: "email", message: "Please enter a valid email" }]}
      >
        <Input placeholder="Enter your email" type="email" required />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={isPending} block>
          Send email
        </Button>
      </Form.Item>
    </Form>
  );
}

export const Component = SendEmail;
