import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Result } from 'antd';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { setToken } from '@/services/request';

export const Activate = () => {
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

    setToken('');
    router.navigate(rootRouterPath.user, { replace: true });
  }, [isSuccess]);

  if (error) {
    return <Result status="error" title={error.message} />;
  }
  if (isLoading) {
    return (
      <Result icon={<LoadingOutlined />} title="Activating your account..." />
    );
  }
  return (
    <Result
      status="success"
      title="Activation successful"
      subTitle="Redirecting to log in..."
      extra={
        <Link to="/login" replace>
          <Button type="primary">Go to log in</Button>
        </Link>
      }
    />
  );
};

export const Component = Activate;
