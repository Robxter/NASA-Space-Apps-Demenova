// Release-candidate guard: the build under test must carry the committed snapshots. A stale app/dist would make
// every other test check old data. Fix: npm --prefix app run build
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DEMO_DIR, REPO } from '../lib/demo';

const DIST_DEMO = join(REPO, 'app', 'dist', 'data', 'demo');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');

test('app/dist carries the same demo snapshots as app/public/data/demo', async ({}, info) => {
  test.skip(info.project.name !== 'android-360', 'file check, once per run');
  expect(existsSync(DIST_DEMO), 'app/dist exists (run npm --prefix app run build)').toBe(true);
  const stale = files(DEMO_DIR)
    .map((p) => relative(DEMO_DIR, p))
    .filter((rel) => !existsSync(join(DIST_DEMO, rel)) || sha(join(DIST_DEMO, rel)) !== sha(join(DEMO_DIR, rel)));
  expect(stale, 'files that differ between the build and the committed snapshots').toEqual([]);
});
