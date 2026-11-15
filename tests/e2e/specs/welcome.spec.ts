// Welcome page at the site root (block 4, D-036): tabs, App Access on every tab, no demo data before entering the app,
// the intro video slot read from site.json, the back links from the app, the PWA start_url, and Instructions.pdf
// (never answered with the app shell, also with the service worker active). YouTube is never contacted: the fixture
// aborts every non-local request and the tests only read the iframe address.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, open, slider, t, test } from '../lib/app';
import { REPO } from '../lib/demo';
import type { Page } from '@playwright/test';

/** Copy the Welcome page shows, read from its source files (app/src/screens/Welcome/content.<lang>.ts). */
function welcomeCopy(lang: 'en' | 'es') {
  const src = readFileSync(join(REPO, 'app', 'src', 'screens', 'Welcome', `content.${lang}.ts`), 'utf-8');
  const str = (re: RegExp) => (re.exec(src)?.[1] ?? '').replace(/\\'/g, "'");
  return {
    appAccess: str(/appAccess:\s*'((?:[^'\\]|\\.)*)'/),
    tabs: {
      home: str(/tabs:\s*\{\s*home:\s*'((?:[^'\\]|\\.)*)'/),
      instructions: str(/instructions:\s*'((?:[^'\\]|\\.)*)'/),
      qa: str(/qa:\s*'((?:[^'\\]|\\.)*)'/),
    },
  };
}

const TABS = [
  { hash: '', tab: 'home' },
  { hash: '#welcome', tab: 'home' },
  { hash: '#welcome/instructions', tab: 'instructions' },
  { hash: '#welcome/qa', tab: 'qa' },
] as const;

/** Records every request for demo snapshot data. */
function watchDemoData(page: Page): string[] {
  const seen: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.includes('/data/demo/')) seen.push(new URL(r.url()).pathname);
  });
  return seen;
}

for (const lang of ['en', 'es'] as const) {
  test.describe(`Welcome, ${lang}`, () => {
    test.use({ prefs: { language: lang, units: 'metric', mode: 'agronomist', storage_mode: 'full', theme: 'light' } });
    test('every tab opens at its hash with App Access; no demo data is requested before entering the app', async ({ page }) => {
      const c = welcomeCopy(lang);
      const demoData = watchDemoData(page);
      for (const { hash, tab } of TABS) {
        await page.goto(`/${hash}`);
        await expect(page.getByTestId(`welcome-tab-${tab}`)).toHaveAttribute('aria-current', 'page');
        await expect(page.getByTestId(`welcome-tab-${tab}`)).toContainText(c.tabs[tab]);
        await expect(page.getByTestId('welcome-app-access').first()).toContainText(c.appAccess);
        await expect(page.locator('[lang]').first()).toHaveAttribute('lang', lang);
      }
      for (const tab of ['home', 'instructions', 'qa'] as const) {
        await page.getByTestId(`welcome-tab-${tab}`).click();
        await expect(page).toHaveURL(new RegExp(tab === 'home' ? '#welcome$' : `#welcome/${tab}$`));
        await expect(page.getByTestId('welcome-app-access').first()).toBeVisible();
      }
      await page.waitForTimeout(500);
      expect(demoData, 'Welcome makes no request under /data/demo/').toEqual([]);

      await page.getByTestId('welcome-app-access').first().click();
      await expect(page).toHaveURL(/#home$/);
      await expect(slider(page, lang)).toBeVisible();
      expect(demoData.length, 'entering the app loads the demo data').toBeGreaterThan(0);
    });
  });
}

test('the language switch on Welcome changes the copy and the page language', async ({ page }) => {
  await page.goto('/#welcome');
  await expect(page.getByTestId('welcome-app-access').first()).toContainText(welcomeCopy('en').appAccess);
  await page.getByRole('radio', { name: 'ES' }).click();
  await expect(page.getByTestId('welcome-app-access').first()).toContainText(welcomeCopy('es').appAccess);
  await expect(page.getByTestId('welcome-tab-qa')).toContainText(welcomeCopy('es').tabs.qa);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

test('app hashes still open the app, and the app links back to Welcome from Home and Settings', async ({ page }) => {
  await open(page, '#home');
  await page.getByTestId('back-to-welcome').click();
  await expect(page.getByTestId('welcome-app-access').first()).toBeVisible();
  await page.goto('/#settings');
  await page.getByTestId('settings-welcome').click();
  await expect(page.getByTestId('welcome-app-access').first()).toBeVisible();
  for (const hash of ['#map', '#alerts', '#learn']) {
    await page.goto(`/${hash}`);
    await expect(page.getByRole('navigation', { name: t('en', 'tab.nav') })).toBeVisible();
    await expect(page.getByTestId('welcome-app-access')).toHaveCount(0);
  }
});

test.describe('intro video from site.json', () => {
  const VIDEO_ID = 'QAtestId_01'; // a test input of the 11-character shape the parser accepts, not a real video
  const cases = [
    { name: 'empty link: placeholder', url: '', iframe: false },
    { name: 'a watch link: muted, autoplaying, looping nocookie embed', url: `https://www.youtube.com/watch?v=${VIDEO_ID}`, iframe: true },
    { name: 'a youtu.be link: same embed', url: `https://youtu.be/${VIDEO_ID}`, iframe: true },
    { name: 'a link on another host: placeholder', url: `https://video.example.org/watch?v=${VIDEO_ID}`, iframe: false },
  ];
  for (const c of cases) {
    test(c.name, async ({ page }) => {
      await page.route('**/site.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ intro_video_url: c.url }) }));
      const youtube: string[] = [];
      page.on('request', (r) => {
        if (/youtube/.test(new URL(r.url()).hostname)) youtube.push(r.url());
      });
      await page.goto('/#welcome');
      const video = page.getByTestId('welcome-video');
      await expect(video).toBeVisible();
      if (!c.iframe) {
        await expect(video.locator('figcaption')).toBeVisible();
        await expect(video.locator('iframe')).toHaveCount(0);
        return;
      }
      const src = await video.locator('iframe').getAttribute('src');
      const u = new URL(src!);
      expect(u.hostname).toBe('www.youtube-nocookie.com');
      expect(u.pathname).toBe(`/embed/${VIDEO_ID}`);
      for (const [k, v] of [['autoplay', '1'], ['mute', '1'], ['loop', '1'], ['playlist', VIDEO_ID]]) expect(u.searchParams.get(k), k).toBe(v);
      // Any request the iframe made went only to the nocookie host (and was aborted by the fixture).
      expect(youtube.every((r) => new URL(r).hostname === 'www.youtube-nocookie.com')).toBe(true);
    });
  }
});

test('the installed app starts in the app: manifest start_url is /#home', async ({ request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.start_url).toBe('/#home');
});

test('Instructions.pdf: download link, a real PDF, never the app shell even with the service worker active', async ({ page }) => {
  await page.goto('/#welcome/instructions');
  const link = page.getByTestId('welcome-pdf');
  await expect(link).toHaveAttribute('href', '/Instructions.pdf');
  await expect(link).toHaveAttribute('download', /.*/);

  // Let the service worker take control (it is registered from the app shell), then fetch through it.
  await open(page, '#home');
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker?.controller), { timeout: 20_000 }).toBe(true);
  const viaSw = await page.evaluate(async () => {
    const r = await fetch('/Instructions.pdf');
    const head = new Uint8Array(await r.arrayBuffer()).slice(0, 5);
    return { status: r.status, type: r.headers.get('content-type'), head: String.fromCharCode(...head) };
  });
  expect(viaSw.status).toBe(200);
  expect(viaSw.type).toContain('application/pdf');
  expect(viaSw.head).toBe('%PDF-');

  // A navigation to the PDF (what the link does without the download attribute): the browser either downloads it or
  // shows it in its PDF viewer; either way it comes from the network as a PDF, never the app shell from the worker.
  const download = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  const response = await page.goto('/Instructions.pdf').catch(() => null);
  const d = await download;
  if (d) {
    expect(d.suggestedFilename()).toBe('Instructions.pdf');
    expect(readFileSync((await d.path())!).subarray(0, 5).toString('latin1')).toBe('%PDF-');
  } else {
    expect(response, 'a response for the PDF navigation').not.toBeNull();
    expect(response!.headers()['content-type']).toContain('application/pdf');
    expect(response!.fromServiceWorker(), 'not answered by the service worker').toBe(false);
    await expect(page.locator('#root')).toHaveCount(0);
  }
});
