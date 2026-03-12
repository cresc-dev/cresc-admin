import { Button, Checkbox, Form, Input, message } from 'antd';
import { md5 } from 'hash-wasm';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { setUserEmail } from '@/services/auth';
import { RequestError } from '@/services/request';
import { ReactComponent as Logo } from '../assets/logo.svg';
import { rootRouterPath, router } from '../router';
import { isPasswordValid } from '../utils/helper';

interface RegisterFormValues {
  name: string;
  email: string;
  pwd: string;
  pwd2: string;
  agreed: boolean;
}

export const Register = () => {
  const [form] = Form.useForm<RegisterFormValues>();
  const [loading, setLoading] = useState<boolean>(false);
  const password = Form.useWatch('pwd', form) || '';
  const agreed = Form.useWatch('agreed', form);

  const passwordChecks = [
    {
      key: 'length',
      label: '6-16 characters',
      passed: password.length >= 6 && password.length <= 16,
    },
    {
      key: 'letters',
      label: 'Uppercase and lowercase letters',
      passed: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      key: 'number',
      label: 'At least 1 number',
      passed: /\d/.test(password),
    },
  ];

  async function submit(values: RegisterFormValues) {
    form.setFields([{ name: 'email', errors: [] }]);
    setLoading(true);
    try {
      await api.register({
        email: values.email.trim(),
        name: values.name.trim(),
        pwd: await md5(values.pwd),
      });
      setUserEmail(values.email.trim());
      router.navigate(rootRouterPath.welcome);
    } catch (error) {
      if (error instanceof RequestError && error.status === 409) {
        form.setFields([
          {
            name: 'email',
            errors: [
              error.message || 'This email address is already registered',
            ],
          },
        ]);
        return;
      }

      message.error(
        error instanceof Error
          ? error.message
          : 'Failed to create your account. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={style.body}>
      <div style={style.glow} />
      <Form
        form={form}
        style={style.form}
        layout="vertical"
        requiredMark={false}
        scrollToFirstError
        initialValues={{ agreed: false }}
        onFinish={submit}
      >
        <div style={style.logoBlock}>
          <Logo className="mx-auto h-16 w-auto" />
          <div style={style.eyebrow}>Start your 7-day Pro trial</div>
          <div style={style.title}>Create your Cresc workspace</div>
          <div style={style.slogan}>
            Ship OTA updates, manage releases, and invite your team from one
            clean dashboard.
          </div>
          <div style={style.badgeRow}>
            <span style={style.badge}>No credit card</span>
            <span style={style.badge}>Activation email included</span>
            <span style={style.badge}>Ready in minutes</span>
          </div>
        </div>
        <div style={style.tipCard}>
          Your account will be created immediately, and we will send an
          activation email before you start using Pro features.
        </div>
        <Form.Item
          label="Username"
          name="name"
          hasFeedback
          rules={[
            {
              required: true,
              whitespace: true,
              message: 'Please enter a username',
            },
            { min: 2, message: 'Use at least 2 characters' },
            { max: 32, message: 'Keep it under 32 characters' },
          ]}
        >
          <Input
            placeholder="Your team or personal name"
            size="large"
            autoComplete="username"
          />
        </Form.Item>
        <Form.Item
          label="Email"
          name="email"
          hasFeedback
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email address' },
          ]}
        >
          <Input
            placeholder="you@company.com"
            size="large"
            type="email"
            autoComplete="email"
          />
        </Form.Item>
        <Form.Item
          label="Password"
          hasFeedback
          name="pwd"
          validateTrigger="onBlur"
          extra={
            <div style={style.passwordChecklist}>
              {passwordChecks.map((item) => (
                <div
                  key={item.key}
                  style={{
                    ...style.passwordCheckItem,
                    color: password
                      ? item.passed
                        ? '#0f766e'
                        : '#6b7280'
                      : '#94a3b8',
                  }}
                >
                  <span>{item.passed ? '[x]' : '[ ]'}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          }
          rules={[
            { required: true, message: 'Please create a password' },
            () => ({
              async validator(_, value: string) {
                if (value && !isPasswordValid(value)) {
                  throw Error(
                    'Password must include uppercase and lowercase letters, at least 1 number, and be 6-16 characters long',
                  );
                }
              },
            }),
          ]}
        >
          <Input
            type="password"
            placeholder="Create a strong password"
            size="large"
            autoComplete="new-password"
          />
        </Form.Item>
        <Form.Item
          label="Confirm password"
          hasFeedback
          name="pwd2"
          dependencies={['pwd']}
          validateTrigger="onBlur"
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              async validator(_, value: string) {
                if (value && getFieldValue('pwd') !== value) {
                  throw Error('The passwords do not match');
                }
              },
            }),
          ]}
        >
          <Input
            type="password"
            placeholder="Confirm password"
            size="large"
            autoComplete="new-password"
          />
        </Form.Item>
        <Form.Item
          name="agreed"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value
                  ? Promise.resolve()
                  : Promise.reject(
                      Error(
                        'Please read and accept the User Service Agreement and Privacy Policy to continue',
                      ),
                    ),
            },
          ]}
        >
          <Checkbox>
            I have read and agree to the{' '}
            <a
              target="_blank"
              href="https://cresc.dev/policy/"
              rel="noreferrer"
            >
              User Service Agreement and Privacy Policy
            </a>
          </Checkbox>
        </Form.Item>
        <Form.Item style={style.submitRow}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            disabled={loading || !agreed}
            block
          >
            Create account
          </Button>
        </Form.Item>
        <div style={style.footer}>
          <span style={style.footerText}>Already have an account?</span>
          <Link to="/login">Log in</Link>
        </div>
      </Form>
    </div>
  );
};

export const Component = Register;

const style: Record<string, CSSProperties> = {
  body: {
    position: 'relative',
    display: 'flex',
    minHeight: '100%',
    padding: '32px 16px',
    background:
      'radial-gradient(circle at top, #e9f7f2 0%, #f7f3ec 42%, #fcfbf8 100%)',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    inset: 'auto -120px -160px auto',
    width: 320,
    height: 320,
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(15, 118, 110, 0.18) 0%, rgba(15, 118, 110, 0) 72%)',
    pointerEvents: 'none',
  },
  form: {
    position: 'relative',
    width: '100%',
    maxWidth: 440,
    margin: 'auto',
    padding: 28,
    borderRadius: 24,
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: 'rgba(255, 255, 255, 0.94)',
    boxShadow: '0 24px 64px rgba(15, 23, 42, 0.10)',
    backdropFilter: 'blur(12px)',
  },
  logoBlock: {
    textAlign: 'center',
    marginBottom: 24,
  },
  eyebrow: {
    marginTop: 18,
    color: '#0f766e',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 10,
    color: '#0f172a',
    fontSize: 30,
    fontWeight: 700,
    lineHeight: 1.15,
  },
  slogan: {
    marginTop: 12,
    color: '#475569',
    fontSize: 15,
    lineHeight: 1.6,
  },
  badgeRow: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  badge: {
    padding: '6px 10px',
    borderRadius: 999,
    background: '#ecfdf5',
    color: '#0f766e',
    fontSize: 12,
    fontWeight: 600,
  },
  tipCard: {
    marginBottom: 20,
    padding: '12px 14px',
    borderRadius: 14,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    color: '#475569',
    fontSize: 13,
    lineHeight: 1.6,
  },
  passwordChecklist: {
    display: 'grid',
    gap: 4,
    marginTop: 4,
  },
  passwordCheckItem: {
    display: 'flex',
    gap: 8,
    fontSize: 12,
    lineHeight: 1.5,
  },
  submitRow: {
    marginTop: 8,
    marginBottom: 16,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    color: '#64748b',
    fontSize: 14,
  },
  footerText: {
    color: '#64748b',
  },
};
