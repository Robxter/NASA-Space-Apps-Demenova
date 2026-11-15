// Setup in block 4 (D-036): the map stays mounted through every drawing step (8b05454), the "Imagery" select (Satellite
// default, Streets, Relief) on Setup and on the risk map, the CSV template, and CSV import with per-row rejections.
// CSV rows are test inputs written against the parser's rules (app/src/data/csvLots.ts), one fault per bad row; they
// are typed into a throwaway browser profile like a user would, never stored as data.
import { escapeRe, expect, t, test } from '../lib/app';
import { farm } from '../lib/demo';
import type { Page } from '@playwright/test';

const mapBox = (page: Page) => page.getByRole('application', { name: t('en', 'setup.mapLabel') });

async function expectMapShown(page: Page, step: string) {
  const c = page.locator('.leaflet-container').first();
  await expect(c, `${step}: map container present`).toBeVisible();
  const h = (await c.boundingBox())?.height ?? 0;
  expect(h, `${step}: map height`).toBeGreaterThan(100);
}

async function tap(page: Page, dx: number, dy: number) {
  const b = (await mapBox(page).boundingBox())!;
  await mapBox(page).click({ position: { x: b.width / 2 + dx, y: b.height / 2 + dy } });
}

async function dropPin(page: Page, name: string) {
  await page.goto('/#setup');
  await expectMapShown(page, 'open');
  await page.getByLabel(t('en', 'setup.farmName')).fill(name);
  await page.getByRole('button', { name: t('en', 'setup.dropPin') }).click();
  await expectMapShown(page, 'Drop pin');
  await tap(page, 0, 0);
  await page.getByRole('button', { name: t('en', 'setup.savePin') }).click();
  await expectMapShown(page, 'Save pin');
}

test('the Setup map stays visible through Drop pin, Save pin, Draw outline and Draw lot', async ({ page }) => {
  await dropPin(page, 'QA map check');
  await page.getByRole('button', { name: t('en', 'setup.drawOutline') }).click();
  await expectMapShown(page, 'Draw outline');
  for (const [dx, dy] of [[-50, -40], [50, -40], [50, 40], [-50, 40]]) await tap(page, dx, dy);
  await page.getByRole('button', { name: t('en', 'setup.finish') }).click();
  await expectMapShown(page, 'Finish outline');
  await page.getByRole('button', { name: t('en', 'setup.drawLot') }).click();
  await expectMapShown(page, 'Draw lot');
  for (const [dx, dy] of [[-20, -15], [20, -15], [20, 15]]) await tap(page, dx, dy);
  await page.getByRole('button', { name: t('en', 'setup.finish') }).click();
  await expectMapShown(page, 'Finish lot');
});

for (const where of ['#setup', '#map'] as const) {
  test(`Imagery select on ${where}: Satellite by default (NASA GIBS), Streets (OpenStreetMap), Relief`, async ({ page }) => {
    const tiles: string[] = [];
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (/gibs\.earthdata\.nasa\.gov|tile\.openstreetmap\.org/.test(u.hostname)) tiles.push(`${u.hostname}${u.pathname}`);
    });
    await page.goto(`/${where}`);
    const select = page.getByRole('combobox', { name: t('en', 'map.base') });
    await expect(select).toBeVisible();
    await expect(select.locator('option:checked')).toHaveText(t('en', 'map.base.satellite'));
    for (const k of ['map.base.satellite', 'map.base.streets', 'map.base.relief']) await expect(select.locator('option', { hasText: t('en', k) })).toHaveCount(1);
    await expect.poll(() => tiles.filter((x) => x.includes('Landsat_WELD')).length, { message: 'Satellite tiles from GIBS' }).toBeGreaterThan(0);

    await select.selectOption({ label: t('en', 'map.base.streets') });
    await expect.poll(() => tiles.filter((x) => x.startsWith('tile.openstreetmap.org')).length, { message: 'Streets tiles from OSM' }).toBeGreaterThan(0);
    await expect(page.getByText(/OpenStreetMap/).first()).toBeVisible(); // the credit the OSM tile policy asks for

    await select.selectOption({ label: t('en', 'map.base.relief') });
    await expect.poll(() => tiles.filter((x) => x.includes('ASTER_GDEM')).length, { message: 'Relief tiles from GIBS' }).toBeGreaterThan(0);
    await expectMapShown(page, 'after base switches');
  });
}

test('CSV template: the download link serves the header-only template as text/csv', async ({ page, request }) => {
  await dropPin(page, 'QA template');
  const link = page.getByRole('link', { name: t('en', 'setup.csvTemplate') });
  await expect(link).toHaveAttribute('href', /templates\/demenova-lots-template\.csv$/);
  const res = await request.get('/templates/demenova-lots-template.csv');
  expect(res.headers()['content-type']).toContain('text/csv');
  expect((await res.text()).trim()).toBe('lot_name,area_ha,plant_age_months,latitude,longitude,polygon_wkt');
  await expect(page.locator('input[type=file][accept=".csv,text/csv"]')).toHaveCount(1);
});

const HEADER = 'lot_name,area_ha,plant_age_months,latitude,longitude,polygon_wkt';
/** A closed square of side 2d around a point, in WKT (lon lat). */
const square = (lon: number, lat: number, d: number) =>
  `POLYGON((${lon - d} ${lat - d}, ${lon + d} ${lat - d}, ${lon + d} ${lat + d}, ${lon - d} ${lat + d}, ${lon - d} ${lat - d}))`;

async function importCsv(page: Page, name: string, text: string) {
  await page.locator('input[type=file][accept=".csv,text/csv"]').setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(text) });
}

test('CSV import: a good file adds a typed lot and a drawn lot', async ({ page }) => {
  await dropPin(page, 'QA csv good');
  const [lon, lat] = farm.farm.location.coordinates as [number, number];
  const csv = [HEADER, 'QA csv typed,2.5,8,,,', `QA csv shape,,,${lat},${lon},"${square(lon, lat, 0.001)}"`].join('\r\n');
  await importCsv(page, 'good.csv', csv);
  const status = page.locator('[role=status]');
  await expect(status).toContainText(t('en', 'setup.csvImported', { n: 2, rejected: 0 }));
  await expect(status.locator('li')).toHaveCount(0);
  const typed = page.getByRole('listitem').filter({ hasText: 'QA csv typed' });
  await expect(typed).toContainText(t('en', 'setup.lotNoShape'));
  await expect(typed).toContainText('2.5ha');
  await expect(typed.getByText(t('en', 'origin.provided'), { exact: true })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'QA csv shape' })).toContainText(t('en', 'setup.lotDrawn'));
  await expect(page.locator('.leaflet-tooltip', { hasText: 'QA csv shape' })).toBeVisible();
});

test('CSV import: bad rows are rejected one by one with their line and reason; nothing is added', async ({ page }) => {
  await dropPin(page, 'QA csv bad');
  const [lon, lat] = farm.farm.location.coordinates as [number, number];
  const d = 0.001;
  const open = `POLYGON((${lon - d} ${lat - d}, ${lon + d} ${lat - d}, ${lon + d} ${lat + d}, ${lon - d} ${lat + d}))`;
  const rows: [string, string][] = [
    [',1.5,10,,,', t('en', 'setup.csvReason.name_missing')],
    ['QA bad comma,"1,5",,,,', t('en', 'setup.csvReason.decimal_comma', { column: 'area_ha' })],
    ['QA bad age,,700,,,', t('en', 'setup.csvReason.range', { column: 'plant_age_months' })],
    [`QA bad pair,,,${lat},,`, t('en', 'setup.csvReason.latlon_pair')],
    [`QA bad ring,,,,,"${open}"`, t('en', 'setup.csvReason.not_closed')],
    [`QA bad point,,,${lat + 0.5},${lon + 0.5},"${square(lon, lat, d)}"`, t('en', 'setup.csvReason.outside')],
  ];
  await importCsv(page, 'bad.csv', [HEADER, ...rows.map((r) => r[0])].join('\n'));
  const status = page.locator('[role=status]');
  await expect(status).toContainText(t('en', 'setup.csvImported', { n: 0, rejected: rows.length }));
  const lines = status.locator('li');
  await expect(lines).toHaveCount(rows.length);
  for (const [i, [, reason]] of rows.entries())
    await expect(lines.nth(i)).toHaveText(new RegExp(`^${escapeRe(t('en', 'setup.csvRow', { line: i + 2, reason }))}$`));
  for (const name of ['QA bad comma', 'QA bad age', 'QA bad pair', 'QA bad ring', 'QA bad point'])
    await expect(page.getByRole('listitem').filter({ hasText: name })).toHaveCount(0);

  await importCsv(page, 'noheader.csv', 'name,area\nx,1\n');
  await expect(status).toContainText(t('en', 'setup.csvHeader'));
});
