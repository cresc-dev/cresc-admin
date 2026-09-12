const SEPARATOR = '\u001f';
const EVENT_TYPES = [
  'download_success',
  'download_fail',
  'patch_fail',
  'rollback',
  'mark_success',
] as const;
const RELEASES = [
  { version: '3.8.0', packageVersion: '7.4.0' },
  { version: '3.8.0', packageVersion: '7.3.2' },
  { version: '3.7.2', packageVersion: '7.4.0' },
] as const;

const apps: App[] = [
  {
    id: 201,
    name: 'Cresc Commerce',
    platform: 'ios',
    status: 'normal',
    appKey: 'mock-cresc-commerce',
    checkCount: 96_420,
  },
];

const dict = RELEASES.flatMap(({ version, packageVersion }) =>
  EVENT_TYPES.map(
    (type) =>
      `${type}${SEPARATOR}${version}${SEPARATOR}${encodeURIComponent(packageVersion)}`,
  ),
);

function appendCounts(
  data: Array<[number, number]>,
  releaseIndex: number,
  counts: [number, number, number, number, number],
) {
  counts.forEach((count, typeIndex) => {
    if (count > 0) {
      data.push([releaseIndex * EVENT_TYPES.length + typeIndex, count]);
    }
  });
}

function buildSeries() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return Array.from({ length: 24 }, (_, index) => {
    const data: Array<[number, number]> = [];
    if (index >= 14) {
      appendCounts(data, 0, [
        9,
        index % 7 === 0 ? 1 : 0,
        1,
        index > 20 ? 1 : 0,
        9,
      ]);
    }
    if (index >= 18) {
      appendCounts(data, 1, [
        5,
        0,
        index % 3 === 0 ? 1 : 0,
        index === 22 ? 1 : 0,
        5,
      ]);
    }
    appendCounts(data, 2, [8, index % 11 === 0 ? 1 : 0, 0, 0, 9]);
    return {
      time: new Date(now.getTime() - (23 - index) * 3_600_000).toISOString(),
      data,
    };
  });
}

// The analytics page's three insight endpoints, newest UTC+8 day first.
const DAY_MS = 86_400_000;
const cstDate = (offset: number) =>
  new Date(Date.now() + 8 * 3_600_000 - offset * DAY_MS)
    .toISOString()
    .slice(0, 10);

const HASH_A = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const HASH_B = 'b2c3d4e5f60718293a4b5c6d7e8f901234567890';
const HASH_DELETED = 'c3d4e5f60718293a4b5c6d7e8f90123456789abc';

function buildTrafficDays(days: number) {
  return Array.from({ length: days }, (_, offset) => {
    const scale = offset === 0 ? 0.6 : 1 - (offset % 7 === 6 ? 0.3 : 0);
    const requests = Math.round(48_000 * scale);
    const hourly = Array.from({ length: 24 }, (_, hour) =>
      Math.round(
        (requests / 24) *
          (hour >= 9 && hour <= 22 ? 1.4 : 0.4) *
          (offset === 0 && hour > 14 ? 0 : 1),
      ),
    );
    return {
      date: cstDate(offset),
      requests,
      dau: Math.round(12_500 * scale),
      hourly,
      hit: {
        uptodate: Math.round(requests * 0.82),
        hdiff: Math.round(requests * 0.09),
        pdiff: Math.round(requests * 0.03),
        full: Math.round(requests * 0.02),
        paused: 0,
        expired: Math.round(requests * 0.005),
        blocked: offset < 3 ? Math.round(requests * 0.02) : 0,
        unknown_package: Math.round(requests * 0.015),
      },
      ipVersion: {
        v4: Math.round(requests * 0.71),
        v6: Math.round(requests * 0.28),
        unknown: Math.round(requests * 0.01),
      },
      hosts: {
        'api.cresc.dev': Math.round(requests * 0.8),
        'update.cresc.dev': Math.round(requests * 0.2),
      },
      carriers: {
        电信: Math.round(requests * 0.38),
        移动: Math.round(requests * 0.31),
        联通: Math.round(requests * 0.18),
        广电: Math.round(requests * 0.02),
        云: Math.round(requests * 0.03),
        其他地区: Math.round(requests * 0.05),
        unknown: Math.round(requests * 0.03),
      },
      packages: [
        {
          packageVersion: '7.4.0',
          requests: Math.round(requests * 0.64),
          devices: Math.round(8_000 * scale),
        },
        {
          packageVersion: '7.3.2',
          requests: Math.round(requests * 0.3),
          devices: Math.round(3_900 * scale),
        },
        {
          packageVersion: '6.9.0',
          requests: Math.round(requests * 0.06),
          devices: 0,
        },
      ],
    };
  });
}

function buildBreakdownDays(days: number) {
  return Array.from({ length: days }, (_, offset) => {
    const scale = offset === 0 ? 0.6 : 1;
    const n = (value: number) => Math.round(value * scale);
    return {
      date: cstDate(offset),
      byOS: [
        {
          type: 'download_success',
          hash: HASH_A,
          name: '3.8.0',
          os: 'ios',
          count: n(2_100),
        },
        {
          type: 'mark_success',
          hash: HASH_A,
          name: '3.8.0',
          os: 'ios',
          count: n(1_950),
        },
        {
          type: 'download_success',
          hash: HASH_A,
          name: '3.8.0',
          os: 'android',
          count: n(1_300),
        },
        {
          type: 'mark_success',
          hash: HASH_A,
          name: '3.8.0',
          os: 'android',
          count: n(1_240),
        },
        {
          type: 'download_fail',
          hash: HASH_A,
          name: '3.8.0',
          os: 'android',
          count: n(85),
        },
        {
          type: 'patch_fail',
          hash: HASH_A,
          name: '3.8.0',
          os: 'android',
          count: n(12),
        },
        {
          type: 'rollback',
          hash: HASH_A,
          name: '3.8.0',
          os: 'ios',
          count: n(9),
        },
        {
          type: 'download_fail',
          hash: HASH_DELETED,
          name: null,
          os: 'android',
          count: n(20),
        },
        {
          type: 'rollback',
          hash: HASH_B,
          name: '3.7.2',
          os: 'harmony',
          count: n(3),
        },
        {
          type: 'mark_success',
          hash: HASH_B,
          name: '3.7.2',
          os: 'harmony',
          count: n(40),
        },
      ],
      byReason: [
        {
          type: 'download_fail',
          hash: HASH_A,
          name: '3.8.0',
          reason: 'network',
          count: n(48),
        },
        {
          type: 'download_fail',
          hash: HASH_A,
          name: '3.8.0',
          reason: 'timeout',
          count: n(22),
        },
        {
          type: 'download_fail',
          hash: HASH_DELETED,
          name: null,
          reason: 'http_4xx',
          count: n(20),
        },
        {
          type: 'download_fail',
          hash: HASH_A,
          name: '3.8.0',
          reason: 'no_space',
          count: n(15),
        },
        {
          type: 'patch_fail',
          hash: HASH_A,
          name: '3.8.0',
          reason: 'crc_mismatch',
          count: n(7),
        },
        {
          type: 'patch_fail',
          hash: HASH_A,
          name: '3.8.0',
          reason: 'other:ENOENT',
          count: n(5),
        },
        {
          type: 'rollback',
          hash: HASH_A,
          name: '3.8.0',
          reason: 'other:JS exception',
          count: n(9),
        },
        {
          type: 'rollback',
          hash: HASH_B,
          name: '3.7.2',
          reason: 'empty',
          count: n(3),
        },
      ],
      byCarrier: [
        { type: 'download_success', carrier: '电信', count: n(1_400) },
        { type: 'download_success', carrier: '移动', count: n(1_200) },
        { type: 'download_success', carrier: '联通', count: n(700) },
        { type: 'download_fail', carrier: '移动', count: n(70) },
        { type: 'download_fail', carrier: '电信', count: n(25) },
        { type: 'download_fail', carrier: '联通', count: n(10) },
        { type: 'mark_success', carrier: '电信', count: n(1_350) },
        { type: 'rollback', carrier: '电信', count: n(6) },
      ],
    };
  });
}

function buildVersionFunnel(days: number) {
  const scale = Math.min(days, 7) / 7;
  const s = (value: number) => Math.round(value * scale);
  return {
    days,
    start: new Date(Date.now() - (days - 1) * DAY_MS)
      .toISOString()
      .slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
    hourlyFrom: new Date(Date.now() - DAY_MS).toISOString().slice(0, 10),
    dauToday: 7_500,
    truncated: days > 14,
    versions: [
      {
        hash: HASH_A,
        name: '3.8.0',
        served: {
          hdiff: s(21_000),
          pdiff: s(6_200),
          full: s(900),
          fullPending: s(300),
          exp: s(1_200),
        },
        events: {
          downloadSuccess: s(23_800),
          downloadFail: s(735),
          patchFail: s(84),
          markSuccess: s(22_300),
          rollback: s(63),
        },
        adopted: { mark: 6_120, download: 6_480 },
        lag: {
          downloadSuccess: {
            lt1h: 9_000,
            '1h-6h': 7_500,
            '6h-24h': 4_800,
            '1d-3d': 2_000,
            '3d-7d': 400,
            gt7d: 100,
          },
          markSuccess: {
            lt1h: 6_000,
            '1h-6h': 7_000,
            '6h-24h': 6_300,
            '1d-3d': 2_500,
            '3d-7d': 400,
            gt7d: 100,
          },
        },
        byPackage: [
          {
            packageVersion: '7.4.0',
            served: {
              hdiff: s(15_000),
              pdiff: s(4_000),
              full: s(600),
              fullPending: s(300),
              exp: s(1_200),
            },
            events: {
              downloadSuccess: s(17_000),
              downloadFail: s(500),
              patchFail: s(60),
              markSuccess: s(16_000),
              rollback: s(40),
            },
          },
          {
            packageVersion: '7.3.2',
            served: {
              hdiff: s(6_000),
              pdiff: s(2_200),
              full: s(300),
              fullPending: 0,
              exp: 0,
            },
            events: {
              downloadSuccess: s(6_800),
              downloadFail: s(235),
              patchFail: s(24),
              markSuccess: s(6_300),
              rollback: s(23),
            },
          },
        ],
      },
      {
        hash: HASH_B,
        name: '3.7.2',
        served: {
          hdiff: s(1_200),
          pdiff: s(300),
          full: s(50),
          fullPending: 0,
          exp: 0,
        },
        events: {
          downloadSuccess: s(1_400),
          downloadFail: s(30),
          patchFail: s(2),
          markSuccess: s(1_100),
          rollback: s(90),
        },
        adopted: { mark: 3_900, download: 4_100 },
        lag: {
          downloadSuccess: {
            lt1h: 2_000,
            '1h-6h': 1_500,
            '6h-24h': 900,
            gt7d: 3_000,
          },
          markSuccess: null,
        },
        byPackage: [
          {
            packageVersion: '7.4.0',
            served: {
              hdiff: s(1_200),
              pdiff: s(300),
              full: s(50),
              fullPending: 0,
              exp: 0,
            },
            events: {
              downloadSuccess: s(1_400),
              downloadFail: s(30),
              patchFail: s(2),
              markSuccess: s(1_100),
              rollback: s(90),
            },
          },
        ],
      },
      {
        hash: HASH_DELETED,
        name: null,
        served: { hdiff: 0, pdiff: 0, full: 0, fullPending: 0, exp: 0 },
        events: {
          downloadSuccess: 0,
          downloadFail: s(140),
          patchFail: 0,
          markSuccess: 0,
          rollback: 0,
        },
        adopted: { mark: 120, download: 300 },
        lag: { downloadSuccess: null, markSuccess: null },
        byPackage: [],
      },
    ],
  };
}

const daysParam = (path: string) => {
  const raw = new URLSearchParams(path.slice(path.indexOf('?') + 1)).get(
    'days',
  );
  const days = Number(raw);
  return Number.isFinite(days) && days > 0 ? Math.min(days, 35) : 7;
};

export function getVersionHealthDevMock(method: string, path: string) {
  if (method !== 'get') return null;
  if (path === '/app/list') return { data: apps };
  if (path === '/user/me') {
    return { id: 1, name: 'mock', email: 'mock@example.com', admin: true };
  }
  if (path.startsWith('/metrics/app/events/breakdown?')) {
    return { days: buildBreakdownDays(daysParam(path)), retentionDays: 35 };
  }
  if (path.startsWith('/metrics/app/events?')) {
    return { dict, data: buildSeries() };
  }
  if (path.startsWith('/metrics/app/traffic?')) {
    return { days: buildTrafficDays(daysParam(path)), retentionDays: 35 };
  }
  if (path.startsWith('/metrics/app/versions?')) {
    return buildVersionFunnel(daysParam(path));
  }
  if (path.startsWith('/metrics/app/geo?')) {
    return {
      days: buildTrafficDays(daysParam(path)).map((day) => ({
        date: day.date,
        requests: day.requests,
        regions: {
          广东: Math.round(day.requests * 0.3),
          北京: Math.round(day.requests * 0.2),
          US: Math.round(day.requests * 0.1),
          未知: Math.round(day.requests * 0.05),
        },
      })),
      retentionDays: 35,
      regionResolver: true,
    };
  }
  if (path.startsWith('/metrics/app?')) {
    return { dict, data: buildSeries() };
  }
  return null;
}
