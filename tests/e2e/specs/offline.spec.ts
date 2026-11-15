// Offline (ADR-004): load once, go offline, reload. The replay still works from the device copy and says so.
import { card, expect, expectRowLevel, homeRow, open, scrubTo, shot, slider, t, test } from '../lib/app';
import { DEMO_DAY, escalations, levelsOn, lotName, replayDays } from '../lib/demo';

test('after one online visit the app reopens offline with the replay and "offline, data from …"', async ({ page, context }) => {
  await open(page);
  // The service worker controls the page (app shell precached) ...
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker?.controller), { timeout: 20_000 }).toBe(true);
  // ... and every replay day, the manifest and the farm are saved in IndexedDB.
  const saved = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const r = indexedDB.open('demenova');
          r.onsuccess = () => {
            const db = r.result;
            if (!db.objectStoreNames.contains('snapshots')) return resolve(0);
            const c = db.transaction('snapshots').objectStore('snapshots').count();
            c.onsuccess = () => resolve(c.result);
            c.onerror = () => resolve(0);
          };
          r.onerror = () => resolve(0);
        }),
    );
  await expect.poll(saved, { timeout: 20_000 }).toBeGreaterThanOrEqual(replayDays().length + 2);

  await context.setOffline(true);
  await page.reload();
  await expect(slider(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('status').first()).toContainText(/Offline, showing data from \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
  for (const [id, level] of Object.entries(levelsOn(DEMO_DAY)))
    await expectRowLevel(homeRow(page, lotName(id)), level, 'en');
  await shot(page, 'offline-home');

  // The replay still scrubs offline.
  const c = escalations(DEMO_DAY)[0]!;
  await scrubTo(page, c.warning);
  await expectRowLevel(homeRow(page, lotName(c.id)), 'warning', 'en');

  // Lot detail (a lazy chunk) opens offline.
  await homeRow(page, lotName(c.id)).getByRole('button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(lotName(c.id));
  await expect(card(page, t('en', 'lot.why'))).toBeVisible();
  await shot(page, 'offline-lot');
  await context.setOffline(false);
});
