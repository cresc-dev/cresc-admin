/**
 * The membership of the selected workspace; undefined when no workspace is
 * selected (accountId is empty) or the membership is not active (pending or
 * removed).
 */
export const findActiveWorkspace = (
  workspaces: readonly Workspace[] | undefined,
  accountId: number | null,
) =>
  accountId
    ? workspaces?.find(
        (workspace) =>
          workspace.account.id === accountId && workspace.status === 'active',
      )
    : undefined;
