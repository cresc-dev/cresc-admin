import { Button, Form, Input, Row } from "antd";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { FormEvent } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.svg";
import { login } from "../store";

const state = observable.object({ loading: false });

async function submit(event: FormEvent) {
  event.preventDefault();
  runInAction(async () => {
    state.loading = true;
    await login(email, password);
    state.loading = false;
  });
}

let email: string;
let password: string;

export default observer(() => {
  const { loading } = state;
  return (
    <div style={style.body}>
      <form style={style.form} onSubmit={submit}>
        <div style={style.logo}>
          <img src={logo} />
          <div style={style.slogan}>Always up to date</div>
        </div>
        <Form.Item>
          <Input
            placeholder="Email"
            size="large"
            type="email"
            autoComplete=""
            onChange={({ target }) => (email = target.value)}
            required
          />
        </Form.Item>
        <Form.Item>
          <Input
            type="password"
            placeholder="Password"
            size="large"
            autoComplete=""
            onChange={({ target }) => (password = target.value)}
            required
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" loading={loading} block>
            Sign in
          </Button>
        </Form.Item>
        <Form.Item>
          <Row justify="space-between">
            <Link to="/register">Register</Link>
            <Link to="/reset-password/0">Forgot password?</Link>
          </Row>
        </Form.Item>
      </form>
    </div>
  );
});

const style: Style = {
  body: { display: "flex", flexDirection: "column", height: "100%" },
  form: { width: 320, margin: "auto", paddingTop: 16, flex: 1 },
  logo: { textAlign: "center", margin: "48px 0" },
  slogan: { marginTop: 16, color: "#00000073", fontSize: 18 },
};
