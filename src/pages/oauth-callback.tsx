import { Button, Result, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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

    setError(params.get('error') || t('oauth_callback.default_error'));
  }, [search, t]);

  if (!error) {
    return (
      <div style={style.loadingWrap}>
        <Spin size="large" tip={t('oauth_callback.signing_in')} />
      </div>
    );
  }

  return (
    <div style={style.resultWrap}>
      <Result
        status="error"
        title={t('oauth_callback.login_failed')}
        subTitle={error}
        extra={
          <Button type="primary" onClick={() => router.navigate(loginUrl)}>
            {t('oauth_callback.back_login')}
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
