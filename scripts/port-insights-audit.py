#!/usr/bin/env python3
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import difflib
import json
import urllib.request

BASE = '0324179d11acdb6758ad2f2600e253073590bcd8'
HEAD = '0f5bef0f8b45893f53000857bb59680ee76c95a8'
FILES = [
 'src/constants/i18n-keys.ts', 'src/constants/metric-thresholds.ts',
 'src/i18n/canonical-resources.test.ts', 'src/i18n/index.ts', 'src/i18n/locales.test.ts',
 'src/i18n/locales/en.json', 'src/i18n/locales/zh-CN.json', 'src/i18n/resources.ts',
 'src/pages/admin-service-status/version-health-overview-panel.tsx',
 'src/pages/app-insights/failures-panel.tsx', 'src/pages/app-insights/logic.test.ts',
 'src/pages/app-insights/logic.ts', 'src/pages/app-insights/observation-ui.test.tsx',
 'src/pages/app-insights/observation-ui.tsx', 'src/pages/app-insights/observed-null.test.ts',
 'src/pages/app-insights/overview-panel.tsx', 'src/pages/app-insights/review-availability.test.tsx',
 'src/pages/app-insights/review-regressions.test.ts', 'src/pages/app-insights/shared.tsx',
 'src/pages/app-insights/traffic-panel.tsx', 'src/pages/app-insights/types.ts',
 'src/pages/app-insights/versions-panel.tsx',
]
CACHE = Path('/tmp/cresc-insights-public')

def source(job):
    ref, name = job
    path = CACHE / ref / name
    if path.exists(): return
    try:
        with urllib.request.urlopen('https://raw.githubusercontent.com/reactnativecn/pushy-admin/' + ref + '/' + name, timeout=30) as response:
            content = response.read()
    except urllib.error.HTTPError as error:
        if error.code == 404 and ref == BASE: return
        raise
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)

def fetch():
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(source, [(ref, name) for ref in [BASE, HEAD] for name in FILES]))

if __name__ == '__main__':
    fetch()
    for name in FILES:
        path, base = Path(name), CACHE / BASE / name
        if not path.exists() or not base.exists():
            print('NEW:', name, 'target exists:', path.exists())
            continue
        old, current = base.read_text(), path.read_text()
        if name.endswith('.json'):
            old = json.dumps(json.loads(old).get('app_insights', {}), indent=2, ensure_ascii=False) + '\n'
            current = json.dumps(json.loads(current).get('app_insights', {}), indent=2, ensure_ascii=False) + '\n'
        delta = ''.join(difflib.unified_diff(old.splitlines(True), current.splitlines(True), fromfile='pushy-base/'+name, tofile='cresc-base/'+name, n=2))
        print(delta or ('IDENTICAL: ' + name))
