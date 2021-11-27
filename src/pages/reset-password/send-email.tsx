import { Button, Form, Input, message, Result } from "antd";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import request, { RequestError } from "../../request";

const state = observable.object({ loading: false, sent: false });

export default observer(() => {
  if (state.sent) {
    return (
      <Result
        status="success"
        title={`We've sent a password reset email to your mailbox. 
        Please click the link in that email to reset your password.`}
        subTitle="The reset link expires in 24 hours."
      />
    );
  }
  return (
    <Form
      style={{ width: 320, margin: "auto" }}
      onFinish={async (values) => {
        runInAction(() => (state.loading = true));
        try {
          await request("post", "user/resetpwd/sendmail", values);
          runInAction(() => (state.sent = true));
        } catch (e) {
          message.error((e as RequestError).message ?? "Network error");
        }
        runInAction(() => (state.loading = false));
      }}
    >
      <Form.Item name="email">
        <Input placeholder="Enter your email" type="email" required />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={state.loading} block>
          Send me the reset link
        </Button>
      </Form.Item>
    </Form>
  );
});
