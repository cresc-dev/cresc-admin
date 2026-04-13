import { GithubOutlined, GoogleOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, Row } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { login, loginWithOAuth, type OAuthProvider } from '@/services/auth';
import { ReactComponent as Logo } from '../assets/logo.svg';

let email: string;
let password: string;

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(
    null,
  );

  async function startOAuth(provider: OAuthProvider) {
    setOauthProvider(provider);
    try {
      await loginWithOAuth(provider);
    } catch {
      // The auth service already shows the user-facing error.
    } finally {
      setOauthProvider(null);
    }
  }

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
          <Logo className="mx-auto h-16 w-auto" />
          <div style={style.slogan}>
            Blazing-fast OTA updates for React Native
          </div>
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
            disabled={Boolean(oauthProvider)}
            block
          >
            Log in
          </Button>
        </Form.Item>
        <Divider plain style={style.divider}>
          Or continue with
        </Divider>
        <Form.Item>
          <Button
            size="large"
            block
            icon={<GoogleOutlined />}
            loading={oauthProvider === 'google'}
            disabled={loading || oauthProvider === 'github'}
            onClick={() => void startOAuth('google')}
          >
            Continue with Google
          </Button>
        </Form.Item>
        <Form.Item>
          <Button
            size="large"
            block
            icon={<GithubOutlined />}
            loading={oauthProvider === 'github'}
            disabled={loading || oauthProvider === 'google'}
            onClick={() => void startOAuth('github')}
          >
            Continue with GitHub
          </Button>
        </Form.Item>
        <Form.Item>
          <Row justify="space-between">
            <Link to="/register">Create account</Link>
            <Link to="/reset-password/0">Forgot password?</Link>
          </Row>
        </Form.Item>
      </form>
    </div>
  );
};

export const Component = Login;

const style: Style = {
  body: { display: 'flex', flexDirection: 'column', height: '100%' },
  form: { width: 320, margin: 'auto', paddingTop: 16, flex: 1 },
  logo: { textAlign: 'center', margin: '48px 0' },
  slogan: { marginTop: 16, color: '#00000073', fontSize: 18 },
  divider: { margin: '20px 0' },
};
