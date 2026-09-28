import { afterEach, beforeEach, expect, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from '@/i18n';
import en from '@/i18n/locales/en.json';
import { localToday } from '@/utils/timezone';
import { insightToday, summarizeTrafficResponse } from './logic';
import { ObservationNotice } from './observation-ui';
import type {
  AppTrafficDay,
  AppTrafficResponse,
  ObservationWindow,
} from './types';

const day = (date: string, requests: number): AppTrafficDay => ({
  date,
  requests,
  dau: requests,
  requestsStatus: 'observed',
  dauStatus: 'observed',
  hit: { full: requests },
  hourly: [],
  ipVersion: {},
  hosts: {},
  packages: [],
});

const roundedWindow = (): ObservationWindow => ({
  timezone: 'Asia/Kolkata',
  startDate: '2026-09-24',
  endDate: '2026-09-27',
  startInclusive: '2026-09-24T00:30:00+05:30',
  endExclusive: '2026-09-28T00:30:00+05:30',
  today: '2026-09-27',
  generatedAt: '2026-09-26T18:45:00Z',
  partialDay: true,
  bucketAlignment: 'nearest_utc_hour',
  incompleteDates: ['2026-09-26', '2026-09-27'],
});

beforeEach(async () => {
  await i18n.changeLanguage('en');
});
afterEach(cleanup);

test('Cresc legacy dates follow the returned timezone, not hardcoded UTC+8', () => {
  const now = Date.UTC(2026, 8, 27, 1);
  expect(insightToday(now, 'Asia/Singapore')).toBe('2026-09-27');
  expect(insightToday(now, 'America/New_York')).toBe('2026-09-26');
  expect(insightToday(now, 'Asia/Kathmandu')).toBe('2026-09-27');
  expect(insightToday(now)).toBe(localToday(new Date(now)));
  expect(insightToday(now, 'Invalid/Zone')).toBe(localToday(new Date(now)));
});

test('means exclude a previous date whose aligned hour bucket is still incomplete', () => {
  const response: AppTrafficResponse = {
    timezone: 'Asia/Kolkata',
    retentionDays: 35,
    window: roundedWindow(),
    days: [
      day('2026-09-24', 10),
      day('2026-09-25', 0),
      day('2026-09-26', 100),
      day('2026-09-27', 1000),
    ],
  };
  const summary = summarizeTrafficResponse(response, Date.UTC(2026, 8, 29));
  expect(summary.today?.date).toBe('2026-09-27');
  expect(summary.completedDays).toBe(2);
  expect(summary.requestSampleDays).toBe(2);
  expect(summary.dauSampleDays).toBe(2);
  expect(summary.averageDailyRequests).toBe(5);
  expect(summary.averageDau).toBe(5);
  // Incomplete days remain visible in the window total and chart.
  expect(summary.requests).toBe(1110);
  expect(summary.daily).toHaveLength(4);
});

test('legacy timezone is honored without inventing exact observation boundaries', () => {
  const response: AppTrafficResponse = {
    timezone: 'America/New_York',
    retentionDays: 35,
    days: [day('2026-09-25', 20), day('2026-09-26', 100)],
  };
  const summary = summarizeTrafficResponse(response, Date.UTC(2026, 8, 27, 1));
  expect(summary.today?.date).toBe('2026-09-26');
  expect(summary.completedDays).toBe(1);
  expect(summary.averageDailyRequests).toBe(20);
  render(<ObservationNotice updatedAt={0} />);
  expect(screen.getByText(en.app_insights.not_loaded)).not.toBeNull();
});

test('the UI displays actual fractional-zone boundaries and incomplete date warnings', () => {
  render(<ObservationNotice window={roundedWindow()} updatedAt={1} />);
  expect(
    screen.getByText(/2026-09-24 – 2026-09-27 \(Asia\/Kolkata\)/),
  ).not.toBeNull();
  expect(
    screen.getByText(/2026-09-26, 2026-09-27 is still coming in/),
  ).not.toBeNull();
  expect(screen.queryByText(/version events use UTC days/i)).toBeNull();
});
