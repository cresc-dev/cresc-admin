import { describe, expect, it } from 'bun:test';
import {
  highestFailureDimension,
  parseFailureReason,
  summarizeBreakdown,
} from './breakdown.logic';
import type { AppEventBreakdownDay } from './types';

const breakdown = (
  overrides: Partial<AppEventBreakdownDay> = {},
): AppEventBreakdownDay => ({
  date: '2026-09-26',
  byOS: [],
  byReason: [],
  ...overrides,
});

describe('diagnostic report shares, not attempt failure rates', () => {
  it('keeps a patch failure followed by success as two reports', () => {
    const result = summarizeBreakdown([
      breakdown({
        byOS: [
          { type: 'patch_fail', hash: 'v1', name: 'V1', os: 'ios', count: 1 },
          {
            type: 'download_success',
            hash: 'v1',
            name: 'V1',
            os: 'ios',
            count: 1,
          },
        ],
      }),
    ]);
    expect(result.os[0]?.failureSamples).toBe(2);
    expect(result.os[0]?.failureRate).toBe(0.5);
    expect(highestFailureDimension(result.os)).toBeNull();
  });
  it('does not rank one failure or a zero-failure platform above sufficient evidence', () => {
    const result = summarizeBreakdown([
      breakdown({
        byOS: [
          {
            type: 'download_fail',
            hash: 'v1',
            name: 'V1',
            os: 'tiny',
            count: 1,
          },
          {
            type: 'download_fail',
            hash: 'v1',
            name: 'V1',
            os: 'ios',
            count: 10,
          },
          {
            type: 'download_success',
            hash: 'v1',
            name: 'V1',
            os: 'ios',
            count: 90,
          },
          {
            type: 'download_success',
            hash: 'v1',
            name: 'V1',
            os: 'android',
            count: 100,
          },
        ],
      }),
    ]);
    expect(highestFailureDimension(result.os)?.key).toBe('ios');
    expect(
      highestFailureDimension(result.os.filter((row) => row.key === 'android')),
    ).toBeNull();
  });
  it('normalizes legacy free-text reasons and scopes them per version', () => {
    const days = [
      breakdown({
        byReason: [
          {
            type: 'download_fail',
            hash: 'v1',
            name: 'V1',
            reason: 'other:private-a',
            count: 2,
          },
          {
            type: 'patch_fail',
            hash: 'v2',
            name: null,
            reason: 'other:private-b',
            count: 3,
          },
        ],
      }),
    ];
    const result = summarizeBreakdown(days);
    expect(result.failures).toBe(5);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]?.reason).toBe('other');
    expect(result.reasons[0]?.percent).toBe(100);
    expect(summarizeBreakdown(days, 'v1').failures).toBe(2);
    expect(parseFailureReason('other:private')).toEqual({
      kind: 'other',
    });
    expect(parseFailureReason('timeout')).toEqual({
      kind: 'known',
      reason: 'timeout',
    });
    expect(summarizeBreakdown(undefined).reasons).toEqual([]);
  });
  it('ignores legacy rollback reason rows', () => {
    const result = summarizeBreakdown([
      breakdown({
        byReason: [
          {
            type: 'patch_fail',
            hash: 'v1',
            name: 'V1',
            reason: 'crc_mismatch',
            count: 4,
          },
          {
            type: 'rollback',
            hash: 'v1',
            name: 'V1',
            reason: 'empty',
            count: 40,
          },
        ],
      }),
    ]);
    expect(result.failures).toBe(4);
    expect(result.reasons.map((row) => row.reason)).toEqual(['crc_mismatch']);
  });
});
