// Page-side helpers and the shared fixture for the e2e suite. Owner: qa-demo-engineer (T-044).
import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { dictionary, LEVEL_WORDS, replayDays, type Lang, type Level } from './demo';

export const EN = dictionary('en');
export const ES = dictionary('es');
export const DICT: Record<Lang, Record<string, string>> = { en: EN, es: ES };

const PREFS_KEY = 'demenova.prefs.v1';

/**
 * Every test starts in English, metric, agronomist mode, light theme, unless it sets prefs itself.
 * Nothing leaves the machine: requests to any host other than the local server are aborted, so a build with
 * Supabase keys can never receive test farms, and NASA GIBS tiles never make a run depend on the network.
 */
export const test = base.extend<{ prefs: Record<string, string> }>({
  prefs: [{ language: 'en', units: 'metric', mode: 'agronomist', storage_mode: 'full', theme: 'light' }, { option: true }],
  context: async ({ context, prefs, baseURL }, use) => {
    const origin = new URL(baseURL as string).origin;
    await context.route(
      (url) => url.origin !== origin,
      (route) => route.abort('blockedbyclient'),
    );
    await context.addInitScript(
      ([key, value]) => {
        if (!localStorage.getItem(key as string)) localStorage.setItem(key as string, value as string);
      },
      [PREFS_KEY, JSON.stringify(prefs)],
    );
    await use(context);
  },
});
export { expect };

export const t = (lang: Lang, key: string, params: Record<string, string | number> = {}) => {
  const raw = DICT[lang][key];
  if (raw === undefined) throw new Error(`no key ${key} in ${lang}`);
  return raw.replace(/\{(\w+)\}/g, (m, n: string) => (n in params ? String(params[n]) : m));
};

/** Opens a hash route and waits until the demo snapshot is loaded (the replay slider is on Home/Alerts/Map). */
export async function open(page: Page, hash = '#home', lang: Lang = 'en'): Promise<void> {
  await page.goto(`/${hash}`);
  if (/^#(home|alerts|map)?(\?|$)/.test(hash) || hash === '') {
    await expect(slider(page, lang)).toBeVisible({ timeout: 20_000 });
  }
}

export const slider = (page: Page, lang: Lang = 'en') =>
  page.getByRole('slider', { name: lang === 'en' ? 'Replay day' : 'Día de la reproducción' });

/** Moves the replay to a day with the keyboard (a real input path; React sees real events). */
export async function scrubTo(page: Page, date: string, lang: Lang = 'en'): Promise<void> {
  const days = replayDays();
  const target = days.indexOf(date);
  if (target < 0) throw new Error(`${date} is outside the replay window`);
  const s = slider(page, lang);
  const current = Number(await s.inputValue());
  await s.focus();
  const key = target > current ? 'ArrowRight' : 'ArrowLeft';
  for (let i = 0; i < Math.abs(target - current); i++) await s.press(key);
  await expect(s).toHaveValue(String(target));
}

/** The list card on Home whose heading is `heading`. */
export const card = (page: Page, heading: string): Locator =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: heading, exact: true }) });

export const homeRow = (page: Page, lotName: string, lang: Lang = 'en'): Locator =>
  card(page, t(lang, 'home.lots'))
    .getByRole('listitem')
    .filter({ has: page.getByText(lotName, { exact: true }) });

/** Asserts a level badge carries the level both as colour (data-level drives the token) and as the word. */
export async function expectLevel(badge: Locator, level: Level, lang: Lang): Promise<void> {
  await expect(badge).toHaveAttribute('data-level', level);
  await expect(badge).toHaveText(LEVEL_WORDS[lang][level]);
}

/** Visible text of the page, without screen-reader-only text and without passages marked lang="en". */
export async function visibleText(page: Page, opts: { dropEnglishQuotes?: boolean } = {}): Promise<string> {
  return page.evaluate((drop) => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.sr-only, script, style, noscript').forEach((n) => n.remove());
    if (drop) clone.querySelectorAll('[lang="en"]').forEach((n) => n.remove());
    // Leaflet tooltips are visible text too; cloneNode keeps them.
    document.body.appendChild(clone);
    clone.style.position = 'absolute';
    clone.style.left = '-99999px';
    const text = clone.innerText;
    clone.remove();
    return text;
  }, opts.dropEnglishQuotes ?? false);
}

/** Opens every <details> on the page (strategy cards) so their text is checked too. */
export async function expandAll(page: Page): Promise<void> {
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => ((d as HTMLDetailsElement).open = true)));
}

/**
 * Rule zero, acceptance: every number rendered by a value component (.dn-num) carries an origin (visible badge
 * plus tooltip) and a timestamp (tooltip "Updated <date time>"). The replay day label and the per-level tallies
 * on Home are not values and are returned separately.
 */
export async function numbersWithoutOrigin(page: Page): Promise<{ offenders: string[]; tallies: number }> {
  return page.evaluate(() => {
    const ORIGIN = /\b(Sourced|Calibrated|Provided|Observed|Estimated|Demo|Design|Pending)\b/;
    const BADGE = /^(Sourced|Calibrated|Provided|Observed|Estimated|Demo|Design|Pending)$/;
    const STAMP = /Updated \d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2}/;
    const offenders: string[] = [];
    let tallies = 0;
    const ownText = (el: Element) =>
      [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent ?? '').join('').trim();
    for (const el of document.querySelectorAll('.dn-num')) {
      const text = (el as HTMLElement).innerText.trim();
      if (!/\d/.test(text) || el.getClientRects().length === 0) continue;
      let a: Element | null = el;
      let scrubber = false;
      for (let i = 0; i < 5 && a; i++, a = a.parentElement) if (a.querySelector('input[type=range]')) scrubber = true;
      if (scrubber) continue;
      if (el.previousElementSibling?.hasAttribute('data-level')) {
        tallies += 1;
        continue;
      }
      const wrap = el.closest('[title]');
      const title = wrap?.getAttribute('title') ?? '';
      const scope = wrap?.parentElement ?? wrap;
      const badge = scope
        ? [...scope.querySelectorAll('span')].some(
            (s) => !s.closest('.sr-only') && s.getBoundingClientRect().width > 1 && BADGE.test(ownText(s)),
          )
        : false;
      const where = el.closest('section')?.querySelector('h2,h3')?.textContent ?? document.querySelector('h1')?.textContent ?? '';
      if (!ORIGIN.test(title)) offenders.push(`"${text}" in "${where}": no origin in tooltip`);
      else if (!badge) offenders.push(`"${text}" in "${where}": no visible origin badge`);
      else if (!STAMP.test(title)) offenders.push(`"${text}" in "${where}": no timestamp (tooltip: ${title})`);
    }
    return { offenders, tallies };
  });
}

/** Placeholders that must never stand in for a missing value. */
export const PLACEHOLDERS = /\bNaN\b|\bundefined\b|\bnull\b|\bInfinity\b|\[object Object\]/;

/** Dictionary keys that leaked as text, e.g. "lot.why". */
export function rawKeys(text: string, lang: Lang): string[] {
  return Object.keys(DICT[lang]).filter((k) => new RegExp(`(^|[^\\w.])${k.replace(/\./g, '\\.')}($|[^\\w.])`).test(text));
}

/**
 * Strings of the other language still on screen: fragments (split at {placeholders}) of the other dictionary's
 * values that differ between languages, at least two words long, matched as whole words.
 */
export function otherLanguageLeaks(text: string, lang: Lang): string[] {
  const mine = DICT[lang];
  const other = DICT[lang === 'en' ? 'es' : 'en'];
  const hits: string[] = [];
  for (const [k, v] of Object.entries(other)) {
    if (mine[k] === v) continue;
    for (const frag of v.split(/\{\w+\}/)) {
      const f = frag.trim().replace(/[.,:;·]+$/, '').trim();
      if (f.split(/\s+/).length < 2) continue;
      if (Object.values(mine).some((m) => m.includes(f))) continue; // same words in both languages
      const re = new RegExp(`(^|[^\\p{L}])${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'u');
      if (re.test(text)) hits.push(`${k}: "${f}"`);
    }
  }
  return hits;
}

/** Screenshot into test-results with a stable name per project, for the report and the device checklist. */
export async function shot(page: Page, name: string): Promise<void> {
  const info = test.info();
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: false });
}
