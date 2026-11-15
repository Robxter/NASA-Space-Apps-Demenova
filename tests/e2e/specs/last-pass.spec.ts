// Coverage for the last bounded pass of block 3 (D-033, 2231e63 and ee721cf): Home two columns from 1024 px with the
// same content and order, farmer-mode Home (distill), the two new empty-state actions (onboard), map labels not covering
// a neighbouring lot (T-070 / R-11), and the service worker leaving /about/ to the network.
import {
  card,
  expect,
  expectRowLevel,
  homeRow,
  numbersWithoutOrigin,
  open,
  slider,
  t,
  test,
} from '../lib/app';
import { bannerUnit, DEMO_DAY, eventsUntil, levelsOn, LEVEL_WORDS, lotName, readDemo, replayDays, type Lang } from '../lib/demo';
import type { Page } from '@playwright/test';

/** Headings, banner and lot rows in DOM order: the content a reader meets, whatever the layout. */
async function readingOrder(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('main h1, main h2, main button[data-level], main li')].map((el) =>
      ((el as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
    ),
  );
}

test('Home at 1440 shows two columns with the same content and reading order as at 360, every number badged', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-1440', 'desktop layout');
  await page.setViewportSize({ width: 360, height: 780 });
  await open(page);
  await expect(card(page, t('en', 'home.lots')).getByRole('listitem').first()).toBeVisible();
  const narrow = await readingOrder(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(card(page, t('en', 'home.lots')).getByRole('listitem').first()).toBeVisible();
  const wide = await readingOrder(page);
  expect(wide, 'same content in the same DOM order at 1440 as at 360').toEqual(narrow);

  const status = (await card(page, t('en', 'home.statusCard')).boundingBox())!;
  const lots = (await card(page, t('en', 'home.lots')).boundingBox())!;
  expect(status.x + status.width, 'status card in the left column').toBeLessThanOrEqual(lots.x + 1);
  expect(lots.y, 'lots card beside the status card, not below it').toBeLessThan(status.y + status.height);
  expect((await numbersWithoutOrigin(page)).offenders).toEqual([]);
});

for (const lang of ['en', 'es'] as Lang[]) {
  test.describe(`farmer mode, ${lang}`, () => {
    test.use({ prefs: { language: lang, units: 'metric', mode: 'farmer', storage_mode: 'full', theme: 'light' } });
    test('Home keeps the level word, the check for that level and the lots; no W numbers', async ({ page }, info) => {
      test.skip(info.project.name !== 'android-360', 'phone layout');
      const unit = bannerUnit(DEMO_DAY)!;
      await open(page, '#home', lang);
      const banner = page.locator('main button[data-level]');
      await expect(banner).toHaveAttribute('data-level', unit.alert.level);
      await expect(banner).toContainText(`${LEVEL_WORDS[lang][unit.alert.level]}, ${lotName(unit.unit_id)}`);
      // The check is the farmer wording for the banner's level, as written in actions.json.
      const entry = readDemo('actions.json').actions.find((a: any) => a.level === unit.alert.level && a.mode === 'farmer');
      const check = card(page, t(lang, 'check.title'));
      await expect(check).toContainText(entry.text[lang]);
      await expect(check.getByText(t(lang, 'strategies.notReviewed'), { exact: true })).toBeVisible();
      // distill: with a banner, no second status card.
      await expect(card(page, t(lang, 'home.statusCard'))).toHaveCount(0);
      for (const [id, level] of Object.entries(levelsOn(DEMO_DAY))) await expectRowLevel(homeRow(page, lotName(id), lang), level, lang);
      await expect(card(page, t(lang, 'home.lots')).locator('.dn-num')).toHaveCount(0);
    });
  });
}

test('empty Alerts offers "Play the replay", and it plays until level changes appear', async ({ page }) => {
  const first = replayDays()[0]!;
  test.skip(eventsUntil(first).length !== 0, 'needs a first replay day without level changes');
  await page.goto(`/#alerts?d=${first}`);
  await page.reload();
  await expect(slider(page)).toHaveValue('0');
  const action = page.getByRole('button', { name: t('en', 'alerts.emptyAction') });
  await expect(action).toBeVisible();
  await action.click();
  // The first day with level changes, from the snapshots.
  const firstWithEvents = replayDays().find((d) => eventsUntil(d).length > 0)!;
  await expect(slider(page)).toHaveValue(String(replayDays().indexOf(firstWithEvents)), { timeout: 10_000 });
  await page.getByRole('button', { name: t('en', 'replay.pause') }).click();
  await expect(card(page, t('en', 'alerts.log')).getByRole('listitem')).toHaveCount(eventsUntil(firstWithEvents).length);
});

test('a missing replay day offers "Show the next day with data", which opens that day', async ({ page }) => {
  const missing = '2026-02-22';
  const next = replayDays()[replayDays().indexOf(missing) + 1]!;
  // The file for one day is missing (as if never published); everything else is the committed snapshot set.
  await page.context().route(`**/data/demo/replay/${missing}.json`, (r) => r.fulfill({ status: 404, body: 'not found' }));
  await page.goto(`/#home?d=${missing}`);
  await page.reload();
  await expect(slider(page)).toHaveValue(String(replayDays().indexOf(missing)));
  await expect(page.getByText(t('en', 'home.dayMissing'))).toBeVisible();
  await page.getByRole('button', { name: t('en', 'home.dayMissingAction') }).click();
  await expect(slider(page)).toHaveValue(String(replayDays().indexOf(next)));
  for (const [id, level] of Object.entries(levelsOn(next))) await expectRowLevel(homeRow(page, lotName(id)), level, 'en');
});

test('map at 360 on 23 Feb: no lot label covers a neighbouring lot, and each label shows its own lot level', async ({ page }, info) => {
  test.skip(info.project.name !== 'android-360', 'T-070 was measured at 360 px');
  await page.goto(`/#map?d=${DEMO_DAY}`);
  await page.reload();
  await expect(page.locator('.leaflet-tooltip.dn-map-label').first()).toBeVisible();
  await page.waitForTimeout(500);
  const res = await page.evaluate(() => {
    const paths = [...document.querySelectorAll('path.leaflet-interactive')] as SVGPathElement[];
    const labels = [...document.querySelectorAll('.leaflet-tooltip.dn-map-label')].filter((l) => l.getClientRects().length);
    const cx = (r: DOMRect) => (r.left + r.right) / 2;
    // A label belongs to the lot it is centred on, just above or just below it.
    const owner = (lr: DOMRect) =>
      paths
        .map((p) => {
          const r = p.getBoundingClientRect();
          return { p, d: Math.abs(cx(lr) - cx(r)) + Math.min(Math.abs(lr.bottom - r.top), Math.abs(lr.top - r.bottom)) };
        })
        .sort((a, b) => a.d - b.d)[0]!.p;
    const covers: string[] = [];
    const words: string[] = [];
    for (const l of labels) {
      const lr = l.getBoundingClientRect();
      const own = owner(lr);
      const [lot, word] = (own.getAttribute('aria-label') ?? '').split(': ');
      words.push(`${lot}=${(l as HTMLElement).innerText.trim()}/${word}`);
      for (const p of paths) {
        if (p === own) continue;
        const r = p.getBoundingClientRect();
        const w = Math.min(r.right, lr.right) - Math.max(r.left, lr.left);
        const h = Math.min(r.bottom, lr.bottom) - Math.max(r.top, lr.top);
        if (w > 0 && h > 0) covers.push(`${lot}'s label covers ${(p.getAttribute('aria-label') ?? '').split(': ')[0]}`);
      }
    }
    return { covers, words };
  });
  expect(res.covers).toEqual([]);
  for (const w of res.words) {
    const [, pair] = w.split('=');
    const [shown, level] = pair!.split('/');
    expect(shown, w).toBe(level);
  }
  expect(res.words.length, 'one label per lot').toBe(Object.keys(levelsOn(DEMO_DAY)).length);
});

test('the service worker leaves /about/ to the network (404 when absent, the page when present, never the app shell)', async ({ page, context }) => {
  await open(page);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker?.controller), { timeout: 20_000 }).toBe(true);

  // Absent: Render has no rewrite rule (render.yaml), so a missing /about/ is a 404 there; the local server would fall
  // back to index.html, so the route answers as Render does.
  await context.route('**/about/**', (r) => r.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' }));
  const absent = await page.goto('/about/');
  expect(absent?.status()).toBe(404);
  expect(absent?.fromServiceWorker(), 'not answered by the service worker').toBe(false);
  await expect(page.locator('#root')).toHaveCount(0);
  await context.unroute('**/about/**');

  // Present (the build under test may carry a draft About page): served by the network, not the app shell.
  const present = await page.goto('/about/');
  expect(present?.fromServiceWorker()).toBe(false);
  if (present?.status() === 200) await expect(page.locator('#root'), 'the About page, not the app shell').toHaveCount(0);

  // Offline: the service worker does not invent an About page from the app shell either.
  await page.goto('/#home');
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker?.controller)).toBe(true);
  await context.setOffline(true);
  const offline = await page.goto('/about/').catch(() => null);
  expect(offline?.fromServiceWorker() ?? false, 'offline /about/ is not served from the precache').toBe(false);
  await context.setOffline(false);
});
