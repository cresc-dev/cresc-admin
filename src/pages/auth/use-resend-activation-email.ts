import { useMutation } from '@tanstack/react-query';
import { message } from 'antd';
import { useEffect } from 'react';
import { activationEmailResendCooldownStorageKey } from '@/constants/local-storage';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { getUserEmail } from '@/services/auth';
import { useLocalStorageCooldown } from '@/utils/hooks';
import { useTurnstile } from '@/utils/turnstile';

/**
 * Resends the activation email: without a pending email it goes back to
 * login; a successful send starts a 60-second cooldown. Each request spends
 * one Turnstile token. Shared by the welcome and inactivated pages; callers
 * pass messages from their own i18n namespace.
 */
export function useResendActivationEmail({
  sentMessage,
  failedMessage,
}: {
  sentMessage: string;
  failedMessage: string;
}) {
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

  const captcha = useTurnstile('activate');
  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.sendEmail({ email: getUserEmail(), captchaToken: captcha.token }),
    onSettled: () => captcha.reset(),
    onSuccess: () => {
      startCooldown();
      message.info(sentMessage);
    },
    onError: () => {
      message.error(failedMessage);
    },
  });

  return {
    sendEmail: () => mutate(),
    isPending,
    isCoolingDown,
    remainingSeconds,
    captcha,
  };
}
