// Every screen in English and Spanish: no raw dictionary keys, no strings left in the other language, no
// NaN/undefined/null placeholders, no NASA logo, the credit in words, and the former team agronomist never named.
import {
  expandAll,
  expect,
  otherLanguageLeaks,
  PLACEHOLDERS,
  rawKeys,
  shot,
  slider,
  t,
  test,
  visibleText,
} from '../lib/app';
import { bannerUnit, DEMO_DAY, formerAgronomistName, type Lang } from '../lib/demo';
import type { Page } from '@playwright/test';

const unit = bannerUnit(DEMO_DAY)!;
const LOT = encodeURIComponent(unit.unit_id);
const NAME = formerAgronomistName();

const SCREENS: { name: string; hash: string; ready: (p: Page, l: Lang) => Promise<void> }[] = [
  { name: 'home', hash: '#home', ready: (p, l) => expect(slider(p, l)).toBeVisible() },
  { name: 'map', hash: '#map', ready: (p) => expect(p.locator('.leaflet-tooltip').first()).toBeVisible() },
  {
    name: 'lot',
    hash: `#lot/${LOT}`,
    ready: async (p, l) => {
      await expect(p.getByRole('heading', { level: 3, name: t(l, 'lot.chart.rain'), exact: true })).toBeVisible();
    },
  },
  {
    name: 'reliability',
    hash: `#lot/${LOT}`,
    ready: async (p, l) => {
      await p.getByRole('button', { name: t(l, 'reliability.open') }).click();
      await expect(p.getByRole('dialog').getByRole('heading', { name: t(l, 'reliability.counts') })).toBeVisible();
    },
  },
  {
    name: 'strategies',
    hash: `#strategies/${LOT}`,
    ready: async (p) => {
      await expect(p.getByRole('heading', { level: 3 })).toHaveCount(3);
      await expandAll(p);
    },
  },
  { name: 'alerts', hash: '#alerts', ready: (p, l) => expect(slider(p, l)).toBeVisible() },
  { name: 'learn', hash: '#learn', ready: (p, l) => expect(p.getByText(t(l, 'learn.datasets'))).toBeVisible() },
  { name: 'settings', hash: '#settings', ready: (p, l) => expect(p.getByRole('heading', { name: t(l, 'records.title') })).toBeVisible() },
  { name: 'setup', hash: '#setup', ready: (p, l) => expect(p.getByText(t(l, 'setup.step.pin'), { exact: false })).toBeVisible() },
];

for (const lang of ['en', 'es'] as Lang[]) {
  test.describe(`all screens in ${lang}`, () => {
    test.use({ prefs: { language: lang, units: 'metric', mode: 'agronomist', storage_mode: 'full', theme: 'light' } });
    for (const s of SCREENS) {
      test(`${s.name}: translated, no raw keys, no placeholders, no logo, no former agronomist`, async ({ page }) => {
        await page.goto(`/${s.hash}`);
        await s.ready(page, lang);
        await page.waitForTimeout(300); // let lazy cards (history, sheet) settle
        const text = await visibleText(page, { dropEnglishQuotes: lang === 'es' });
        expect(rawKeys(text, lang), 'raw dictionary keys on screen').toEqual([]);
        // Domain content (strategies, glossary) keeps the local plant name "maní forrajero" in English on purpose
        // (written next to its scientific name, Arachis pintoi); only that dictionary entry is exempt, only there.
        const exempt = ['strategies', 'learn'].includes(s.name) ? ['cover.mani_forrajero'] : [];
        const leaks = otherLanguageLeaks(text, lang).filter((l) => !exempt.some((k) => l.startsWith(`${k}:`)));
        expect(leaks, `strings not in ${lang}`).toEqual([]);
        expect(text.match(PLACEHOLDERS)?.[0] ?? null, 'placeholder in place of a value').toBeNull();
        expect(text.includes(NAME), 'former team agronomist named on screen (D-027)').toBe(false);
        expect(await page.evaluate(() => document.documentElement.lang)).toBe(lang);
        const logos = await page.evaluate(
          () =>
            // Map imagery tiles come from gibs.earthdata.nasa.gov: they are data, not a logo.
            [...document.querySelectorAll('img:not(.leaflet-tile), svg, [role="img"], image, object, embed')].filter((el) =>
              /nasa|meatball/i.test(
                [el.getAttribute('src'), el.getAttribute('alt'), el.getAttribute('aria-label'), el.getAttribute('href'), el.querySelector?.('title')?.textContent]
                  .filter(Boolean)
                  .join(' '),
              ),
            ).length,
        );
        expect(logos, 'no NASA logo or NASA-labelled image').toBe(0);
        if (['learn', 'settings'].includes(s.name)) await expect(page.getByText(t(lang, 'app.credit'), { exact: true })).toBeVisible();
        if (s.name === 'map') await expect(page.getByText(/Built with NASA Earth observations|observaciones de la Tierra de la NASA/)).toBeVisible();
        await shot(page, `${s.name}-${lang}`);
      });
    }
  });
}
