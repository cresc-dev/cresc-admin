import { packageSupportsForceBoot } from '@/utils/helper';

/** Pure logic for binding native packages: dependency diffing, staged-release menu rules and the forceBoot entry */

export type DepChangeType = 'Added' | 'Removed' | 'Changed';

export type DepChangeRow = {
  key: string;
  dependency: string;
  oldVersion: string;
  newVersion: string;
  changeType: DepChangeType;
};

export type DepChangeSummary = {
  added: number;
  removed: number;
  changed: number;
};

export type DepChangeFilters = Record<DepChangeType, boolean>;

export type PublishPackage = {
  id: number;
  name: string;
  deps?: Record<string, string>;
};

export type DepsChangePackage = {
  pkg: PublishPackage;
  changes: DepChangeRow[];
};

/** Percentage steps offered by the staged-release menu */
export const ROLLOUT_PERCENTAGES = [1, 2, 5, 10, 20, 50];

export function getDepsChangeSummary(
  changes: DepChangeRow[],
): DepChangeSummary {
  return changes.reduce(
    (acc, item) => {
      if (item.changeType === 'Added') {
        acc.added += 1;
      } else if (item.changeType === 'Removed') {
        acc.removed += 1;
      } else {
        acc.changed += 1;
      }
      return acc;
    },
    { added: 0, removed: 0, changed: 0 },
  );
}

// Without a dependency list on either side (old CLI upload) there is nothing to compare; return null rather than an empty array
export function getDepsChanges(
  oldDeps?: Record<string, string>,
  newDeps?: Record<string, string>,
): DepChangeRow[] | null {
  if (!oldDeps || !newDeps) {
    return null;
  }
  const rows: DepChangeRow[] = [];
  const keys = Object.keys({ ...oldDeps, ...newDeps }).sort((a, b) =>
    a.localeCompare(b),
  );
  for (const key of keys) {
    const oldValue = oldDeps[key];
    const newValue = newDeps[key];
    if (oldValue === undefined && newValue !== undefined) {
      rows.push({
        key,
        dependency: key,
        oldVersion: '-',
        newVersion: newValue,
        changeType: 'Added',
      });
      continue;
    }
    if (oldValue !== undefined && newValue === undefined) {
      rows.push({
        key,
        dependency: key,
        oldVersion: oldValue,
        newVersion: '-',
        changeType: 'Removed',
      });
      continue;
    }
    if (
      oldValue !== newValue &&
      oldValue !== undefined &&
      newValue !== undefined
    ) {
      rows.push({
        key,
        dependency: key,
        oldVersion: oldValue,
        newVersion: newValue,
        changeType: 'Changed',
      });
    }
  }
  return rows;
}

/** Keep only the packages whose deps actually changed; each is confirmed before publishing */
export function getDepsChangedPackages(
  pkgs: PublishPackage[],
  versionDeps?: Record<string, string>,
): DepsChangePackage[] {
  return pkgs.reduce<DepsChangePackage[]>((acc, pkg) => {
    const changes = getDepsChanges(pkg.deps, versionDeps);
    if (changes?.length) {
      acc.push({ pkg, changes });
    }
    return acc;
  }, []);
}

/**
 * Staged-release state of a bound package: a missing or 100 rollout is a full
 * release; below 50% it can still be raised, so only the larger steps are listed.
 */
export function getBindingRolloutState(rollout: number | null | undefined) {
  const isFull = rollout === 100 || rollout === undefined || rollout === null;
  const rolloutNumber = Number(rollout);
  const canStage = rolloutNumber < 50 && !isFull;
  return {
    isFull,
    rolloutNumber,
    stagedOptions: canStage
      ? ROLLOUT_PERCENTAGES.filter((percentage) => percentage > rolloutNumber)
      : [],
  };
}

// A binding that already has forceBoot on must stay switchable even when the package no longer meets the version floor, or the flag could never be removed
export function canToggleForceBoot(
  packageDeps: Record<string, string> | undefined,
  forceBootOn: boolean,
) {
  return packageSupportsForceBoot(packageDeps) || forceBootOn;
}

/** The "all packages" menu only offers force boot when every package supports it, to avoid a half-applied batch */
export function canForceBootAll(pkgs: PublishPackage[]) {
  return pkgs.every((pkg) => packageSupportsForceBoot(pkg.deps));
}
