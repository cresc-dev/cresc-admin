#!/usr/bin/env python3
"""Apply the audited insights-only delta; no branding, billing or request-stack changes."""
from pathlib import Path
import json
import re
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).parent))
from port_insights_audit import BASE, HEAD, CACHE, FILES, fetch

# The audit verified that overwritten UI modules differ only in translated
# comments and timezone presentation. Keep all target-only release features.
fetch()
BASELINE = 'b6c2718b3e78a8e80b6222b3ed881387ceb47078'
for name in FILES:
    path = Path(name)
    try:
        before = subprocess.check_output(['git', 'show', BASELINE + ':' + name], stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        assert not path.exists(), ('new upstream path collides', name)
    else:
        assert path.read_bytes() == before, ('target changed since audit', name)

COPIES = [
 'src/constants/metric-thresholds.ts', 'src/i18n/canonical-resources.test.ts',
 'src/i18n/locales.test.ts', 'src/i18n/resources.ts',
 'src/pages/app-insights/failures-panel.tsx', 'src/pages/app-insights/logic.test.ts',
 'src/pages/app-insights/logic.ts', 'src/pages/app-insights/observation-ui.test.tsx',
 'src/pages/app-insights/observation-ui.tsx', 'src/pages/app-insights/observed-null.test.ts',
 'src/pages/app-insights/overview-panel.tsx', 'src/pages/app-insights/review-availability.test.tsx',
 'src/pages/app-insights/review-regressions.test.ts', 'src/pages/app-insights/traffic-panel.tsx',
 'src/pages/app-insights/types.ts', 'src/pages/app-insights/versions-panel.tsx',
]
for name in COPIES:
    path = Path(name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes((CACHE / HEAD / name).read_bytes())

def edit(name, old, new):
    path = Path(name)
    text = path.read_text()
    assert text.count(old) == 1, (name, old[:100], text.count(old))
    path.write_text(text.replace(old, new, 1))

name = 'src/constants/i18n-keys.ts'
for old, new in [('health_healthy', 'rollback_low'), ('health_warning','rollback_warning'), ('health_critical','rollback_high')]:
    edit(name, 'app_insights.' + old, 'app_insights.' + new)
edit(name, '/** Health tag of the version funnel (rollback-rate thresholds; null means too\n * few samples to judge). */', '/** Rollback-report classification only, not overall version health. */')

name = 'src/pages/admin-service-status/version-health-overview-panel.tsx'
edit(name, "import { adminApi } from '@/services/admin-api';", "import { CRITICAL_ROLLBACK, MIN_EVENT_SAMPLES, WARNING_ROLLBACK } from '@/constants/metric-thresholds';\nimport { adminApi } from '@/services/admin-api';")
edit(name, '// Thresholds: rollback rate >5% is bad, >1% worth watching; too few samples (<10) means no verdict\nconst CRITICAL_ROLLBACK = 0.05;\nconst WARNING_ROLLBACK = 0.01;\nconst MIN_SAMPLES = 10;', '// Shared with the per-app rollback report view; thresholds are not an overall health verdict.')
edit(name, 'row.startSamples < MIN_SAMPLES', 'row.startSamples < MIN_EVENT_SAMPLES')

name = 'src/i18n/index.ts'
edit(name, "import en from './locales/en.json';\nimport zhCN from './locales/zh-CN.json';", "import { resources } from './resources';")
edit(name, "resources: {\n      en: { translation: en },\n      'zh-CN': { translation: zhCN },\n    },", 'resources,')
assert "fallbackLng: 'en'" in Path(name).read_text()

# Merge only changed app_insights leaves, preserving every other namespace and
# Cresc's independently shipped release/HermesBase translations.
for locale in ['en', 'zh-CN']:
    name = 'src/i18n/locales/' + locale + '.json'
    path = Path(name)
    current = json.loads(path.read_text())
    original = json.loads(path.read_text())
    old = json.loads((CACHE / BASE / name).read_text())['app_insights']
    new = json.loads((CACHE / HEAD / name).read_text())['app_insights']
    section = current['app_insights']
    for key in set(old) - set(new):
        if key != 'release': section.pop(key, None)
    for key, value in new.items():
        if key != 'release' and (key not in old or old[key] != value):
            section[key] = value.replace('Pushy', 'Cresc') if isinstance(value, str) else value
    if locale == 'en':
        section.update({
          'today_live_hint': 'Today in the returned timezone, accumulating observations',
          'daily_footnote': 'Days are formed from UTC-hour buckets in the returned request timezone. Missing observations are not zero. Refreshes every minute.',
          'hourly_footnote': 'UTC-hour observations grouped by the returned timezone and summed across the selected days.',
          'breakdown_footnote': 'Client reports in the returned request timezone, not linked update attempts. Availability and readable day counts are shown above.',
          'page_footnote': 'The views use the requested timezone (browser: {{timezone}}); exact returned hour-grid boundaries are shown beside the data. Retained UUID and lag observations ignore the day filter. Billing and quota calendars are unchanged.',
          'means_note': 'Means exclude today, future dates and all buckets whose aligned end has not passed. Valid observed zeroes count; unavailable observations do not. Included and eligible day counts are shown.',
          'window_legacy': 'Legacy timezone: {{timezone}}. Exact bucket boundaries and availability metadata are not supplied; totals may cover incomplete observations.',
          'hour_alignment': 'Cresc groups UTC-hour buckets into the requested timezone. Half-hour and quarter-hour zones use the nearest-hour grid; the displayed boundaries may differ from local midnight.',
          'incomplete_dates': 'Incomplete bucket dates excluded from daily means: {{dates}}.',
        })
    else:
        section.update({
          'today_live_hint': '返回时区的今日，累计观测',
          'daily_footnote': '按返回的请求时区聚合 UTC 小时桶；缺失观测不等于零，每分钟刷新。',
          'hourly_footnote': '按返回时区的小时汇总选定日期内的 UTC 小时观测。',
          'breakdown_footnote': '按返回的请求时区统计客户端报告，并非关联同一次更新的尝试；可用性与可读取日数见上方。',
          'page_footnote': '各视图使用请求时区（浏览器：{{timezone}}），实际返回的小时网格边界在数据旁展示。留存 UUID 与时延观测不受日期筛选影响；计费和配额日历保持不变。',
          'means_note': '日均排除今天、未来日期及对齐边界尚未结束的所有日桶。明确观测到的零值计入，不可用值排除；同时展示参与计算和符合完整日条件的日数。',
          'window_legacy': '旧接口时区：{{timezone}}。未提供精确桶边界与可用性元数据；总计可能仅包含部分观测。',
          'hour_alignment': 'Cresc 将 UTC 小时桶按请求时区聚合。半小时和四分之一小时时区使用最近整点网格；显示的边界可能与当地午夜不同。',
          'incomplete_dates': '以下尚未完整结束的日桶不计入日均：{{dates}}。',
        })
    section.pop('window_utc_legacy', None)
    section.pop('window_business_legacy', None)
    assert current.get('app_insights', {}).get('release') == original.get('app_insights', {}).get('release')
    assert {k:v for k,v in current.items() if k != 'app_insights'} == {k:v for k,v in original.items() if k != 'app_insights'}
    path.write_text(json.dumps(current, indent=2, ensure_ascii=False) + '\n')

name = 'src/pages/app-insights/types.ts'
for interface in ['AppTrafficResponse', 'AppEventBreakdownResponse', 'VersionFunnelResponse']:
    edit(name, 'export interface ' + interface + ' {', 'export interface ' + interface + ' {\n  /** Resolved Cresc request timezone; independent of the billing calendar. */\n  timezone: string;')
edit(name, '  partialDay: boolean;', '''  partialDay: boolean;
  /** Exact boundaries follow Cresc's existing nearest-UTC-hour rule. */
  bucketAlignment?: 'nearest_utc_hour';
  /** A previous date can still be incomplete near rounded local midnight. */
  incompleteDates?: string[];''')
edit(name, '  hourlyFrom: string;', '  /** RFC3339 UTC instant separating settled and live hour buckets. */\n  hourlyFrom: string;')
edit(name, 'observed?: { mark: number | null; download: number | null };', 'observed?: { mark: number | null; download: number | null } | null;')

name = 'src/pages/app-insights/logic.ts'
edit(name, "import {\n  CRITICAL_ROLLBACK,", "import { localToday } from '@/utils/timezone';\nimport {\n  CRITICAL_ROLLBACK,")
edit(name, '  type AppTrafficDay,', '  type AppTrafficDay,\n  type AppTrafficResponse,')
edit(name, '''/** Legacy fallback only; prefer window.today in the writer's timezone. */
export const beijingToday = (now: number = Date.now()): string =>
  new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);''', '''/** Prefer the server's snapshot date; legacy Cresc responses echo a timezone. */
export const insightToday = (now: number = Date.now(), timezone?: string): string => {
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(new Date(now));
      const part = (type: string) => parts.find((item) => item.type === type)?.value;
      return `${part('year')}-${part('month')}-${part('day')}`;
    } catch {
      // Unknown legacy zones fall back to the browser calendar, never UTC+8.
    }
  }
  return localToday(new Date(now));
};''')
edit(name, 'today: string = beijingToday(),', 'today: string = insightToday(),\n  incompleteDates: readonly string[] = [],')
edit(name, 'if (day.date < today) {', 'if (day.date < today && !incompleteDates.includes(day.date)) {')
edit(name, 'export const trafficWarnings = (', '''/** Keep the date and completeness metadata with the data it describes. */
export const summarizeTrafficResponse = (
  response: AppTrafficResponse | undefined,
  now: number = Date.now(),
): TrafficSummary => summarizeTraffic(
  response?.days,
  response?.window?.today ?? insightToday(now, response?.timezone),
  response?.window?.incompleteDates,
);

export const trafficWarnings = (''')

# The shared helper differs only in English comments. Transplant just the
# changed reason-label hook; keep request/cache/auth hooks unchanged.
name = 'src/pages/app-insights/shared.tsx'
current = Path(name).read_text()
source = (CACHE / HEAD / name).read_text()
marker = 'export const useFailureReasonLabel'
assert marker in current and marker in source
start = current.index(marker)
end = current.index('\n};', start) + len('\n};')
sstart = source.index(marker)
send = source.index('\n};', sstart) + len('\n};')
Path(name).write_text(current[:start] + source[sstart:send] + current[end:])

for name in ['overview-panel.tsx', 'traffic-panel.tsx']:
    path = 'src/pages/app-insights/' + name
    edit(path, 'summarizeTraffic,', 'summarizeTrafficResponse,')
    edit(path, 'summarizeTraffic(traffic.data?.days, traffic.data?.window?.today)', 'summarizeTrafficResponse(traffic.data)')

# All Cresc windows share caller-timezone semantics, including version events.
for name in ['overview-panel.tsx', 'traffic-panel.tsx', 'failures-panel.tsx', 'versions-panel.tsx']:
    path = Path('src/pages/app-insights/' + name)
    text = path.read_text()
    text, matches = re.subn(r'(window=\{([^}]+)\.window\})\s+source="(?:utc|business)"', r'\1\n        timezone={\2.timezone}', text)
    assert matches > 0, (name, 'missing window notice')
    path.write_text(text)

name = 'src/pages/app-insights/observation-ui.tsx'
edit(name, "import { MIN_EVENT_SAMPLES } from '@/constants/metric-thresholds';", "import { MIN_EVENT_SAMPLES } from '@/constants/metric-thresholds';\nimport { getBrowserTimezone } from '@/utils/timezone';")
edit(name, '  source,', '  timezone,')
edit(name, "  source: 'utc' | 'business';", '  timezone?: string;')
edit(name, ': t(`app_insights.window_${source}_legacy`)', ": t('app_insights.window_legacy', { timezone: timezone ?? getBrowserTimezone() })")
edit(name, "      <div>{t('app_insights.best_effort')}</div>", '''      {window?.bucketAlignment === 'nearest_utc_hour' && (
        <div>{t('app_insights.hour_alignment')}</div>
      )}
      {!!window?.incompleteDates?.length && (
        <div>{t('app_insights.incomplete_dates', { dates: window.incompleteDates.join(', ') })}</div>
      )}
      <div>{t('app_insights.best_effort')}</div>''')

# Preserve all upstream regression cases while adapting the legacy date and
# response fixtures to Cresc's published timezone / RFC3339 wire contract.
for name in COPIES:
    if '.test.' not in name: continue
    path = Path(name)
    text = path.read_text().replace('beijingToday', 'insightToday')
    text = text.replace("expect(insightToday(Date.UTC(2026, 8, 26, 20))).toBe('2026-09-27');", "expect(insightToday(new Date(2026, 8, 26, 12).getTime())).toBe('2026-09-26');")
    text = text.replace('source="utc"', 'timezone="UTC"').replace('source="business"', 'timezone="Asia/Singapore"')
    text = re.sub(r"(\s*)hourlyFrom: '(\d{4}-\d{2}-\d{2})',", r"\1timezone: 'Asia/Singapore',\1hourlyFrom: '\2T00:00:00Z',", text)
    text = re.sub(r'(?m)^(\s*)retentionDays:', r"\1timezone: 'Asia/Singapore',\n\1retentionDays:", text)
    path.write_text(text)

# Semantic assertions prevent the high-risk parts of a cross-product copy.
assert 'beijingToday' not in Path('src/pages/app-insights/logic.ts').read_text()
assert 'DEPLOY_STATUS_LABEL_KEY' not in Path('src/constants/i18n-keys.ts').read_text()
assert "fallbackLng: 'en'" in Path('src/i18n/index.ts').read_text()
assert "releaseInsights?:" in Path('src/pages/app-insights/types.ts').read_text()
print('Applied insights-only delta, preserving Cresc timezones, English fallback, release metrics and non-insights locale content.')
