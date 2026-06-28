import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { rootRouterPath } from '@/router';

export default function Success() {
  const { t } = useTranslation();
  return (
    <Result
      status="success"
      title={t('reset_password.password_updated')}
      extra={[
        <Link key="login" to={rootRouterPath.login} replace>
          <Button type="primary">{t('reset_password.login_button')}</Button>
        </Link>,
      ]}
    />
  );
}
