import { GithubOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { login, loginWithOAuth, type OAuthProvider } from '@/services/auth';
import { ReactComponent as Logo } from '../assets/logo-h.svg';
import './login.css';

interface LoginFormValues {
  email: string;
  password: string;
}

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
      setOauthProvider(null);
    }
  }

  async function submit(values: LoginFormValues) {
    setLoading(true);
    try {
      await login(values.email.trim(), values.password);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-story" aria-label="Cresc release operations">
          <Logo className="login-logo" />
          <div className="login-story-copy">
            <p className="login-eyebrow">Release control plane</p>
            <h1>Ship React Native updates with fewer moving parts.</h1>
            <p>
              Watch rollout health, package drift, and api access from one
              workspace built for fast release cycles.
            </p>
          </div>
        </section>

        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-header">
            <p className="login-eyebrow">Secure sign in</p>
            <h2 id="login-title">Welcome back</h2>
            <p>Use the same identity your team already trusts.</p>
          </div>

          <div className="login-provider-stack">
            <button
              type="button"
              className="oauth-material-button oauth-material-button-google"
              disabled={
                loading ||
                (oauthProvider !== null && oauthProvider !== 'google')
              }
              aria-busy={oauthProvider === 'google'}
              onClick={() => void startOAuth('google')}
            >
              <div className="oauth-material-button-state" />
              <div className="oauth-material-button-content-wrapper">
                <div className="oauth-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="oauth-material-button-contents">
                  {oauthProvider === 'google'
                    ? 'Signing in with Google'
                    : 'Sign in with Google'}
                </span>
                <span style={{ display: 'none' }}>Sign in with Google</span>
              </div>
            </button>
            <button
              type="button"
              className="oauth-material-button oauth-material-button-github"
              disabled={
                loading ||
                (oauthProvider !== null && oauthProvider !== 'github')
              }
              aria-busy={oauthProvider === 'github'}
              onClick={() => void startOAuth('github')}
            >
              <div className="oauth-material-button-state" />
              <div className="oauth-material-button-content-wrapper">
                <div className="oauth-material-button-icon">
                  <GithubOutlined />
                </div>
                <span className="oauth-material-button-contents">
                  {oauthProvider === 'github'
                    ? 'Signing in with GitHub'
                    : 'Sign in with GitHub'}
                </span>
              </div>
            </button>
          </div>

          <Divider plain className="login-divider">
            Password login
          </Divider>

          <Form<LoginFormValues>
            layout="vertical"
            requiredMark={false}
            onFinish={submit}
            className="login-form"
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                {
                  type: 'email',
                  message: 'Please enter a valid email address',
                },
              ]}
            >
              <Input
                placeholder="you@company.com"
                size="large"
                type="email"
                prefix={<MailOutlined />}
                autoComplete="email"
              />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: 'Please enter your password' },
              ]}
            >
              <Input.Password
                placeholder="Your password"
                size="large"
                prefix={<LockOutlined />}
                autoComplete="current-password"
              />
            </Form.Item>
            <Form.Item className="login-submit">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                disabled={Boolean(oauthProvider)}
                block
              >
                Log in with password
              </Button>
            </Form.Item>
          </Form>

          <div className="login-links">
            <Link to="/register">Create account</Link>
            <Link to="/reset-password/0">Forgot password?</Link>
          </div>
        </section>
      </div>
    </main>
  );
};

export const Component = Login;
