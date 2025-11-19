import { Button, Checkbox, Form, Input, message, Row } from 'antd';
import { md5 } from 'hash-wasm';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { setUserEmail } from '@/services/auth';
import { ReactComponent as Logo } from '../assets/logo.svg';
import { rootRouterPath, router } from '../router';
import { isPasswordValid } from '../utils/helper';

export const Register = () => {
  const [loading, setLoading] = useState<boolean>(false);

  async function submit(values: { [key: string]: string }) {
    delete values.pwd2;
    delete values.agreed;
    values.pwd = await md5(values.pwd);
    setLoading(true);
    try {
      await api.register(values);
      setUserEmail(values.email);
      router.navigate(rootRouterPath.welcome);
    } catch (_) {
      message.error('This email has already been registered');
    }
    setLoading(false);
  }

  return (
    <div style={style.body}>
      <Form style={style.form} onFinish={(values) => submit(values)}>
        <div style={style.logo}>
          <Logo className="mx-auto" />
          <div style={style.slogan}>
            Blazing Fast Hot Update for React Native
          </div>
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
              async validator(_, value: string) {
                if (value && !isPasswordValid(value)) {
                  throw 'The password must contain uppercase and lowercase letters and numbers, and be at least 6 characters long';
                }
              },
            }),
          ]}
        >
          <Input
            type="password"
            placeholder="Password"
            size="large"
            autoComplete=""
            required
          />
        </Form.Item>
        <Form.Item
          hasFeedback
          name="pwd2"
          validateTrigger="onBlur"
          rules={[
            ({ getFieldValue }) => ({
              async validator(_, value: string) {
                if (getFieldValue('pwd') !== value) {
                  throw 'The passwords you entered do not match';
                }
              },
            }),
          ]}
        >
          <Input
            type="password"
            placeholder="Enter the password again"
            size="large"
            autoComplete=""
            required
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
          >
            Register
          </Button>
        </Form.Item>
        <Form.Item>
          <Row justify="space-between">
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
                            'Please read and agree to the terms before checking here',
                          ),
                        ),
                },
              ]}
              hasFeedback
              noStyle
            >
              <Checkbox>
                <span>
                  I have read and agree to
                  <a
                    target="_blank"
                    href="https://pushy.reactnative.cn/agreement/"
                    rel="noreferrer"
                  >
                    User Agreement
                  </a>
                </span>
              </Checkbox>
            </Form.Item>
            <span />
            <Link to="/login">Already have an account?</Link>
          </Row>
        </Form.Item>
      </Form>
    </div>
  );
};

export const Component = Register;

const style: Style = {
  body: { display: 'flex', flexDirection: 'column', height: '100%' },
  form: { width: 320, margin: 'auto', paddingTop: 16, flex: 1 },
  logo: { textAlign: 'center', margin: '48px 0' },
  slogan: { marginTop: 16, color: '#00000073', fontSize: 18 },
};
