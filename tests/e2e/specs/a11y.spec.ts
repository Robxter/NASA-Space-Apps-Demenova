// Accessibility checks of the D-033 upgrade (brief C1 step 7; impeccable reference/audit.md "Accessibility" and
// "Responsive", review-animations STANDARDS.md "Gestures & drag" and "Accessibility" used as checklists):
// keyboard order and visible focus, 44 px targets, contrast of every severity word on its background in both themes,
// the reliability dialog (Escape, Close, drag to dismiss, focus return) and lang following the language.
import { expect, open, slider, t, test } from '../lib/app';
import { bannerUnit, DEMO_DAY } from '../lib/demo';
import type { Page } from '@playwright/test';

const LOT = encodeURIComponent(bannerUnit(DEMO_DAY)!.unit_id);

/** Tabs through the page and returns, per stop, its name, whether a focus indicator is drawn, and its position. */
async function tabStops(page: Page, max: number) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const stops: { name: string; visible: boolean; y: number; fixed: boolean }[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1;
      const ring = cs.boxShadow !== 'none';
      let fixed = false;
      for (let a: HTMLElement | null = el; a; a = a.parentElement) if (getComputedStyle(a).position === 'fixed') fixed = true;
      const name = (el.getAttribute('aria-label') ?? el.innerText ?? el.getAttribute('name') ?? el.tagName).trim().slice(0, 40);
      return { name: `${el.tagName.toLowerCase()} "${name}"`, visible: outline || ring, y: el.getBoundingClientRect().top + window.scrollY, fixed };
    });
    if (!s) break;
    stops.push(s);
  }
  return stops;
}

for (const hash of ['#home', '#setup']) {
  test(`keyboard: ${hash} has a visible focus indicator on every stop, DOM order, no positive tabindex`, async ({ page }) => {
    await page.goto(`/${hash}`);
    if (hash === '#home') await expect(slider(page)).toBeVisible();
    else await expect(page.getByRole('application')).toBeVisible();
    expect(await page.locator('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').count(), 'positive tabindex').toBe(0);
    const stops = await tabStops(page, 40);
    expect(stops.length).toBeGreaterThan(5);
    expect(stops.filter((s) => !s.visible).map((s) => s.name), 'stops without a visible focus indicator').toEqual([]);
    // Reading order: in-flow stops never jump back up the page (fixed bars are excluded).
    const flow = stops.filter((s) => !s.fixed);
    for (let i = 1; i < flow.length; i++)
      expect(flow[i]!.y, `${flow[i]!.name} comes after ${flow[i - 1]!.name}`).toBeGreaterThanOrEqual(flow[i - 1]!.y - 2);
    if (hash === '#home') {
      expect(stops[0]!.name, 'skip link first').toContain(t('en', 'app.skip'));
      expect(stops.some((s) => s.name.includes(t('en', 'tab.learn'))), 'the tab bar is reachable').toBe(true);
    }
  });
}

test('targets: tab bar, play, scrubber, map sheet close and dialog close are at least 44 x 44 px', async ({ page }) => {
  const atLeast44 = async (label: string, loc: ReturnType<Page['locator']>) => {
    const b = (await loc.boundingBox())!;
    expect(Math.round(b.width), `${label} width`).toBeGreaterThanOrEqual(44);
    expect(Math.round(b.height), `${label} height`).toBeGreaterThanOrEqual(44);
  };
  await open(page);
  const tabs = page.getByRole('navigation', { name: t('en', 'tab.nav') }).getByRole('link');
  await expect(tabs).toHaveCount(4);
  for (let i = 0; i < 4; i++) await atLeast44(`tab ${i + 1}`, tabs.nth(i));
  await atLeast44('play', page.getByRole('button', { name: t('en', 'replay.play') }));
  const s = (await slider(page).boundingBox())!;
  expect(Math.round(s.height), 'scrubber height').toBeGreaterThanOrEqual(44);

  await page.goto('/#map');
  await expect(page.locator('path.leaflet-interactive').first()).toBeVisible();
  await page.locator('path.leaflet-interactive').first().dispatchEvent('click');
  await atLeast44('map sheet close', page.getByRole('button', { name: t('en', 'common.close') }));

  await page.goto(`/#lot/${LOT}`);
  await page.getByRole('button', { name: t('en', 'reliability.open') }).click();
  await atLeast44('dialog close', page.getByRole('dialog').getByRole('button', { name: t('en', 'common.close') }));
});

for (const theme of ['light', 'dark'] as const) {
  test.describe(`contrast in ${theme}`, () => {
    test.use({ prefs: { language: 'en', units: 'metric', mode: 'agronomist', storage_mode: 'full', theme } });
    test('every severity word reaches 4.5:1 on its own background (Home, Lot, Map, Alerts)', async ({ page }) => {
      const low: string[] = [];
      const checked: Record<string, number> = {};
      for (const hash of ['#home', `#lot/${LOT}`, '#map', '#alerts']) {
        await page.goto(`/${hash}`);
        if (hash === '#map') await expect(page.locator('.leaflet-tooltip').first()).toBeVisible();
        else await expect(page.locator('[data-level]:not([aria-hidden="true"])').first()).toBeVisible();
        const res = await page.evaluate((where) => {
            const ctx = document.createElement('canvas').getContext('2d')!;
            const rgba = (c: string): number[] => {
              ctx.clearRect(0, 0, 1, 1);
              ctx.fillStyle = '#000';
              ctx.fillStyle = c;
              ctx.fillRect(0, 0, 1, 1);
              const d = ctx.getImageData(0, 0, 1, 1).data;
              return [d[0]!, d[1]!, d[2]!, d[3]! / 255];
            };
            const lum = ([r, g, b]: number[]) =>
              [r!, g!, b!]
                .map((v) => v / 255)
                .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
                .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0);
            const background = (el: Element): number[] => {
              const layers: number[][] = [];
              for (let a: Element | null = el; a; a = a.parentElement) {
                const c = rgba(getComputedStyle(a).backgroundColor);
                if (c[3]! > 0) layers.push(c);
                if (c[3]! >= 1) break;
              }
              let out = rgba(getComputedStyle(document.body).backgroundColor);
              if (out[3] === 0) out = [255, 255, 255, 1];
              for (const l of layers.reverse()) out = out.map((v, i) => (i < 3 ? l[i]! * l[3]! + v * (1 - l[3]!) : 1));
              return out;
            };
            const words = /^(Normal|Watch|Warning|Severe|Out of date)\b/;
            const found: string[] = [];
            let n = 0;
            const els = [
              ...document.querySelectorAll('[data-level]:not([aria-hidden="true"])'),
              ...document.querySelectorAll('.dn-map-label'),
            ];
            for (const el of els) {
              if (!(el instanceof HTMLElement)) continue; // map lot outlines (SVG paths) carry data-level, not text
              const text = el.innerText.trim();
              if (!words.test(text) || el.getClientRects().length === 0) continue;
              n += 1;
              const fg = rgba(getComputedStyle(el).color);
              const bg = background(el);
              const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
              const ratio = (a! + 0.05) / (b! + 0.05);
              if (ratio < 4.5) found.push(`${where}: "${text.slice(0, 30)}" ${ratio.toFixed(2)}:1`);
            }
            return { found, n };
          }, hash);
        low.push(...res.found);
        checked[hash] = res.n;
      }
      for (const [hash, n] of Object.entries(checked)) expect(n, `severity words measured on ${hash}`).toBeGreaterThan(0);
      expect(low, 'severity words under 4.5:1').toEqual([]);
    });
  });
}

test('reliability dialog: Escape and Close close it and return focus; a downward drag dismisses it', async ({ page }) => {
  await page.goto(`/#lot/${LOT}`);
  const opener = page.getByRole('button', { name: t('en', 'reliability.open') });
  const dialog = page.getByRole('dialog', { name: t('en', 'reliability.title') });

  await opener.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await dialog.getByRole('button', { name: t('en', 'common.close') }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  // Drag the sheet's header down by half the viewport (past the 35 % distance rule).
  await opener.click();
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(400); // let the opening slide finish
  const head = (await dialog.getByRole('heading', { name: t('en', 'reliability.title') }).boundingBox())!;
  const vh = page.viewportSize()!.height;
  await page.mouse.move(head.x + 8, head.y + head.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 15; i++) await page.mouse.move(head.x + 8, head.y + head.height / 2 + (vh * 0.5 * i) / 15);
  await page.mouse.up();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

for (const lang of ['en', 'es'] as const) {
  test.describe(`lang ${lang}`, () => {
    test.use({ prefs: { language: lang, units: 'metric', mode: 'agronomist', storage_mode: 'full', theme: 'light' } });
    test('the html lang attribute follows the language', async ({ page }) => {
      await open(page, '#home', lang);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
    });
  });
}
