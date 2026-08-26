/** Permission derivation for the members page: acting as the account owner, or as a member of someone else's workspace */

export type MemberPermissions = {
  currentMembership: Workspace | undefined;
  /** owner of the current account, or an admin member of the workspace */
  canManage: boolean;
  /** admin members may not appoint/modify/remove admins — owner only */
  isOwner: boolean;
};

// No workspace switch means the user's own account; inside a workspace only an active admin member can manage people
export function getMemberPermissions(
  workspaces: Workspace[],
  workspaceAccountId: number | null,
): MemberPermissions {
  const currentMembership = workspaceAccountId
    ? workspaces.find(
        (workspace) =>
          workspace.account.id === workspaceAccountId &&
          workspace.status === 'active',
      )
    : undefined;
  return {
    currentMembership,
    canManage: !workspaceAccountId || currentMembership?.role === 'admin',
    isOwner: !workspaceAccountId,
  };
}

// Only the owner may change an admin member's role or remove them
export function canManageMember(
  role: MemberRole,
  { canManage, isOwner }: Pick<MemberPermissions, 'canManage' | 'isOwner'>,
) {
  return canManage && (isOwner || role !== 'admin');
}
