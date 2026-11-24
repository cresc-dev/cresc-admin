/** Summarizes patch status per OTA version, keeping one failure entry per failed native package. */
export function summarizeDiffStatusByVersion(
  items: BindingDiffStatus[],
): Map<number, VersionDiffSummary> {
  const map = new Map<number, VersionDiffSummary>();
  for (const item of items) {
    const summary = map.get(item.versionId) ?? {
      pending: 0,
      done: 0,
      failed: 0,
      total: 0,
      failures: [],
    };
    summary[item.status] += 1;
    summary.total += 1;
    if (item.status === 'failed') {
      summary.failures.push({
        packageId: item.packageId,
        failure: item.failure,
      });
    }
    map.set(item.versionId, summary);
  }
  return map;
}

const MB = 1024 * 1024;

/** Formats bytes as MB (1024*1024), one decimal by default, dropping trailing zeros. */
export function formatMegabytes(bytes: number, digits = 1): string {
  const value = (bytes / MB).toFixed(digits).replace(/\.?0+$/, '');
  return `${value} MB`;
}

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

// Byte-based archive budgets (other than the single-entry one); may carry limit and actual size
const ARCHIVE_BYTES_KINDS = new Set([
  'archive_total_bytes',
  'archive_declared_bytes',
  'archive_output_bytes',
]);

// Archive budgets unrelated to size
const ARCHIVE_STRUCTURE_KINDS = new Set([
  'archive_entries',
  'archive_depth',
  'archive_compression_ratio',
]);

// Missing native package / OTA bundle files, each with its own message
const MISSING_KINDS = new Set([
  'source_missing',
  'target_missing',
  'target_deleted',
  'source_and_target_missing',
]);

// Server-side processing errors share one generic message that names the kind for troubleshooting
const SERVER_ERROR_KINDS = new Set([
  'timeout',
  'disk_capacity',
  'storage_io',
  'file_descriptors',
  'transient_dependency',
  'processing',
  'canceled',
  'lease_lost',
]);

export interface DiffFailureReason {
  /** Full i18n key */
  key: string;
  params?: Record<string, string>;
}

const reason = (
  name: string,
  params?: Record<string, string>,
): DiffFailureReason => ({ key: `diff_status.reason.${name}`, params });

/** Size-budget reasons: "X, over the Y limit" when the actual size is known, "exceeds the Y limit" when only the limit is. */
const sizedReason = (name: string, failure: DiffFailure) => {
  if (!isPositiveNumber(failure.limitBytes)) {
    return reason(name);
  }
  const limit = formatMegabytes(failure.limitBytes);
  if (isPositiveNumber(failure.actualBytes)) {
    const actual = formatMegabytes(failure.actualBytes);
    // A small overrun would read "80 MB, over the 80 MB limit" at one decimal; use more precision
    if (actual === limit) {
      return reason(`${name}_sized`, {
        actual: formatMegabytes(failure.actualBytes, 3),
        limit: formatMegabytes(failure.limitBytes, 3),
      });
    }
    return reason(`${name}_sized`, { actual, limit });
  }
  return reason(`${name}_limit`, { limit });
};

/** Maps a server failure to a human-readable i18n key and params; a missing failure counts as unrecorded. */
export function describeDiffFailure(failure?: DiffFailure): DiffFailureReason {
  const kind =
    typeof failure?.kind === 'string' ? failure.kind.trim() : undefined;
  if (!failure || !kind) {
    return reason('unrecorded');
  }
  if (kind === 'not_generated' || kind === 'attempts_exhausted') {
    return reason(kind);
  }
  if (kind === 'archive_entry_bytes') {
    return sizedReason('entry_bytes', failure);
  }
  if (ARCHIVE_BYTES_KINDS.has(kind)) {
    return sizedReason('archive_bytes', failure);
  }
  if (ARCHIVE_STRUCTURE_KINDS.has(kind)) {
    return reason('archive_structure');
  }
  if (MISSING_KINDS.has(kind)) {
    return reason(kind);
  }
  if (SERVER_ERROR_KINDS.has(kind)) {
    return reason('server_error', { kind });
  }
  return reason('unknown', { kind });
}
