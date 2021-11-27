import { Card, Steps } from "antd";
import { useRouteMatch } from "react-router-dom";
import SendEmail from "./send-email";
import SetPassword from "./set-password";
import Success from "./success";

const body = {
  "0": <SendEmail />,
  "1": <SetPassword />,
  "3": <Success />,
};

export default () => {
  const { step = "0" } = useRouteMatch().params as { step?: keyof typeof body };
  return (
    <Card style={{ width: 760, margin: "auto" }}>
      <Steps style={{ marginBottom: 48 }} current={Number(step)}>
        <Steps.Step title="Enter your email"></Steps.Step>
        <Steps.Step title="Set up new password"></Steps.Step>
        <Steps.Step title="Password updated"></Steps.Step>
      </Steps>
      {body[step]}
    </Card>
  );
};
