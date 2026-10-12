import { findActiveWorkspace } from '@/utils/active-workspace';

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
  const currentMembership = findActiveWorkspace(workspaces, workspaceAccountId);
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

// Assignable roles; the order is the dropdown order
export const ASSIGNABLE_ROLES: readonly MemberRole[] = [
  'admin',
  'developer',
  'viewer',
];

/** Role dropdown options; only the owner can appoint admins */
export const getRoleOptions = (
  isOwner: boolean,
  getLabel: (role: MemberRole) => string,
) =>
  ASSIGNABLE_ROLES.map((role) => ({
    label: getLabel(role),
    value: role,
    disabled: role === 'admin' && !isOwner,
  }));
