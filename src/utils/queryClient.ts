import { MutationCache, QueryClient } from '@tanstack/react-query';
import { message } from 'antd';

/** Fallback toast for failed mutations: errors the request layer did not already surface get one toast here. */
const notifyMutationError = (error: unknown) => {
  if ((error as { handled?: boolean } | null)?.handled) {
    return;
  }
  const text = error instanceof Error ? error.message : String(error);
  if (text) {
    message.error(text);
  }
};

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Mutations that render their own error UI opt out via meta.silentError.
      if (mutation.meta?.silentError) {
        return;
      }
      notifyMutationError(error);
    },
  }),
  defaultOptions: {
    queries: {
      // 30s keeps tab refocus from refetching every list; realtime pages
      // override freshness with their own refetchInterval.
      staleTime: 30_000,
      retry: false,
    },
  },
});
