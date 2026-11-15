// Screens of SPEC 18 on the replay's opening day. Every expected value is read from the snapshots (lib/demo.ts).
import { card, escapeRe, expect, expectLevel, expectRowLevel, levelWord, numbersWithoutOrigin, open, shot, t, test } from '../lib/app';
import {
  bannerUnit,
  DEMO_DAY,
  eventsUntil,
  farm,
  fmt,
  glossary,
  levelsOn,
  lotName,
  lots,
  lotUnits,
  manifest,
  readDemo,
  strategies,
  type Level,
} from '../lib/demo';

const unit = bannerUnit(DEMO_DAY)!; // the lot a judge taps first: the banner's lot
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const originOf = (u: { features: Record<string, any> | null }, key: string): string | null =>
  u.features ? (u.features.origin?.[key] ?? u.features.origin?.['*'] ?? null) : null;

test.describe('Home', () => {
  test('header, status card counts and highest W match the snapshot', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(farm.farm.name);
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    await expect(page.locator('header').first()).toContainText(/Updated \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    const units = lotUnits(DEMO_DAY);
    const status = card(page, t('en', 'home.statusCard'));
    for (const level of ['normal', 'watch', 'warning', 'severe'] as Level[]) {
      const n = units.filter((u) => u.alert.level === level).length;
      await expect(status.locator('li', { has: page.locator(`[data-level="${level}"]`) })).toContainText(String(n));
    }
    const top = Math.max(...units.map((u) => u.alert.w ?? -1));
    await expect(status).toContainText(fmt(top, 2));
    await shot(page, 'home');
  });

  test('banner opens the lot it names', async ({ page }) => {
    await open(page);
    await page.locator('main button[data-level]').click();
    await expect(page).toHaveURL(new RegExp(`#lot/${encodeURIComponent(unit.unit_id)}`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(lotName(unit.unit_id));
  });
});

test.describe('Map', () => {
  test('lots carry level colour and word; layers switch; the sheet opens the lot', async ({ page }) => {
    await open(page, '#map');
    const levels = levelsOn(DEMO_DAY);
    await expect(page.locator('path.leaflet-interactive')).toHaveCount(lots.length);
    for (const [id, level] of Object.entries(levels)) {
      const shape = page.locator(`path[aria-label="${lotName(id)}: ${t('en', `level.${level}`)}"]`);
      await expect(shape).toHaveCount(1);
      await expect(shape).toHaveAttribute('data-level', level);
    }
    await expect(page.locator('.leaflet-tooltip').first()).toBeVisible();
    await expect(page.getByText(t('en', 'common.dataFrom', { time: dmy(DEMO_DAY) }))).toBeVisible();
    await expect(page.getByText(/Built with NASA Earth observations/)).toBeVisible();
    await shot(page, 'map-level');

    await page.getByRole('radio', { name: t('en', 'map.layer.terrain') }).click();
    for (const l of farm.lots) {
      const word = l.twi_tercile ? t('en', `tercile.${l.twi_tercile}`) : t('en', 'common.noData');
      await expect(page.locator(`path[aria-label="${l.name}: ${word}"]`)).toHaveCount(1);
    }
    await page.getByRole('radio', { name: t('en', 'map.layer.rain') }).click();
    for (const u of lotUnits(DEMO_DAY)) {
      const v = u.features?.rain_local_mm;
      const o = originOf(u, 'rain_local_mm');
      // CL-07 (D-033, T-068): value and origin are joined with a comma, e.g. "66.1 mm, Sourced".
      const label =
        typeof v === 'number' && o
          ? escapeRe(`${fmt(v, 1)} mm, ${t('en', `origin.${o}`)}`)
          : escapeRe(t('en', 'common.noData'));
      const shape = page.locator(`path[aria-label^="${lotName(u.unit_id)}: "]`);
      await expect(shape).toHaveCount(1);
      await expect(shape).toHaveAttribute('aria-label', new RegExp(`^${escapeRe(lotName(u.unit_id))}: ${label}$`));
    }
    await page.getByRole('radio', { name: t('en', 'map.layer.level') }).click();

    const shape = page.locator(`path[aria-label^="${lotName(unit.unit_id)}: "]`);
    await shape.dispatchEvent('click');
    const sheet = page.locator('div.shadow-sheet', { has: page.getByRole('button', { name: t('en', 'map.openLot') }) });
    await expect(sheet.getByRole('heading', { level: 2 })).toHaveText(lotName(unit.unit_id));
    await expectLevel(levelWord(sheet), unit.alert.level, 'en');
    await expect(sheet).toContainText(fmt(unit.alert.w!, 2));
    await shot(page, 'map-sheet');
    await sheet.getByRole('button', { name: t('en', 'map.openLot') }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(lotName(unit.unit_id));
  });
});

test.describe('Lot detail', () => {
  test('level, W, factors with shares, today values, charts, facts and strategies button', async ({ page }) => {
    await page.goto(`/#lot/${encodeURIComponent(unit.unit_id)}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(lotName(unit.unit_id));
    await expectLevel(levelWord(page.locator('header')), unit.alert.level, 'en');
    await expect(page.locator('header')).toContainText(t('en', 'lot.confidence', { n: unit.alert.confidence }));
    await expect(page.locator('main')).toContainText(fmt(unit.alert.w!, 2));

    // Why: factors sorted by share, each with its share of W.
    const why = card(page, t('en', 'lot.why')).getByRole('listitem');
    const factors = [...unit.alert.factors].sort((a, b) => b.share - a.share);
    await expect(why).toHaveCount(factors.length);
    for (const [i, f] of factors.entries()) {
      await expect(why.nth(i)).toContainText(t('en', `factor.${f.name}`));
      await expect(why.nth(i)).toContainText(`${fmt(f.share * 100, 0)}%`);
    }

    // Today: missing values say "No data", never 0.
    const today = card(page, `${t('en', 'lot.today')}, ${dmy(DEMO_DAY)}`);
    const fields: [string, string, number][] = [
      ['rain_local_mm', 'lot.rainLocal', 1],
      ['rain_upstream_24h_mm', 'lot.rainUp24', 1],
      ['soil_moisture', 'lot.soilMoisture', 0],
      ['balance_7d_mm', 'lot.balance7d', 1],
    ];
    for (const [key, label, dec] of fields) {
      const cell = today.locator('span[title]').filter({ hasText: t('en', label) });
      const v = unit.features?.[key];
      if (v === null || v === undefined) await expect(cell).toContainText(t('en', 'common.noData'));
      else await expect(cell).toContainText(key === 'soil_moisture' ? `${fmt(v * 100, dec)}%` : `${fmt(v, dec)}mm`);
    }

    // History: 1W/1M/3M switch and four charts; a series with no value in the window says "No data".
    const history = card(page, t('en', 'lot.history'));
    for (const r of ['1w', '1m', '3m']) await expect(history.getByRole('radio', { name: t('en', `lot.range.${r}`) })).toBeVisible();
    const hist = readDemo(`history/${unit.unit_id}.json`);
    const end = hist.dates.filter((d: string) => d <= DEMO_DAY).length;
    for (const [field, label] of [
      ['rain_local_mm', 'lot.chart.rain'],
      ['soil_moisture', 'lot.chart.soil'],
      ['temp_mean_c', 'lot.chart.temp'],
      ['ndvi', 'lot.chart.ndvi'],
    ] as const) {
      const block = history.getByRole('heading', { level: 3, name: t('en', label), exact: true }).locator('xpath=../..');
      const any = (hist.series[field] as (number | null)[]).slice(Math.max(0, end - 30), end).some((v) => v !== null);
      if (any) await expect(block.locator('canvas').first()).toBeVisible();
      else await expect(block).toContainText(t('en', 'common.noData'));
    }

    // Facts: synthetic area shows the Demo label; missing facts say "No data".
    const lot = farm.lots.find((l: any) => l.id === unit.unit_id);
    const facts = card(page, t('en', 'lot.facts'));
    const area = facts.getByRole('listitem').filter({ hasText: t('en', 'lot.area') });
    if (lot.area_ha === null) await expect(area).toContainText(t('en', 'common.noData'));
    else await expect(area).toContainText(`${fmt(lot.area_ha, 1)}ha`);
    if (lot.area_ha_origin === 'synthetic') await expect(area.getByTitle('Example data')).toBeVisible();
    if (lot.plant_age_months === null)
      await expect(facts.getByRole('listitem').filter({ hasText: t('en', 'lot.age') })).toContainText(t('en', 'common.noData'));
    await shot(page, 'lot-detail');

    const { offenders } = await numbersWithoutOrigin(page);
    expect(offenders).toEqual([]);

    await page.getByRole('button', { name: t('en', 'lot.strategies') }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('en', 'strategies.title'));
  });
});

test.describe('Strategies', () => {
  test('three options, not-reviewed badge, cost and labour not estimated, fixed footer', async ({ page }) => {
    await page.goto(`/#strategies/${encodeURIComponent(unit.unit_id)}`);
    const own = strategies.strategies.filter((s: any) => s.lot_scope.includes(unit.unit_id));
    const list = (own.length ? own : strategies.strategies.filter((s: any) => s.lot_scope.includes('*'))).sort(
      (a: any, b: any) => a.label.localeCompare(b.label),
    );
    expect(list.length, 'strategies.json offers three options for the lot').toBe(3);
    const titles = page.getByRole('heading', { level: 2 });
    await expect(titles).toHaveCount(3);
    for (const [i, s] of list.entries()) await expect(titles.nth(i)).toContainText(t('en', `strategies.title.${s.label}`));

    const notReviewed = page.getByText(t('en', 'strategies.notReviewed'), { exact: true });
    await expect(notReviewed).toHaveCount(list.filter((s: any) => !s.approved_by).length);
    const sourced = new Set(['sourced', 'calibrated', 'provided', 'observed']);
    const notEstimated = list.reduce(
      (n: number, s: any) => n + ['cost', 'labour'].filter((k) => !(s.scores[k].value !== null && sourced.has(s.scores[k].origin))).length,
      0,
    );
    await expect(page.getByText(t('en', 'strategies.notEstimated'), { exact: true })).toHaveCount(notEstimated);

    await page.getByText(t('en', 'strategies.details')).first().click();
    for (const k of ['strategies.why', 'strategies.evidence', 'strategies.benefits', 'strategies.gaps', 'strategies.risks'])
      await expect(page.getByRole('heading', { level: 3, name: t('en', k) }).first()).toBeVisible();

    const footer = page.getByRole('note');
    await expect(footer).toHaveText(t('en', 'strategies.disclaimer'));
    await expect(footer).toBeInViewport();
    const tabs = page.getByRole('navigation', { name: t('en', 'tab.nav') });
    const fb = (await footer.boundingBox())!;
    const tb = (await tabs.boundingBox())!;
    expect(fb.y + fb.height, 'footer sits above the tab bar').toBeLessThanOrEqual(tb.y + 1);
    // Scrolled to the end, the last content is not hidden under the fixed footer.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const last = page.locator('main > div > div > *').last();
    const lb = (await last.boundingBox())!;
    const fb2 = (await footer.boundingBox())!;
    expect(lb.y + lb.height, 'last strategy content clears the footer').toBeLessThanOrEqual(fb2.y + 1);
    await shot(page, 'strategies');
  });

  test('every number on Strategies carries an origin badge and a timestamp', async ({ page }) => {
    await page.goto(`/#strategies/${encodeURIComponent(unit.unit_id)}`);
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(3);
    const { offenders } = await numbersWithoutOrigin(page);
    expect(offenders).toEqual([]);
  });
});

test.describe('Alerts', () => {
  test('log of level changes up to the replay day, newest first, with level word and colour', async ({ page }) => {
    await open(page, '#alerts');
    const events = eventsUntil(DEMO_DAY);
    const rows = card(page, t('en', 'alerts.log')).getByRole('listitem');
    await expect(rows).toHaveCount(events.length);
    for (const [i, e] of events.slice(0, 3).entries()) {
      await expect(rows.nth(i)).toContainText(lotName(e.unit_id));
      await expect(rows.nth(i)).toContainText(
        t('en', 'alerts.change', { from: t('en', `level.${e.from_level}`), to: t('en', `level.${e.to_level}`) }),
      );
      await expectRowLevel(rows.nth(i), e.to_level, 'en');
    }
    await shot(page, 'alerts');
    const { offenders } = await numbersWithoutOrigin(page);
    expect(offenders).toEqual([]);
  });
});

test.describe('Learn', () => {
  test('glossary cards labelled as general guidance, dataset sources, NASA credit in words', async ({ page }) => {
    await page.goto('/#learn');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('en', 'learn.title'));
    await expect(page.getByText(t('en', 'learn.general'))).toBeVisible();
    const terms = glossary.terms.filter((x: any) => x.term?.en?.trim() && x.definition?.en?.trim());
    expect(terms.length).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { level: 2 }).filter({ hasNotText: t('en', 'learn.datasets') })).toHaveCount(terms.length);
    await expect(page.getByText(t('en', 'learn.notReviewed'), { exact: false })).toHaveCount(terms.length + 1);
    const datasets = new Set(manifest.provenance.filter((p: any) => p.dataset).map((p: any) => p.dataset));
    const ds = card(page, t('en', 'learn.datasets'));
    for (const d of datasets) await expect(ds.getByText(d as string, { exact: true })).toBeVisible();
    await expect(page.getByText(t('en', 'app.credit'), { exact: true })).toBeVisible();
    await shot(page, 'learn');
  });
});
