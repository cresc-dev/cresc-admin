import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Result } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { clearSession } from '@/services/request';

export const Activate = () => {
  const { t } = useTranslation();
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('code') || '';
  const { isLoading, error, isSuccess } = useQuery({
    queryKey: ['activate', token],
    queryFn: () => api.activate({ token }),
    enabled: !!token,
  });

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    clearSession();
    router.navigate(rootRouterPath.user, { replace: true });
  }, [isSuccess]);

  if (error) {
    return <Result status="error" title={error.message} />;
  }
  if (isLoading) {
    return (
      <Result icon={<LoadingOutlined />} title={t('activate.activating')} />
    );
  }
  return (
    <Result
      status="success"
      title={t('activate.success')}
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
