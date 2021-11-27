import { Button, Form, Input, message, Row } from "antd";
import md5 from "md5";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { Link } from "react-router-dom";
import logo from "../assets/logo.svg";
import request from "../request";
import store from "../store";
import { isPasswordValid } from "../utils";

const state = observable.object({ loading: false });

async function submit(values: { [key: string]: string }) {
  delete values.pwd2;
  values.pwd = md5(values.pwd);
  runInAction(() => (state.loading = true));
  store.email = values.email;
  try {
    await request("post", "user/register", values);
    store.history.replace("/welcome");
  } catch (_) {
    message.error("This email is already registered");
  }
  runInAction(() => (state.loading = false));
}

export default observer(() => {
  const { loading } = state;
  return (
    <div style={style.body}>
      <Form style={style.form} onFinish={(values) => submit(values)}>
        <div style={style.logo}>
          <img src={logo} />
          <div style={style.slogan}>Always up to date</div>
        </div>
        <Form.Item name="name" hasFeedback>
          <Input placeholder="Username" size="large" required />
        </Form.Item>
        <Form.Item name="email" hasFeedback>
          <Input placeholder="Email" size="large" type="email" required />
        </Form.Item>
        <Form.Item
          hasFeedback
          name="pwd"
          validateTrigger="onBlur"
          rules={[
            () => ({
              async validator(_, value) {
                if (value && !isPasswordValid(value)) {
                  throw "Use 8 or more characters with a mix of numbers, uppercase and lowercase letters";
                }
              },
            }),
          ]}
        >
          <Input type="password" placeholder="Password" size="large" autoComplete="" required />
        </Form.Item>
        <Form.Item
          hasFeedback
          name="pwd2"
          validateTrigger="onBlur"
          rules={[
            ({ getFieldValue }) => ({
              async validator(_, value) {
                if (getFieldValue("pwd") != value) {
                  throw "Please make sure your passwords match.";
                }
              },
            }),
          ]}
        >
          <Input type="password" placeholder="Confirm password" size="large" autoComplete="" required />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" loading={loading} block>
            Register
          </Button>
        </Form.Item>
        <Form.Item>
          <Row justify="space-between">
            <span />
            <Link to="/login">Sign in？</Link>
          </Row>
        </Form.Item>
      </Form>
    </div>
  );
});

const style: Style = {
  body: { display: "flex", flexDirection: "column", height: "100%" },
  form: { width: 320, margin: "auto", paddingTop: 16, flex: 1 },
  logo: { textAlign: "center", margin: "48px 0" },
  slogan: { marginTop: 16, color: "#00000073", fontSize: 18 },
};
