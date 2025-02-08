import { api } from "@/services/api";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, Result, message } from "antd";
import { useState } from "react";

export default function SendEmail() {
  const [sent, setSent] = useState<boolean>(false);
  const { mutateAsync: sendEmail, isPending } = useMutation({
    mutationFn: (email: string) => api.resetpwdSendMail({ email }),
    onSuccess: () => {
      message.info("Email sent successfully, please check your email");
    },
    onError: () => {
      message.error("Email sending failed");
    },
  });

  if (sent) {
    return (
      <Result
        status="success"
        title="The verification email has been sent to your email, please click the link in the email to complete the operation"
        subTitle="The verification email is valid for 24 hours, please verify it as soon as possible!"
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
          Send Email
        </Button>
      </Form.Item>
    </Form>
  );
}

export const Component = SendEmail;
