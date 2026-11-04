import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Form, Input, message, Result } from 'antd';
import { md5 } from 'hash-wasm';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { RequestError } from '@/services/response';
import { clearSession } from '@/services/session';
import {
  confirmPasswordRule,
  passwordFormatRule,
} from '@/utils/password-rules';

/**
 * The server has the mailbox owner choose a password at activation: a first
 * request without one answers 428, which is what shows the form. An account that
 * is already active answers success and its password stays as it was.
 */
const PASSWORD_REQUIRED = 428;

const Activate = () => {
  const { t } = useTranslation();
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('code') || '';
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);
  const { isLoading, error, data, isSuccess } = useQuery({
    queryKey: ['activate', token],
    queryFn: () => api.activate({ token }),
    enabled: !!token,
    retry: false,
  });
  const done = isSuccess || activated;

  useEffect(() => {
    if (!done) {
      return;
    }

    clearSession();
    router.navigate(rootRouterPath.user, { replace: true });
  }, [done]);

  if (!token) {
    return <Result status="error" title={t('activate.link_invalid')} />;
  }
  const passwordRequired =
    error instanceof RequestError && error.status === PASSWORD_REQUIRED;
  if (error && !passwordRequired) {
    return <Result status="error" title={error.message} />;
  }
  if (isLoading) {
    return (
      <Result icon={<LoadingOutlined />} title={t('activate.activating')} />
    );
  }
  if (passwordRequired && !activated) {
    return (
      <Result
        title={t('activate.set_password_title')}
        subTitle={t('activate.set_password_hint')}
        extra={
          <Form
            className="m-auto w-80"
            onFinish={async (values: { pwd: string; pwd2: string }) => {
              setSubmitting(true);
              try {
                await api.activate({ token, pwd: await md5(values.pwd) });
                setActivated(true);
              } catch (e) {
                message.error((e as Error).message);
              }
              setSubmitting(false);
            }}
          >
            <Form.Item
              hasFeedback
              name="pwd"
              rules={[passwordFormatRule(t('activate.password_rules'))]}
            >
              <Input
                type="password"
                placeholder={t('activate.password_placeholder')}
                autoComplete="new-password"
                required
              />
            </Form.Item>
            <Form.Item
              hasFeedback
              name="pwd2"
              rules={[
                confirmPasswordRule({
                  field: 'pwd',
                  message: t('activate.password_mismatch'),
                  allowEmpty: false,
                }),
              ]}
            >
              <Input
                type="password"
                placeholder={t('activate.confirm_placeholder')}
                autoComplete="new-password"
                required
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                block
              >
                {t('activate.submit_button')}
              </Button>
            </Form.Item>
          </Form>
        }
      />
    );
  }
  return (
    <Result
      status="success"
      title={t(
        data?.alreadyActive ? 'activate.already_active' : 'activate.success',
      )}
      subTitle={t('activate.redirecting')}
      extra={
        <Link to="/login" replace>
          <Button type="primary">{t('activate.go_login')}</Button>
        </Link>
      }
    />
  );
};

export const Component = Activate;
