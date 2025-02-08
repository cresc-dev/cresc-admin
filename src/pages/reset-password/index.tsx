import { Card, Steps } from "antd";
import { useParams } from "react-router-dom";
import SendEmail from "./components/send-email";
import SetPassword from "./components/set-password";
import Success from "./components/success";

const body = {
  "0": <SendEmail />,
  "1": <SetPassword />,
  "3": <Success />,
};

export const ResetPassword = () => {
  const { step = "0" } = useParams() as { step?: keyof typeof body };
  return (
    <Card className="w-max mx-auto">
      <Steps className="mb-12" current={Number(step)}>
        <Steps.Step title="Enter your email" />
        <Steps.Step title="Set a new password" />
        <Steps.Step title="Success" />
      </Steps>
      {body[step]}
    </Card>
  );
};

export const Component = ResetPassword;
