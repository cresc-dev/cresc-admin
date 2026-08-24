import { execFileSync } from 'node:child_process';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSvgr } from '@rsbuild/plugin-svgr';

// The console's own version, shaped like 2026.8.24-abcd1234: the commit date
// (UTC, month and day unpadded) plus eight hex digits, the same scheme the API
// releases under. The footer prints this next to the engine's version because
// the two deploy separately — a stale CDN copy of the console in front of a
// freshly released API is only visible when both are on screen.
function uiVersion(): string {
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      encoding: 'utf8',
      // UTC, or the date disagrees with the one the server reports.
      env: { ...process.env, TZ: 'UTC' },
    }).trim();
  try {
    const date = git(
      'log',
      '-1',
      '--format=%cd',
      '--date=format-local:%Y.%-m.%-d',
    );
    const commit = git('rev-parse', 'HEAD').slice(0, 8);
    const dirty = git('status', '--porcelain') !== '';
    return `${date}-${commit}${dirty ? '-dirty' : ''}`;
  } catch {
    // CI checkouts without git history (Netlify, GitHub Actions) still know
    // which commit they are building.
    const commit = (
      process.env.COMMIT_REF ??
      process.env.GITHUB_SHA ??
      ''
    ).slice(0, 8);
    if (!commit) return 'dev';
    const now = new Date();
    return `${now.getUTCFullYear()}.${now.getUTCMonth() + 1}.${now.getUTCDate()}-${commit}`;
  }
}

export default defineConfig({
  html: {
    template: './index.html',
    favicon: './src/assets/favicon.svg',
  },
  source: {
    entry: {
      index: './src/index.tsx',
    },
    preEntry: './src/process-shim.ts',
    define: {
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV ?? 'development',
      ),
      'process.env.PUBLIC_UI_VERSION': JSON.stringify(uiVersion()),
    },
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
    },
  },
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
    pluginSvgr({
      svgrOptions: {
        exportType: 'named',
      },
    }),
  ],
});
