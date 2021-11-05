import { Button, message, Result } from "antd";
import { observable } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import request from "../request";
import store from "../store";

const state = observable.object({ loading: false });

export default observer(() => {
  useEffect(() => {
    if (!store.email) {
      store.history.replace("/login");
    }
  }, []);
  return (
    <Result
      title={
        <>
          Thank you for signing up.
          <br />
          We've just sent a mail to {store.email} for verification.
          <br />
          Please click the link in that mail to activate your account.
          <div style={{ height: 24 }} />
        </>
      }
      subTitle="If you did not receive the mail, please click the Resend button"
      extra={
        <Button type="primary" onClick={sendEmail} loading={state.loading}>
          Resend
        </Button>
      }
    />
  );
});

async function sendEmail() {
  const { email } = store;
  state.loading = true;
  try {
    await request("post", "user/active/sendmail", { email });
    message.info(`The mail has been sent successfully`);
  } catch (_) {
    message.error("Failed to send the verification mail. Please try again.");
  }
  state.loading = false;
}
