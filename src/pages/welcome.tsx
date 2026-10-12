import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { useResendActivationEmail } from '@/pages/auth/use-resend-activation-email';

const Welcome = () => {
  const { t } = useTranslation();
  const { sendEmail, isPending, isCoolingDown, remainingSeconds, captcha } =
    useResendActivationEmail({
      sentMessage: t('welcome.email_sent'),
      failedMessage: t('welcome.send_failed'),
    });

  return (
    <Result
      title={
        <>
          {t('welcome.thanks')}
          <br />
          {t('welcome.email_sent_to')}
          <br />
          {t('welcome.click_link')}
          <div className="h-6" />
        </>
      }
      subTitle={t('welcome.no_email')}
      extra={
        <>
          {captcha.widget && (
            <div style={{ marginBottom: 16 }}>{captcha.widget}</div>
          )}
          <Button
            type="primary"
            onClick={sendEmail}
            loading={isPending}
            disabled={isCoolingDown || !captcha.ready}
          >
            {isCoolingDown
              ? t('welcome.resend_countdown', { seconds: remainingSeconds })
              : t('welcome.resend_button')}
          </Button>
        </>
      }
    />
  );
};

export const Component = Welcome;
