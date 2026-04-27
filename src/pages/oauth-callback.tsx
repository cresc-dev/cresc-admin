import { Button, Result, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { rootRouterPath, router } from '@/router';
import { completeLogin } from '@/services/auth';

function buildLoginUrl(loginFrom?: string | null) {
  if (!loginFrom || !loginFrom.startsWith('/') || loginFrom.startsWith('//')) {
    return rootRouterPath.login;
  }
  return `${rootRouterPath.login}?loginFrom=${encodeURIComponent(loginFrom)}`;
}

export const OAuthCallback = () => {
  const { search } = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState(rootRouterPath.login);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    const loginFrom = params.get('loginFrom');

    setLoginUrl(buildLoginUrl(loginFrom));

    if (token) {
      completeLogin(token, loginFrom);
      return;
    }

    setError(params.get('error') || 'Failed to complete social login');
  }, [search]);

  if (!error) {
    return (
      <div style={style.loadingWrap}>
        <Spin size="large" tip="Signing you in..." />
      </div>
    );
  }

  return (
    <div style={style.resultWrap}>
      <Result
        status="error"
        title="Social login failed"
        subTitle={error}
        extra={
          <Button type="primary" onClick={() => router.navigate(loginUrl)}>
            Back to login
          </Button>
        }
      />
    </div>
  );
};

export const Component = OAuthCallback;

const style: Style = {
  loadingWrap: {
    minHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultWrap: {
    minHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
