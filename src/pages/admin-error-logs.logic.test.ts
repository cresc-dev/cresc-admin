import { describe, expect, test } from 'bun:test';
import {
  buildErrorLogQuery,
  type ErrorLogPage,
  flattenErrorLogPages,
  parseErrorLogFilters,
  severityColor,
  summarizeFields,
} from './admin-error-logs.logic';

describe('error log filters', () => {
  test('defaults unknown or missing URL values', () => {
    expect(
      parseErrorLogFilters(
        new URLSearchParams('source=cresc-site&severity=INFO&hours=5'),
      ),
    ).toEqual({ source: 'all', severity: 'ERROR', hours: 24, q: '' });
  });

  test('keeps known values and trims the search text', () => {
    expect(
      parseErrorLogFilters(
        new URLSearchParams(
          'source=cresc-worker&severity=WARNING&hours=168&q=%20lease%20',
        ),
      ),
    ).toEqual({
      source: 'cresc-worker',
      severity: 'WARNING',
      hours: 168,
      q: 'lease',
    });
  });

  test('builds the API query with optional text and page token', () => {
    const filters = {
      source: 'all',
      severity: 'ERROR',
      hours: 24,
      q: '',
    } as const;
    expect(buildErrorLogQuery(filters)).toBe(
      'source=all&severity=ERROR&hours=24',
    );
    expect(buildErrorLogQuery({ ...filters, q: 'a b' }, 'tok')).toBe(
      'source=all&severity=ERROR&hours=24&q=a+b&pageToken=tok',
    );
  });
});

describe('error log rows', () => {
  test('flattens pages and drops entries repeated across pages', () => {
    const entry = (insertId: string) => ({
      insertId,
      timestamp: '2026-09-14T00:00:00Z',
      severity: 'ERROR',
      source: 'cresc-api',
      message: insertId,
    });
    const pages: ErrorLogPage[] = [
      {
        entries: [entry('a'), entry('b')],
        nextPageToken: 'x',
        hours: 24,
        severity: 'ERROR',
        source: 'all',
      },
      {
        entries: [entry('b'), entry('c')],
        hours: 24,
        severity: 'ERROR',
        source: 'all',
      },
    ];
    expect(flattenErrorLogPages(pages).map((item) => item.insertId)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(flattenErrorLogPages(undefined)).toEqual([]);
  });

  test('colors severities and summarizes fields', () => {
    expect(severityColor('ERROR')).toBe('red');
    expect(severityColor('WARNING')).toBe('gold');
    expect(severityColor('DEFAULT')).toBe('default');
    expect(summarizeFields({ error: 'i/o timeout', taskId: 1 })).toBe(
      'i/o timeout',
    );
    expect(summarizeFields({ taskId: 1, kind: 'lease_lost' })).toBe(
      'taskId=1 kind=lease_lost',
    );
    expect(summarizeFields(undefined)).toBe('');
  });
});
