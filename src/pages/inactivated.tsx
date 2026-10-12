import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useResendActivationEmail } from '@/pages/auth/use-resend-activation-email';
import { rootRouterPath } from '@/router';

const Inactivated = () => {
  const { t } = useTranslation();
  const { sendEmail, isPending, isCoolingDown, remainingSeconds, captcha } =
    useResendActivationEmail({
      sentMessage: t('inactivated.email_sent'),
      failedMessage: t('inactivated.send_failed'),
    });

  return (
    <Result
      title={t('inactivated.title')}
      subTitle={t('inactivated.no_email')}
      extra={[
        captcha.widget && (
          <div key="captcha" style={{ marginBottom: 16 }}>
            {captcha.widget}
          </div>
        ),
        <Button
          key="resend"
          type="primary"
          onClick={sendEmail}
          loading={isPending}
          disabled={isCoolingDown || !captcha.ready}
        >
          {isCoolingDown
            ? t('inactivated.resend_countdown', { seconds: remainingSeconds })
            : t('inactivated.resend_button')}
        </Button>,
        <Link key="back" to={rootRouterPath.login} replace>
          <Button>{t('inactivated.back_login')}</Button>
        </Link>,
      ]}
    />
  );
};

export const Component = Inactivated;
