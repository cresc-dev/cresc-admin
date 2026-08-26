/** Pure derivations for the manage-page context: which native packages have no hot-update version bound yet */

// Legacy data hangs versions directly off package.versions; that counts as
// bound even without a binding record. An empty array means nothing is bound.
export function hasLegacyVersionBinding(pkg: Package) {
  return Array.isArray(pkg.versions)
    ? pkg.versions.length > 0
    : pkg.versions !== null && pkg.versions !== undefined;
}

// No verdict while bindings are still loading, or every package would look unused
export function getUnusedPackages(
  packages: Package[],
  bindings: Binding[],
  bindingsLoading: boolean,
): Package[] {
  if (bindingsLoading) {
    return [];
  }

  const boundPackageIds = new Set(bindings.map((binding) => binding.packageId));
  return packages.filter(
    (pkg) => !hasLegacyVersionBinding(pkg) && !boundPackageIds.has(pkg.id),
  );
}

/** Without any binding there is no diff status worth fetching */
export function shouldLoadDiffStatus({
  bindings,
  bindingsLoading,
  packages,
  packagesLoading,
}: {
  bindings: Binding[];
  bindingsLoading: boolean;
  packages: Package[];
  packagesLoading: boolean;
}) {
  return (
    !bindingsLoading &&
    !packagesLoading &&
    (bindings.length > 0 || packages.some(hasLegacyVersionBinding))
  );
}
