import { login } from "@/services/auth";
import { Button, Form, Input, Row } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ReactComponent as Logo } from "../assets/logo.svg";

let email: string;
let password: string;

export const Login = () => {
  const [loading, setLoading] = useState(false);
  return (
    <div style={style.body}>
      <form
        style={style.form}
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          await login(email, password);
          setLoading(false);
        }}
      >
        <div style={style.logo}>
          <Logo className="mx-auto" />
          <div style={style.slogan}>Blazing Fast Hot Update for React Native</div>
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
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            block
          >
            Login
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
};

export const Component = Login;

const style: Style = {
  body: { display: "flex", flexDirection: "column", height: "100%" },
  form: { width: 320, margin: "auto", paddingTop: 16, flex: 1 },
  logo: { textAlign: "center", margin: "48px 0" },
  slogan: { marginTop: 16, color: "#00000073", fontSize: 18 },
};
