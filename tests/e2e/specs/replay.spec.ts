// Acceptance (blocks release): the replay 2026-01-20..2026-03-05 of the 22-23 Feb 2026 Buenavista flood.
// Expected lots, levels and dates come from the committed snapshots (lib/demo.ts), never from a guess.
import { card, expect, expectLevel, homeRow, numbersWithoutOrigin, open, scrubTo, shot, slider, t, test } from '../lib/app';
import {
  bannerUnit,
  DEMO_DAY,
  escalations,
  LEVEL_WORDS,
  levelsOn,
  lotName,
  replayDays,
  topFactor,
  transitionDays,
  type Lang,
  type Level,
} from '../lib/demo';
import type { Page } from '@playwright/test';

async function expectDay(page: Page, date: string, lang: Lang, colours?: Map<Level, Set<string>>) {
  for (const [id, level] of Object.entries(levelsOn(date))) {
    const badge = homeRow(page, lotName(id), lang).locator('[data-level]').first();
    await expectLevel(badge, level, lang);
    if (colours) {
      const c = await badge.evaluate((el) => getComputedStyle(el).color);
      colours.set(level, (colours.get(level) ?? new Set()).add(c));
    }
  }
  const expected = bannerUnit(date);
  const banner = page.locator('main button[data-level]');
  if (!expected) {
    await expect(banner, `${date}: no lot is Warning or Severe, so no banner`).toHaveCount(0);
    return;
  }
  await expect(banner).toHaveCount(1);
  await expect(banner).toHaveAttribute('data-level', expected.alert.level);
  await expect(banner).toContainText(`${LEVEL_WORDS[lang][expected.alert.level]}, ${lotName(expected.unit_id)}`);
  const f = topFactor(expected);
  if (f) await expect(banner).toContainText(t(lang, 'home.topFactor', { factor: t(lang, `factor.${f.name}`) }));
}

test.describe('Replay acceptance', () => {
  test('opens on 23 Feb 2026 with each lot at its snapshot level and the banner with its top factor', async ({ page }) => {
    await open(page);
    const s = slider(page);
    await expect(s).toHaveValue(String(replayDays().indexOf(DEMO_DAY)));
    await expect(s).toHaveAttribute('aria-valuetext', /Feb 23, 2026/);
    await expectDay(page, DEMO_DAY, 'en');
    await shot(page, 'replay-home-2026-02-23-en');
  });

  test('scrubbing 20 Jan to 23 Feb escalates Watch, Warning, Severe on the snapshot dates (colour and word)', async ({ page }) => {
    const chain = escalations(DEMO_DAY);
    expect(chain.length, 'the snapshots contain at least one lot going Watch, Warning, Severe by 23 Feb').toBeGreaterThan(0);
    await open(page);
    const colours = new Map<Level, Set<string>>();
    const first = replayDays()[0] as string;
    await scrubTo(page, first);
    await expect(slider(page)).toHaveAttribute('aria-valuetext', /Jan 20, 2026/);
    for (const d of transitionDays(DEMO_DAY)) {
      await scrubTo(page, d);
      await expectDay(page, d, 'en', colours);
    }
    // Colour: one colour per level, and different levels never share a colour.
    const seen = [...colours.entries()];
    for (const [level, set] of seen) expect(set.size, `${level} badges use one colour`).toBe(1);
    const all = seen.map(([, set]) => [...set][0]);
    expect(new Set(all).size, `distinct colours for ${seen.map(([l]) => l).join(', ')}`).toBe(seen.length);
    // Screenshots of the first escalating lot at each stage.
    const c = chain[0]!;
    for (const stage of ['watch', 'warning', 'severe'] as const) {
      await scrubTo(page, c[stage]);
      await expectLevel(homeRow(page, lotName(c.id)).locator('[data-level]').first(), stage, 'en');
      await shot(page, `replay-${stage}-${c[stage]}`);
    }
  });

  test('Spanish words on the replay: Vigilancia, Aviso, Severo', async ({ page }) => {
    // Language is switched through Settings, the way a user does it.
    await open(page, '#settings');
    await page.getByRole('radio', { name: 'Español' }).click();
    await page.goto('/#home');
    await expect(slider(page, 'es')).toBeVisible();
    await expectDay(page, DEMO_DAY, 'es');
    const c = escalations(DEMO_DAY)[0]!;
    for (const stage of ['watch', 'warning', 'severe'] as const) {
      await scrubTo(page, c[stage], 'es');
      await expectLevel(homeRow(page, lotName(c.id), 'es').locator('[data-level]').first(), stage, 'es');
    }
    await scrubTo(page, DEMO_DAY, 'es');
    await shot(page, 'replay-home-2026-02-23-es');
  });

  test('every number on Home carries an origin badge and a timestamp', async ({ page }) => {
    await open(page);
    await expect(card(page, t('en', 'home.lots')).getByRole('listitem').first()).toBeVisible();
    const { offenders } = await numbersWithoutOrigin(page);
    expect(offenders).toEqual([]);
  });

  test('the Demo label is visible on the synthetic farm and in the replay control', async ({ page }) => {
    await open(page);
    // The chip reads "Demo" with the hint "Example data" as its tooltip and spoken text.
    const header = page.locator('header').first();
    await expect(header.getByTitle('Example data')).toBeVisible();
    await expect(header.getByTitle('Example data')).toContainText(/^Demo/);
    const dock = page.locator('section', { has: slider(page) });
    await expect(dock.getByTitle('Example data')).toBeVisible();
    // Every lot name of the synthetic farm says it is a demo lot.
    const ids = Object.keys(levelsOn(DEMO_DAY));
    await expect(card(page, t('en', 'home.lots')).getByRole('listitem')).toHaveCount(ids.length);
    for (const id of ids) {
      expect(lotName(id)).toMatch(/\(demo\)/i);
      await expect(homeRow(page, lotName(id))).toBeVisible();
    }
  });
});
