export const ERROR_LOG_SOURCES = [
  'all',
  'cresc-api',
  'cresc-worker',
  'cresc-dailyjob',
  'cresc-migrate',
] as const;
export type ErrorLogSource = (typeof ERROR_LOG_SOURCES)[number];

export const ERROR_LOG_SEVERITIES = ['ERROR', 'WARNING'] as const;
export type ErrorLogSeverity = (typeof ERROR_LOG_SEVERITIES)[number];

export const ERROR_LOG_HOURS = [1, 6, 24, 72, 168] as const;
export const DEFAULT_ERROR_LOG_HOURS = 24;

export type ErrorLogEntry = {
  insertId: string;
  timestamp: string;
  severity: string;
  source: string;
  revision?: string;
  message: string;
  fields?: Record<string, unknown>;
};

export type ErrorLogPage = {
  entries: ErrorLogEntry[];
  nextPageToken?: string;
  hours: number;
  severity: ErrorLogSeverity;
  source: ErrorLogSource;
};

export type ErrorLogFilters = {
  source: ErrorLogSource;
  severity: ErrorLogSeverity;
  hours: number;
  q: string;
};

/** Unknown URL values fall back to defaults instead of reaching the API as 400s */
export const parseErrorLogFilters = (
  searchParams: URLSearchParams,
): ErrorLogFilters => {
  const source = searchParams.get('source');
  const severity = searchParams.get('severity');
  const hours = Number(searchParams.get('hours'));
  return {
    source: ERROR_LOG_SOURCES.includes(source as ErrorLogSource)
      ? (source as ErrorLogSource)
      : 'all',
    severity: ERROR_LOG_SEVERITIES.includes(severity as ErrorLogSeverity)
      ? (severity as ErrorLogSeverity)
      : 'ERROR',
    hours: (ERROR_LOG_HOURS as readonly number[]).includes(hours)
      ? hours
      : DEFAULT_ERROR_LOG_HOURS,
    q: (searchParams.get('q') ?? '').trim(),
  };
};

export const buildErrorLogQuery = (
  filters: ErrorLogFilters,
  pageToken?: string,
) => {
  const params = new URLSearchParams({
    source: filters.source,
    severity: filters.severity,
    hours: String(filters.hours),
  });
  if (filters.q) {
    params.set('q', filters.q);
  }
  if (pageToken) {
    params.set('pageToken', pageToken);
  }
  return params.toString();
};

/** Pages can overlap when new entries arrive between requests */
export const flattenErrorLogPages = (pages: ErrorLogPage[] | undefined) => {
  const seen = new Set<string>();
  const entries: ErrorLogEntry[] = [];
  for (const page of pages ?? []) {
    for (const entry of page.entries) {
      const key = `${entry.insertId}:${entry.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        entries.push(entry);
      }
    }
  }
  return entries;
};

export const severityColor = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
    case 'ALERT':
    case 'EMERGENCY':
      return 'magenta';
    case 'ERROR':
      return 'red';
    case 'WARNING':
      return 'gold';
    default:
      return 'default';
  }
};

/** One-line summary of the structured fields for the collapsed row */
export const summarizeFields = (fields?: Record<string, unknown>) => {
  if (!fields) {
    return '';
  }
  const error = fields.error;
  if (typeof error === 'string' && error) {
    return error;
  }
  return Object.entries(fields)
    .slice(0, 3)
    .map(
      ([key, value]) =>
        `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`,
    )
    .join(' ');
};
