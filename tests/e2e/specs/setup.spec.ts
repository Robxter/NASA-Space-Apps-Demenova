// Farm setup, data levels 0-2 (SPEC 18 Onboarding, SPEC Data modes): pin, outline with zones, lots typed and
// imported from GeoJSON, with the confidence badge. Inputs are what a user would type in this throwaway browser
// profile (origin provided); nothing leaves the machine (lib/app.ts aborts every non-local request).
import { escapeRe, expect, shot, t, test } from '../lib/app';
import { farm, fmt } from '../lib/demo';
import type { Page } from '@playwright/test';

const badge = (page: Page) => page.locator('header').getByText(/^Data level \d/);
// CL-07 (D-033, T-068): the badge joins level and confidence with a comma, e.g. "Data level 0, low confidence".
const confidence = (n: number, level: string) =>
  new RegExp(
    `^${escapeRe(t('en', 'setup.level', { n }))}${escapeRe(', ')}${escapeRe(t('en', 'setup.confidence', { level: t('en', `confidence.${level}`) }))}$`,
  );

async function tapMap(page: Page, dx: number, dy: number) {
  const map = page.getByRole('application', { name: t('en', 'setup.mapLabel') });
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: box.width / 2 + dx, y: box.height / 2 + dy } });
}

test('levels 0 to 2 from Settings: pin, outline, typed lot, GeoJSON import, confidence badge, reset', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await page.goto('/#home');
  await page.getByRole('link', { name: t('en', 'home.settings') }).click();
  await page.getByRole('button', { name: t('en', 'settings.farmSetup') }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('en', 'setup.title'));
  await expect(badge(page)).toHaveText(confidence(0, 'low'));

  // Level 0: a pin.
  await page.getByLabel(t('en', 'setup.farmName')).fill('QA test farm');
  await page.getByRole('button', { name: t('en', 'setup.dropPin') }).click();
  await tapMap(page, 0, 0);
  await page.getByRole('button', { name: t('en', 'setup.savePin') }).click();
  await expect(page.getByText('QA test farm', { exact: true })).toBeVisible();
  await expect(badge(page)).toHaveText(confidence(0, 'low'));
  await expect(page.getByText(t('en', 'setup.deviceOnly'))).toBeVisible();
  await shot(page, 'setup-level0');

  // Level 1: an outline; zones are either shown (engine computed them here) or said to need an engine run.
  await page.getByRole('button', { name: t('en', 'setup.drawOutline') }).click();
  for (const [dx, dy] of [[-60, -50], [60, -50], [60, 50], [-60, 50]]) await tapMap(page, dx, dy);
  await expect(page.getByText(t('en', 'setup.tapShape', { n: 4 }))).toBeVisible();
  await page.getByRole('button', { name: t('en', 'setup.finish') }).click();
  await expect(badge(page)).toHaveText(confidence(1, 'medium_low'));
  await expect(page.getByText(new RegExp(`${t('en', 'setup.zonesShown')}|${t('en', 'setup.zonesPending')}`))).toBeVisible();
  await shot(page, 'setup-level1');

  // Level 2: a typed lot (name, area, age) with its Provided badge.
  await page.getByLabel(t('en', 'setup.lotName')).fill('QA typed lot');
  await page.getByLabel(t('en', 'setup.lotArea', { unit: 'ha' })).fill('2.5');
  await page.getByLabel(t('en', 'setup.lotAge')).fill('8');
  await page.getByRole('button', { name: t('en', 'setup.typeLot') }).click();
  await expect(page.getByText(t('en', 'setup.typedSaved'))).toBeVisible();
  await expect(badge(page)).toHaveText(confidence(2, 'medium'));
  const typed = page.getByRole('listitem').filter({ hasText: 'QA typed lot' });
  await expect(typed).toContainText(t('en', 'setup.lotNoShape'));
  await expect(typed).toContainText(`${fmt(2.5, 1)}ha`);
  await expect(typed.getByText(t('en', 'origin.provided'), { exact: true })).toBeVisible();

  // Level 2: a GeoJSON import (a square of about 200 m around the pin the test dropped, built here as user input).
  const [lon, lat] = farm.farm.location.coordinates as [number, number];
  const d = 0.001;
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'QA imported lot' },
        geometry: { type: 'Polygon', coordinates: [[[lon - d, lat - d], [lon + d, lat - d], [lon + d, lat + d], [lon - d, lat + d], [lon - d, lat - d]]] },
      },
      { type: 'Feature', properties: { name: 'not a polygon' }, geometry: { type: 'Point', coordinates: [lon, lat] } },
    ],
  };
  await page.locator('input[type=file][accept*="geojson"]').setInputFiles({
    name: 'qa-lots.geojson',
    mimeType: 'application/geo+json',
    buffer: Buffer.from(JSON.stringify(geojson)),
  });
  await expect(page.getByText(t('en', 'setup.imported', { n: 1, skipped: 1 }))).toBeVisible();
  const imported = page.getByRole('listitem').filter({ hasText: 'QA imported lot' });
  await expect(imported).toContainText(t('en', 'setup.lotDrawn'));
  await expect(imported).toContainText(t('en', 'common.noData')); // no area typed: missing, never derived
  await expect(page.locator('.leaflet-tooltip', { hasText: 'QA imported lot' })).toBeVisible();
  await shot(page, 'setup-level2');

  // Kept on the device across a reload.
  await page.reload();
  await expect(badge(page)).toHaveText(confidence(2, 'medium'));
  await expect(page.getByRole('listitem').filter({ hasText: 'QA typed lot' })).toBeVisible();

  // Bad file: a clear message, nothing added.
  await page.locator('input[type=file][accept*="geojson"]').setInputFiles({ name: 'bad.geojson', mimeType: 'application/json', buffer: Buffer.from('{not json') });
  await expect(page.getByText(t('en', 'setup.importNotJson'))).toBeVisible();

  // Reset to the demo farm.
  await page.getByRole('button', { name: t('en', 'setup.reset') }).click();
  await expect(page.getByText(t('en', 'setup.resetDone'))).toBeVisible();
  await expect(badge(page)).toHaveText(confidence(0, 'low'));
});
