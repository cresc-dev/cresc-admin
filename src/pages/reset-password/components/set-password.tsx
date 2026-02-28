import { Button, Form, Input, message } from 'antd';
import { md5 } from 'hash-wasm';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import { rootRouterPath, router } from '../../../router';
import { isPasswordValid } from '../../../utils/helper';

export default function SetPassword() {
  const { search } = useLocation();
  const [loading, setLoading] = useState<boolean>(false);
  return (
    <Form
      className="m-auto w-80"
      onFinish={async (values: { newPwd: string; pwd2: string }) => {
        setLoading(true);
        try {
          await api.resetPwd({
            token: new URLSearchParams(search).get('code') ?? '',
            newPwd: await md5(values.newPwd),
          });
          router.navigate(rootRouterPath.resetPassword('3'));
        } catch (e) {
          console.log(e);
          message.error((e as Error).message ?? 'Network error');
        }
        setLoading(false);
      }}
    >
      <Form.Item
        hasFeedback
        name="newPwd"
        // validateTrigger='onBlur'
        rules={[
          () => ({
            validator(_, value: string) {
              if (value && !isPasswordValid(value)) {
                return Promise.reject(
                  Error(
                    'Password must include uppercase and lowercase letters, numbers, and be at least 6 characters long',
                  ),
                );
              }
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input
          type="password"
          placeholder="New Password"
          autoComplete=""
          required
        />
      </Form.Item>
      <Form.Item
        hasFeedback
        name="pwd2"
        // validateTrigger='onBlur'
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value: string) {
              if (getFieldValue('newPwd') !== value) {
                return Promise.reject(
                  Error('The passwords do not match'),
                );
              }
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input
          type="password"
          placeholder="Confirm new password"
          autoComplete=""
          required
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Save new password
        </Button>
      </Form.Item>
    </Form>
  );
}

export const Component = SetPassword;
