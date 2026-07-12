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

export function getVersionHealthDevMock(method: string, path: string) {
  if (method !== 'get') return null;
  if (path === '/app/list') return { data: apps };
  if (path.startsWith('/metrics/app/events?')) {
    return { dict, data: buildSeries() };
  }
  return null;
}
