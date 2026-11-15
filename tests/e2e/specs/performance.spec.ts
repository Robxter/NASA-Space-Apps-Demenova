// Performance on an emulated mid-range Android phone (D-026): 360x780, CPU 4x slowdown, network throttled via CDP.
// The initial-JS budget itself is gated in CI by scripts/check_bundle_size.mjs (T-029).
// Network profiles: Chrome DevTools presets as recalled from DevTools' NetworkManager (Slow 4G: 1.6 Mbps x 0.9 down,
// 750 kbps x 0.9 up, 150 ms x 3.75 latency; Fast 4G: 9 Mbps x 0.9 down, 1.5 Mbps x 0.9 up, 60 ms x 2.75 latency).
// UNVERIFIED against the current Chrome source (no web access in the run that wrote this); test parameters, not data.
// Run alone: npx playwright test --grep @perf --workers=1 (parallel workers share the CPU and skew the times).
// "Usable" = the Home banner and the lot list of the opening day are on screen (SPEC 18 Home 2 and 4).
import { card, expect, t, test } from '../lib/app';
import { bannerUnit, DEMO_DAY } from '../lib/demo';
import type { Page } from '@playwright/test';

const PROFILES = {
  'Slow 4G': { latency: 150 * 3.75, downloadThroughput: (1.6 * 1000 * 1000) / 8 * 0.9, uploadThroughput: (750 * 1000) / 8 * 0.9 },
  'Fast 4G': { latency: 60 * 2.75, downloadThroughput: (9 * 1000 * 1000) / 8 * 0.9, uploadThroughput: (1.5 * 1000 * 1000) / 8 * 0.9 },
} as const;

async function timeToUsable(page: Page, profile: keyof typeof PROFILES): Promise<number> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...PROFILES[profile] });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await page.goto('/#home', { waitUntil: 'commit' });
  if (bannerUnit(DEMO_DAY)) await expect(page.locator('main button[data-level]')).toBeVisible({ timeout: 45_000 });
  await expect(card(page, t('en', 'home.lots')).getByRole('listitem').first()).toBeVisible({ timeout: 45_000 });
  const ms = Date.now() - t0;
  test.info().annotations.push({ type: `time to usable, ${profile} + CPU 4x`, description: `${ms} ms` });
  console.log(`[perf] ${test.info().project.name} ${profile} + CPU 4x: usable after ${ms} ms`);
  return ms;
}

test.describe('performance (emulated Android)', () => {
  test.describe.configure({ mode: 'serial' }); // one throttled page at a time, so the runs do not share the CPU
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'android-360', 'Android emulation profile only'));
  test.setTimeout(90_000);

  test('usable on a cold load under Slow 4G and CPU 4x @perf', async ({ page }) => {
    const ms = await timeToUsable(page, 'Slow 4G');
    expect(ms).toBeLessThan(45_000);
  });

  test('usable in under 3 s on a cold load under Fast 4G and CPU 4x (SPEC 11 performance budget) @perf', async ({ page }) => {
    const ms = await timeToUsable(page, 'Fast 4G');
    expect(ms, 'SPEC 11: usable in under 3 seconds on a mid-range Android phone over 4G').toBeLessThan(3000);
  });
});
