import { describe, expect, test } from 'bun:test';
import en from '@/i18n/locales/en.json';
import zhCN from '@/i18n/locales/zh-CN.json';
import {
  describeDiffFailure,
  formatMegabytes,
  summarizeDiffStatusByVersion,
} from './diff-status';

const MB = 1024 * 1024;

type Json = { [key: string]: string | Json };

const valueAt = (locale: Json, path: string) =>
  path
    .split('.')
    .reduce<string | Json | undefined>(
      (node, part) =>
        node && typeof node === 'object' ? node[part] : undefined,
      locale,
    );

describe('summarizeDiffStatusByVersion', () => {
  test('counts statuses per version and keeps each failure reason', () => {
    const failure: DiffFailure = {
      kind: 'archive_entry_bytes',
      limitBytes: 80 * MB,
      actualBytes: 82.4 * MB,
    };
    const map = summarizeDiffStatusByVersion([
      { packageId: 1, versionId: 10, status: 'done' },
      { packageId: 2, versionId: 10, status: 'failed', failure },
      { packageId: 3, versionId: 10, status: 'failed' },
      { packageId: 1, versionId: 11, status: 'pending' },
    ]);
    expect(map.get(10)).toEqual({
      pending: 0,
      done: 1,
      failed: 2,
      total: 3,
      failures: [
        { packageId: 2, failure },
        { packageId: 3, failure: undefined },
      ],
    });
    expect(map.get(11)).toEqual({
      pending: 1,
      done: 0,
      failed: 0,
      total: 1,
      failures: [],
    });
  });
});

describe('formatMegabytes', () => {
  test('uses 1024*1024 and one decimal, dropping a trailing .0', () => {
    expect(formatMegabytes(82.4 * MB)).toBe('82.4 MB');
    expect(formatMegabytes(80 * MB)).toBe('80 MB');
    expect(formatMegabytes(1.04 * MB)).toBe('1 MB');
    expect(formatMegabytes(0.5 * MB)).toBe('0.5 MB');
  });
});

describe('describeDiffFailure', () => {
  test('entry bytes with both sizes', () => {
    expect(
      describeDiffFailure({
        kind: 'archive_entry_bytes',
        limitBytes: 80 * MB,
        actualBytes: 82.4 * MB,
      }),
    ).toEqual({
      key: 'diff_status.reason.entry_bytes_sized',
      params: { actual: '82.4 MB', limit: '80 MB' },
    });
  });

  test('entry bytes without actual size or without any size', () => {
    expect(
      describeDiffFailure({ kind: 'archive_entry_bytes', limitBytes: 80 * MB }),
    ).toEqual({
      key: 'diff_status.reason.entry_bytes_limit',
      params: { limit: '80 MB' },
    });
    expect(describeDiffFailure({ kind: 'archive_entry_bytes' })).toEqual({
      key: 'diff_status.reason.entry_bytes',
      params: undefined,
    });
  });

  test('groups archive budgets', () => {
    expect(
      describeDiffFailure({
        kind: 'archive_total_bytes',
        limitBytes: 512 * MB,
        actualBytes: 600 * MB,
      }).key,
    ).toBe('diff_status.reason.archive_bytes_sized');
    expect(describeDiffFailure({ kind: 'archive_output_bytes' }).key).toBe(
      'diff_status.reason.archive_bytes',
    );
    for (const kind of [
      'archive_entries',
      'archive_depth',
      'archive_compression_ratio',
    ]) {
      expect(describeDiffFailure({ kind }).key).toBe(
        'diff_status.reason.archive_structure',
      );
    }
  });

  test('missing files and retries have their own wording', () => {
    for (const kind of [
      'not_generated',
      'source_missing',
      'target_missing',
      'target_deleted',
      'source_and_target_missing',
      'attempts_exhausted',
    ]) {
      expect(describeDiffFailure({ kind }).key).toBe(
        `diff_status.reason.${kind}`,
      );
    }
  });

  test('server errors share one message that names the kind', () => {
    expect(describeDiffFailure({ kind: 'lease_lost' })).toEqual({
      key: 'diff_status.reason.server_error',
      params: { kind: 'lease_lost' },
    });
  });

  test('missing or unknown kinds', () => {
    expect(describeDiffFailure(undefined).key).toBe(
      'diff_status.reason.unrecorded',
    );
    expect(describeDiffFailure({ kind: '' }).key).toBe(
      'diff_status.reason.unrecorded',
    );
    expect(describeDiffFailure({ kind: 'brand_new' })).toEqual({
      key: 'diff_status.reason.unknown',
      params: { kind: 'brand_new' },
    });
  });

  test('every produced key exists in both locales', () => {
    const kinds = [
      'not_generated',
      'archive_entry_bytes',
      'archive_total_bytes',
      'archive_declared_bytes',
      'archive_output_bytes',
      'archive_entries',
      'archive_depth',
      'archive_compression_ratio',
      'source_missing',
      'target_missing',
      'target_deleted',
      'source_and_target_missing',
      'attempts_exhausted',
      'timeout',
      'disk_capacity',
      'storage_io',
      'file_descriptors',
      'transient_dependency',
      'processing',
      'canceled',
      'lease_lost',
      'brand_new',
    ];
    const failures: (DiffFailure | undefined)[] = [undefined];
    for (const kind of kinds) {
      failures.push(
        { kind },
        { kind, limitBytes: MB },
        { kind, limitBytes: MB, actualBytes: 2 * MB },
      );
    }
    for (const failure of failures) {
      const { key } = describeDiffFailure(failure);
      expect(typeof valueAt(zhCN as Json, key)).toBe('string');
      expect(typeof valueAt(en as Json, key)).toBe('string');
    }
  });
});

describe('describeDiffFailure edge cases', () => {
  test('raises precision when the overrun rounds to the limit', () => {
    expect(
      describeDiffFailure({
        kind: 'archive_entry_bytes',
        limitBytes: 80 * MB,
        actualBytes: 80 * MB + 30 * 1024,
      }),
    ).toEqual({
      key: 'diff_status.reason.entry_bytes_sized',
      params: { actual: '80.029 MB', limit: '80 MB' },
    });
  });

  test('treats a non-string kind as unrecorded', () => {
    expect(describeDiffFailure({ kind: 42 } as unknown as DiffFailure)).toEqual(
      { key: 'diff_status.reason.unrecorded' },
    );
  });
});
