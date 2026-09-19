/**
 * The browser's IANA time zone. Analytics on the server are stored per UTC
 * hour and summed into whichever calendar the request names, so every request
 * carries this in the x-timezone header and the charts read as local days.
 * Falls back to UTC when the runtime cannot tell (very old engines, or a
 * sandbox that hides Intl).
 */
export function getBrowserTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && zone !== 'Etc/Unknown') {
      return zone;
    }
  } catch {
    // fall through
  }
  return 'UTC';
}

/** Every zone this runtime knows, for the profile selector. */
export function listTimezones(): string[] {
  try {
    const intl = Intl as unknown as {
      supportedValuesOf?: (key: 'timeZone') => string[];
    };
    const zones = intl.supportedValuesOf?.('timeZone');
    if (zones && zones.length > 0) {
      return zones.includes('UTC') ? zones : ['UTC', ...zones];
    }
  } catch {
    // fall through
  }
  return [
    'UTC',
    'Asia/Singapore',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Kolkata',
    'Europe/London',
    'Europe/Berlin',
    'America/New_York',
    'America/Los_Angeles',
    'Australia/Sydney',
  ];
}

/** Today's calendar date (YYYY-MM-DD) in the browser's time zone. */
export function localToday(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
