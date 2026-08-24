import { execFileSync } from 'node:child_process';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSvgr } from '@rsbuild/plugin-svgr';

// The commit a CI build is building, named by the platform. Its presence also
// says the working tree is CI's own checkout, where "dirty" means the build
// itself touched a file rather than that someone shipped uncommitted work.
const ciCommit =
  process.env.WORKERS_CI_COMMIT_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  process.env.COMMIT_REF ??
  '';
// Some builders name no commit at all, so CI itself is the second signal.
const inCI =
  ciCommit !== '' || process.env.CI === 'true' || process.env.CI === '1';

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
    // Only tracked files count, and not even those in CI: a CI workspace
    // always has installed dependencies and build artefacts lying around, and
    // the deploy pipeline may rewrite a tracked config file on its way
    // through. None of that changes which commit was compiled.
    const dirty =
      !inCI && git('status', '--porcelain', '--untracked-files=no') !== '';
    return `${date}-${commit}${dirty ? '-dirty' : ''}`;
  } catch {
    // A checkout without git history still knows which commit it is building.
    const commit = ciCommit.slice(0, 8);
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
