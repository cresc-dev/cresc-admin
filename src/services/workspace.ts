/**
 * Workspace (sub-account) selection state.
 *
 * The server resolves the active workspace from the `x-account-id` header:
 * absent → operate on the actor's own account (legacy behavior); present →
 * operate on that account, subject to the actor's membership role. We persist
 * the selection so a member stays in the chosen workspace across reloads.
 */

import { safeStorage } from '@/utils/storage';

const WORKSPACE_KEY = 'workspaceAccountId';

// With storage unavailable (private mode etc.) this reads null and the
// selection stays in memory only
const parseAccountId = (raw: string | null) => {
  const parsed = raw === null ? Number.NaN : Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

let _accountId: number | null = parseAccountId(safeStorage.get(WORKSPACE_KEY));

/** The selected workspace account id, or null = own account. */
export const getWorkspaceAccountId = () => _accountId;

export const setWorkspaceAccountId = (accountId: number | null) => {
  _accountId = accountId;
  if (accountId === null) {
    safeStorage.remove(WORKSPACE_KEY);
  } else {
    safeStorage.set(WORKSPACE_KEY, String(accountId));
  }
};

export const clearWorkspace = () => setWorkspaceAccountId(null);
