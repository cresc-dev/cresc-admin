import { useMutation } from '@tanstack/react-query';
import { Button, message, Result } from 'antd';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { activationEmailResendCooldownStorageKey } from '@/constants/local-storage';
import { api } from '@/services/api';
import { getUserEmail } from '@/services/auth';
import { useLocalStorageCooldown } from '@/utils/hooks';
import { rootRouterPath, router } from '../router';

export const Inactivated = () => {
  useEffect(() => {
    if (!getUserEmail()) {
      router.navigate(rootRouterPath.login);
    }
  }, []);

  const { isCoolingDown, remainingSeconds, startCooldown } =
    useLocalStorageCooldown({
      storageKey: activationEmailResendCooldownStorageKey,
      durationMs: 60_000,
    });

  const { mutate: sendEmail, isPending } = useMutation({
    mutationFn: () => api.sendEmail({ email: getUserEmail() }),
    onSuccess: () => {
      startCooldown();
      message.info('Activation email sent. Please check your inbox.');
    },
    onError: () => {
      message.error('Failed to send activation email.');
    },
  });
  return (
    <Result
      title="Your account is not activated yet."
      subTitle="Didn't receive the activation email?"
      extra={[
        <Button
          key="resend"
          type="primary"
          onClick={() => sendEmail()}
          loading={isPending}
          disabled={isCoolingDown}
        >
          {isCoolingDown
            ? `Resend email in ${remainingSeconds}s`
            : 'Resend email'}
        </Button>,
        <Link key="back" to={rootRouterPath.login} replace>
          <Button>Back to log in</Button>
        </Link>,
      ]}
    />
  );
};

export const Component = Inactivated;
