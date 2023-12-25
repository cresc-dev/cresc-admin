import { Button, Form, Input, message } from "antd";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useLocation } from "react-router-dom";
import request, { RequestError } from "../../request";
import { isPasswordValid } from "../../utils";
import store from "../../store";
import md5 from "blueimp-md5";

const state = observable.object({ loading: false });

export default observer(() => {
  const { search } = useLocation();
  return (
    <Form
      style={{ width: 320, margin: "auto" }}
      onFinish={async (values) => {
        runInAction(() => (state.loading = true));
        try {
          delete values.pwd2;
          values.token = new URLSearchParams(search).get("code");
          values.newPwd = md5(values.newPwd);
          await request("post", "user/resetpwd/reset", values);
          store.history.replace("/reset-password/3");
        } catch (e) {
          console.log(e);
          message.error((e as RequestError).message ?? "Network error");
        }
        runInAction(() => (state.loading = false));
      }}
    >
      <Form.Item
        hasFeedback
        name="newPwd"
        validateTrigger="onBlur"
        rules={[
          () => ({
            async validator(_, value) {
              if (value && !isPasswordValid(value)) {
                throw "Use 8 or more characters with a mix of numbers, uppercase and lowercase letters.";
              }
            },
          }),
        ]}
      >
        <Input type="password" placeholder="New password" autoComplete="" required />
      </Form.Item>
      <Form.Item
        hasFeedback
        name="pwd2"
        validateTrigger="onBlur"
        rules={[
          ({ getFieldValue }) => ({
            async validator(_, value) {
              if (getFieldValue("newPwd") != value) {
                throw "Please make sure your passwords match.";
              }
            },
          }),
        ]}
      >
        <Input type="password" placeholder="Confirm password" autoComplete="" required />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={state.loading} block>
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
});
