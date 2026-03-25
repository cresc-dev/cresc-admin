import { useMutation } from '@tanstack/react-query';
import { Button, message, Result } from 'antd';
import { useEffect } from 'react';
import { activationEmailResendCooldownStorageKey } from '@/constants/local-storage';
import { api } from '@/services/api';
import { getUserEmail } from '@/services/auth';
import { useLocalStorageCooldown } from '@/utils/hooks';
import { rootRouterPath, router } from '../router';

export const Welcome = () => {
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
      title={
        <>
          Thanks for choosing Cresc hot updates for React Native.
          <br />
          We have sent an activation email to your address.
          <br />
          Click the activation link in the email to activate your account.
          <div className="h-6" />
        </>
      }
      subTitle="Didn't receive the activation email?"
      extra={
        <Button
          type="primary"
          onClick={() => sendEmail()}
          loading={isPending}
          disabled={isCoolingDown}
        >
          {isCoolingDown
            ? `Resend email in ${remainingSeconds}s`
            : 'Resend email'}
        </Button>
      }
    />
  );
};

export const Component = Welcome;
