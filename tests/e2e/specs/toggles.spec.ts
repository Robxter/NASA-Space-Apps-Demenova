// Units (display only; stored SI unchanged), farmer/agronomist mode and data saver.
import { readFileSync } from 'node:fs';
import { card, expect, open, shot, t, test } from '../lib/app';
import { bannerUnit, DEMO_DAY, farm, fmt } from '../lib/demo';
import type { Page } from '@playwright/test';

const unit = bannerUnit(DEMO_DAY)!;
const lot = farm.lots.find((l: any) => l.id === unit.unit_id);
const lotHash = `#lot/${encodeURIComponent(unit.unit_id)}`;

async function setPref(page: Page, group: string, option: string) {
  await page.goto('/#settings');
  await page.getByRole('radiogroup', { name: group }).getByRole('radio', { name: option }).click();
  await expect(page.getByRole('radiogroup', { name: group }).getByRole('radio', { name: option })).toHaveAttribute('aria-checked', 'true');
}

test('units: imperial converts what is shown; the stored SI values and the CSV stay in SI', async ({ page }) => {
  const rain = unit.features?.rain_local_mm as number | null;
  test.skip(rain === null || rain === undefined, 'needs a lot with local rain on the demo day');
  await page.goto(`/${lotHash}`);
  const today = (d: string) => card(page, `${t('en', 'lot.today')}, ${d}`);
  const rainCell = (d: string) => today(d).locator('span[title]').filter({ hasText: t('en', 'lot.rainLocal') });
  await expect(rainCell('23/02/2026')).toContainText(`${fmt(rain!, 1)}mm`);

  await setPref(page, t('en', 'settings.units'), t('en', 'settings.units.imperial'));
  await page.goto(`/${lotHash}`);
  await expect(rainCell('02/23/2026')).toContainText(`${fmt(rain! / 25.4, 2)}in`);
  if (typeof lot.area_ha === 'number') {
    const acres = (lot.area_ha * 10000) / 4046.8564224;
    await expect(card(page, t('en', 'lot.facts')).getByRole('listitem').filter({ hasText: t('en', 'lot.area') })).toContainText(
      `${fmt(acres, 1)}ac`,
    );
  }
  await shot(page, 'lot-imperial');

  // Stored values: preferences hold the choice only; the records export keeps the snapshot's SI number.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('demenova.prefs.v1') ?? '{}'));
  expect(stored.units).toBe('imperial');
  await page.goto('/#settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: t('en', 'records.export') }).click(),
  ]);
  const csv = readFileSync((await download.path())!, 'utf-8').split('\n');
  const header = (csv[0] ?? '').split(',');
  const line = csv.find((l) => l.startsWith(`${DEMO_DAY},${unit.unit_id},`));
  expect(line, 'CSV has the demo day for the lot').toBeTruthy();
  const cells = line!.split(',');
  expect(Number(cells[header.indexOf('rain_local_mm')])).toBe(rain);
});

test('mode: farmer hides W numbers and the agronomist detail; agronomist shows them', async ({ page }) => {
  await open(page);
  const lots = card(page, t('en', 'home.lots'));
  await expect(lots.locator('.dn-num').first()).toBeVisible();
  await setPref(page, t('en', 'settings.mode'), t('en', 'settings.mode.farmer'));
  await open(page);
  await expect(lots.getByRole('listitem').first()).toBeVisible();
  await expect(lots.locator('.dn-num')).toHaveCount(0);
  await page.goto(`/${lotHash}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp(`^${t('en', 'lot.today')}`) })).toHaveCount(0);
  await shot(page, 'home-farmer');
});

test('data saver: the choice persists across reloads and the replay still loads', async ({ page }) => {
  await setPref(page, t('en', 'settings.storage'), t('en', 'settings.storage.saver'));
  await page.reload();
  await expect(page.getByRole('radio', { name: t('en', 'settings.storage.saver') })).toHaveAttribute('aria-checked', 'true');
  await open(page);
  await expect(card(page, t('en', 'home.lots')).getByRole('listitem').first()).toBeVisible();
  await page.goto(`/${lotHash}`);
  await expect(card(page, t('en', 'lot.history')).getByRole('radio', { name: t('en', 'lot.range.1w') })).toBeVisible();
});
