import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { message } from 'antd';

/**
 * Query and mutations shared by the "list + create + revoke" token pages
 * (API keys, MCP connections). Failure toasts come from the MutationCache
 * default; on a failed create the caller keeps the modal open so the user can
 * fix and retry.
 */
export function useTokenCrud<TToken extends { token?: string }, TCreateParams>({
  queryKey,
  list,
  create,
  revoke,
  createSuccessText,
  revokeSuccessText,
  onCreated,
}: {
  queryKey: QueryKey;
  list: () => Promise<{ data: TToken[] } | undefined>;
  create: (params: TCreateParams) => Promise<TToken | undefined>;
  revoke: (tokenId: number) => Promise<unknown>;
  createSuccessText: string;
  revokeSuccessText: string;
  /** Called once created with the plaintext token (returned only this once) */
  onCreated: (token: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey, queryFn: list });

  const createMutation = useMutation({
    mutationFn: create,
    onSuccess: (result) => {
      if (result?.token) {
        onCreated(result.token);
        message.success(createSuccessText);
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revoke,
    onSuccess: () => {
      message.success(revokeSuccessText);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    tokens: data?.data,
    isLoading,
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
    revoke: revokeMutation.mutate,
  };
}
