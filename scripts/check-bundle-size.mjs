// Bundle size gate. The numbers are the current output plus headroom: whoever
// drags a whole library like G6 back into the bundle fails CI here instead of
// waiting for users to complain that the page got slow.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const jsDir = join(process.cwd(), 'dist/static/js');
const KB = 1024;
const LIMITS = {
  // Every JS file loaded synchronously on first paint (index + lib-* + shared vendor)
  initialTotal: 1400 * KB,
  // A single on-demand chunk (the largest is the G2 chart library, ~1.5MB)
  asyncChunk: 1600 * KB,
  // All JS combined
  total: 5200 * KB,
};

const listJs = (dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => ({ name, size: statSync(join(dir, name)).size }));

const initial = listJs(jsDir);
const async = listJs(join(jsDir, 'async')).map((f) => ({
  ...f,
  name: `async/${f.name}`,
}));
const sum = (files) => files.reduce((acc, f) => acc + f.size, 0);
const fmt = (bytes) => `${(bytes / KB).toFixed(0)} KB`;

const failures = [];
const initialTotal = sum(initial);
if (initialTotal > LIMITS.initialTotal) {
  failures.push(
    `initial JS ${fmt(initialTotal)} exceeds ${fmt(LIMITS.initialTotal)}`,
  );
}
for (const f of async) {
  if (f.size > LIMITS.asyncChunk) {
    failures.push(`${f.name} ${fmt(f.size)} exceeds ${fmt(LIMITS.asyncChunk)}`);
  }
}
const total = initialTotal + sum(async);
if (total > LIMITS.total) {
  failures.push(`total JS ${fmt(total)} exceeds ${fmt(LIMITS.total)}`);
}

console.log(
  `bundle size: initial ${fmt(initialTotal)}, async ${fmt(sum(async))}, total ${fmt(total)}`,
);
const largest = [...initial, ...async].sort((a, b) => b.size - a.size).slice(0, 5);
for (const f of largest) console.log(`  ${fmt(f.size).padStart(8)}  ${f.name}`);

if (failures.length) {
  console.error(`\nbundle size check failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
