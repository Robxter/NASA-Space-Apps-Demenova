#!/usr/bin/env node
// Demenova size gate (T-029). Owner: devops-engineer. Node built-ins only (no dependency).
//
// 1. Initial JavaScript: every <script src> and <link rel="modulepreload"> in app/dist/index.html,
//    gzip-compressed (level 9), summed. Budget: about 150 KB compressed (docs/spec/11, "Performance budget").
//    Lazy chunks (Map, Lot charts) are not initial and are reported only.
// 2. Committed demo data under app/public/data/demo: total under 5 MB and the per-file maxima of
//    docs/contracts/CONTRACTS.md §4.
//
// Usage, from the repository root, after `npm --prefix app run build`:
//     node scripts/check_bundle_size.mjs            both checks
//     node scripts/check_bundle_size.mjs --data     demo-data check only (no build needed)
// Exit 1 when a budget is exceeded or the build output is missing.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'app', 'dist');
const DEMO = join(ROOT, 'app', 'public', 'data', 'demo');
const KB = 1000;
const INITIAL_JS_BUDGET = 150 * KB; // docs/spec/11: "Initial JavaScript under about 150 KB compressed"
const DEMO_TOTAL_BUDGET = 5 * 1000 * KB; // CONTRACTS §4: "Total committed demo data under 5 MB"
// CONTRACTS §4 per-file maxima, matched on the path relative to app/public/data/demo (forward slashes).
const DEMO_FILE_BUDGETS = [
  [/^manifest\.json$/, 20 * KB],
  [/^farm\.json$/, 100 * KB],
  [/^zones\.geojson$/, 150 * KB],
  [/^catchment\.geojson$/, 150 * KB],
  [/^replay\/\d{4}-\d{2}-\d{2}\.json$/, 40 * KB],
  [/^history\/[^/]+\.json$/, 60 * KB],
  [/^strategies\.json$/, 60 * KB],
  [/^verification\.json$/, 10 * KB],
];

const fmt = (bytes) => `${(bytes / KB).toFixed(1)} kB`;
const failures = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function checkInitialJs() {
  const indexPath = join(DIST, 'index.html');
  if (!existsSync(indexPath)) {
    failures.push('app/dist/index.html not found: run `npm --prefix app run build` first');
    return;
  }
  const html = readFileSync(indexPath, 'utf8');
  const refs = new Set();
  for (const tag of html.match(/<script\b[^>]*>/g) ?? []) {
    const src = tag.match(/\bsrc="([^"]+)"/);
    if (src) refs.add(src[1]);
  }
  for (const tag of html.match(/<link\b[^>]*>/g) ?? []) {
    if (/\brel="modulepreload"/.test(tag)) {
      const href = tag.match(/\bhref="([^"]+)"/);
      if (href) refs.add(href[1]);
    }
  }
  let total = 0;
  const initial = new Set();
  for (const ref of refs) {
    if (/^(https?:)?\/\//.test(ref)) continue; // external scripts are not part of the bundle
    const file = join(DIST, ref.replace(/^\//, ''));
    if (!existsSync(file)) {
      failures.push(`initial script ${ref} referenced by index.html is missing from app/dist`);
      continue;
    }
    initial.add(file);
    const size = gzipSync(readFileSync(file), { level: 9 }).length;
    total += size;
    console.log(`  initial  ${ref.padEnd(40)} ${fmt(size)} gzip`);
  }
  const assets = join(DIST, 'assets');
  if (existsSync(assets)) {
    for (const file of walk(assets).filter((f) => f.endsWith('.js') && !initial.has(f))) {
      const size = gzipSync(readFileSync(file), { level: 9 }).length;
      console.log(`  lazy     /${relative(DIST, file).replaceAll('\\', '/').padEnd(39)} ${fmt(size)} gzip`);
    }
  }
  const verdict = total <= INITIAL_JS_BUDGET ? 'ok' : 'OVER BUDGET';
  console.log(`Initial JS: ${fmt(total)} gzip of ${fmt(INITIAL_JS_BUDGET)} budget: ${verdict}`);
  if (total > INITIAL_JS_BUDGET) failures.push(`initial JS ${fmt(total)} gzip exceeds ${fmt(INITIAL_JS_BUDGET)}`);
}

function checkDemoData() {
  if (!existsSync(DEMO)) {
    console.log('Demo data: app/public/data/demo does not exist yet (0 bytes): ok');
    return;
  }
  let total = 0;
  for (const file of walk(DEMO)) {
    const rel = relative(DEMO, file).replaceAll('\\', '/');
    const size = statSync(file).size;
    total += size;
    const rule = DEMO_FILE_BUDGETS.find(([pattern]) => pattern.test(rel));
    if (rule && size > rule[1]) failures.push(`demo/${rel} is ${fmt(size)}, CONTRACTS §4 max ${fmt(rule[1])}`);
  }
  const verdict = total <= DEMO_TOTAL_BUDGET ? 'ok' : 'OVER BUDGET';
  console.log(`Demo data: ${fmt(total)} of ${fmt(DEMO_TOTAL_BUDGET)} budget: ${verdict}`);
  if (total > DEMO_TOTAL_BUDGET) failures.push(`demo data ${fmt(total)} exceeds ${fmt(DEMO_TOTAL_BUDGET)}`);
}

if (!process.argv.includes('--data')) checkInitialJs();
checkDemoData();
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log('Size gate passed.');
