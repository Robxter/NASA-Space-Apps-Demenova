// The map's Severe moment, "Flood" (CL-29, D-033): it plays once per lot that turns Severe on a forward one-day
// step while the replay plays, and never on drag or keyboard scrub, first load, or with reduced motion (then the
// final state shows at once). Which lots flood is read from the snapshots: Severe on the new day, not Severe the day
// before. A flood is observed in the page as the spill ring (`path.dn-lot-ring`) inserted after the lot's outline.
import { expect, slider, t, test } from '../lib/app';
import { LEVEL_WORDS, levelsOn, lotName, replayDays } from '../lib/demo';
import type { Page } from '@playwright/test';

/** Forward day pair where the most lots turn Severe (the first such pair on a tie). */
function biggestSevereStep(): { from: string; to: string; lots: string[] } {
  const days = replayDays();
  let best: { from: string; to: string; lots: string[] } | null = null;
  for (let i = 1; i < days.length; i++) {
    const before = levelsOn(days[i - 1]!);
    const after = levelsOn(days[i]!);
    const lots = Object.keys(after).filter((id) => after[id] === 'severe' && before[id] !== undefined && before[id] !== 'severe');
    if (lots.length > (best?.lots.length ?? 0)) best = { from: days[i - 1]!, to: days[i]!, lots };
  }
  if (!best) throw new Error('no lot turns Severe in the replay window');
  return best;
}
const STEP = biggestSevereStep();

/** Records every spill ring the page inserts, with the lot outline it follows. */
async function watchFloods(page: Page): Promise<string[]> {
  const floods: string[] = [];
  await page.exposeFunction('__flood', (lot: string) => void floods.push(lot));
  await page.addInitScript(() => {
    new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes)
          if (n instanceof SVGPathElement && n.classList.contains('dn-lot-ring'))
            (window as unknown as { __flood: (l: string) => void }).__flood(
              (n.previousElementSibling?.getAttribute('aria-label') ?? '').split(': ')[0] ?? '',
            );
    }).observe(document, { childList: true, subtree: true });
  });
  return floods;
}

async function openMapOn(page: Page, date: string) {
  await page.goto(`/#map?d=${date}`);
  await page.reload(); // the replay day is read from the hash only when the app loads
  await expect(page.locator('path.leaflet-interactive').first()).toBeVisible();
  await expect(slider(page)).toHaveValue(String(replayDays().indexOf(date)));
}

async function playOneStep(page: Page) {
  await page.getByRole('button', { name: t('en', 'replay.play') }).click();
  await expect(slider(page)).toHaveValue(String(replayDays().indexOf(STEP.to)), { timeout: 5000 });
  await page.getByRole('button', { name: t('en', 'replay.pause') }).click();
  await page.waitForTimeout(1700); // flood 700 ms, spill ring removed by about 1460 ms
}

async function expectSevereNow(page: Page) {
  for (const id of STEP.lots) {
    const shape = page.locator(`path.leaflet-interactive[aria-label="${lotName(id)}: ${LEVEL_WORDS.en.severe}"]`);
    await expect(shape).toHaveAttribute('data-level', 'severe');
  }
}

test(`plays once per lot turning Severe on a played forward step (${STEP.from} to ${STEP.to})`, async ({ page }) => {
  const floods = await watchFloods(page);
  await openMapOn(page, STEP.from);
  expect(floods, 'nothing on first load').toEqual([]);
  await playOneStep(page);
  expect([...floods].sort()).toEqual(STEP.lots.map(lotName).sort());
  await expectSevereNow(page);
  // After the word swap, as many labels read Severe (word and level colour) as lots are Severe that day; labels hidden
  // for overlap (shown on tap) are not counted, so the count is at most that number and at least one.
  const severeLots = Object.values(levelsOn(STEP.to)).filter((l) => l === 'severe').length;
  const severeLabels = page.locator('.leaflet-tooltip.dn-map-label').filter({ hasText: LEVEL_WORDS.en.severe });
  const shown = await severeLabels.count();
  expect(shown).toBeGreaterThanOrEqual(1);
  expect(shown).toBeLessThanOrEqual(severeLots);
  // Map labels take the level ink through the class dn-lvl-<level> on the tooltip (CL-11), not data-level.
  for (let i = 0; i < shown; i++) await expect(severeLabels.nth(i)).toHaveClass(/(^| )dn-lvl-severe( |$)/);
  await expect(page.locator('path.dn-lot-ring'), 'the spill ring is removed afterwards').toHaveCount(0);
});

test('never on first load of the Severe day, keyboard steps or a drag of the scrubber', async ({ page }) => {
  const floods = await watchFloods(page);
  await openMapOn(page, STEP.to);
  await page.waitForTimeout(800);
  expect(floods, 'first load on the Severe day').toEqual([]);

  await openMapOn(page, STEP.from);
  await slider(page).focus();
  await slider(page).press('ArrowRight');
  await page.waitForTimeout(800);
  expect(floods, 'keyboard step forward (not playing)').toEqual([]);
  await slider(page).press('ArrowLeft');
  await page.waitForTimeout(400);
  expect(floods, 'step backward').toEqual([]);

  // A drag starts on the thumb (44 px hit area, as on iOS; ReplayScrubber.tsx HIT) and moves it to 23 Feb.
  const box = (await slider(page).boundingBox())!;
  const HIT = 44;
  const last = replayDays().length - 1;
  const x = (i: number) => box.x + HIT / 2 + (i / last) * (box.width - HIT);
  const y = box.y + box.height / 2;
  const from = Number(await slider(page).inputValue());
  const to = replayDays().indexOf('2026-02-23');
  await page.mouse.move(x(from), y);
  await page.mouse.down();
  for (let i = 1; i <= 24; i++) await page.mouse.move(x(from) + ((x(to) - x(from)) * i) / 24, y);
  await page.mouse.up();
  await page.waitForTimeout(800);
  expect(Number(await slider(page).inputValue()), 'the drag moved the replay past the Severe day').toBeGreaterThan(replayDays().indexOf(STEP.to));
  expect(floods, 'drag across the Severe day').toEqual([]);
  // The map still shows the dragged-to day's levels (from its snapshot), word and colour.
  const day = replayDays()[Number(await slider(page).inputValue())]!;
  for (const [id, level] of Object.entries(levelsOn(day)))
    await expect(page.locator(`path.leaflet-interactive[aria-label="${lotName(id)}: ${LEVEL_WORDS.en[level]}"]`)).toHaveAttribute(
      'data-level',
      level,
    );
});

test('with reduced motion the played step shows the final Severe state and no flood', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const floods = await watchFloods(page);
  await openMapOn(page, STEP.from);
  await playOneStep(page);
  expect(floods).toEqual([]);
  await expect(page.locator('path.leaflet-interactive[style*="url(#dn-flood"]')).toHaveCount(0);
  await expectSevereNow(page);
});
