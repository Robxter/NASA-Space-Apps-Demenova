// Alerts screen, block 4 (D-036): the "Email alerts" card (test Severe alert via POST /alerts/test-email) and the
// "Telegram alerts" card. Nothing leaves the machine: hCaptcha's script is replaced by a fake widget served from a page
// route, the alert API is mocked, every other external request is aborted by the fixture.
// The email flow needs a build-time hCaptcha site key: it runs on the placeholder-key build (port 4175, with the
// render.yaml CSP, global-setup.mjs). The certified build without a key is checked for its honest "not configured" answer.
import { expect, t, test } from '../lib/app';
import type { Page, Route } from '@playwright/test';

const API = 'https://demenova-api.onrender.com/alerts/test-email';
const CAPTCHA_URL = /^https:\/\/js\.hcaptcha\.com\/1\/api\.js/;
const CAPTCHA_PORT = Number(process.env.E2E_CAPTCHA_PORT ?? 4175);

/** A stand-in for hCaptcha's api.js: a "qa-captcha" button that passes the token "qa-token" to the callback. */
const FAKE_HCAPTCHA = `
window.hcaptcha = {
  render: function (el, params) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = 'qa-captcha';
    b.addEventListener('click', function () { params.callback('qa-token'); });
    el.appendChild(b);
    return 'qa-widget';
  },
  reset: function () {}, remove: function () {}
};
var m = /onload=([A-Za-z0-9_]+)/.exec(document.currentScript ? document.currentScript.src : '');
if (m && typeof window[m[1]] === 'function') window[m[1]]();
`;

async function emailCard(page: Page) {
  await page.goto('/#alerts');
  const card = page.locator('section', { has: page.getByRole('heading', { name: t('en', 'alerts.email.title') }) });
  await expect(card).toBeVisible();
  return card;
}

test('Telegram card links to @DemenovaBot; the email card loads no hCaptcha until the form is used', async ({ page }) => {
  const captcha: string[] = [];
  page.on('request', (r) => {
    if (/hcaptcha\.com/.test(new URL(r.url()).hostname)) captcha.push(r.url());
  });
  await emailCard(page);
  const tg = page.locator('section', { has: page.getByRole('heading', { name: t('en', 'alerts.telegram.title') }) });
  await expect(tg.locator('a[href^="https://t.me/DemenovaBot"]')).toHaveCount(1);
  await expect(tg.locator('a[href^="https://t.me/DemenovaBot"]')).toHaveAttribute('target', '_blank');
  await page.waitForTimeout(1000);
  expect(captcha, 'no hCaptcha request on load').toEqual([]);
});

test('certified build without a site key: the card says test alerts are not configured and calls nothing', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', (r) => {
    const h = new URL(r.url()).hostname;
    if (/hcaptcha\.com|demenova-api\.onrender\.com/.test(h)) calls.push(r.url());
  });
  const card = await emailCard(page);
  await card.locator('input[type=email]').fill('qa@example.org');
  await card.getByRole('button', { name: t('en', 'alerts.email.send') }).click();
  await expect(card.locator('[role=status]')).toHaveText(t('en', 'alerts.email.notConfigured'));
  expect(calls).toEqual([]);
});

test.describe('email test flow (placeholder-key build, render.yaml CSP)', () => {
  test.use({ baseURL: `http://127.0.0.1:${CAPTCHA_PORT}` });

  async function setup(page: Page, answer: (route: Route) => Promise<void>) {
    const captchaLoads: string[] = [];
    const bodies: unknown[] = [];
    const blocked: string[] = [];
    await page.exposeFunction('__reportCsp', (v: string) => void blocked.push(v));
    await page.addInitScript(() =>
      document.addEventListener('securitypolicyviolation', (e) =>
        (window as unknown as { __reportCsp: (v: string) => void }).__reportCsp(`${e.violatedDirective} ${e.blockedURI}`),
      ),
    );
    await page.route(CAPTCHA_URL, (r) => {
      captchaLoads.push(r.request().url());
      return r.fulfill({ contentType: 'text/javascript', body: FAKE_HCAPTCHA });
    });
    await page.route(API, async (r) => {
      if (r.request().method() === 'POST') bodies.push(r.request().postDataJSON());
      await answer(r);
    });
    const card = await emailCard(page);
    return { card, captchaLoads, bodies, blocked };
  }

  const json = (status: number, body: unknown) => (r: Route) =>
    r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });

  const outcomes: { name: string; answer: (r: Route) => Promise<void>; message: string }[] = [
    { name: 'sent', answer: json(200, { status: 'sent' }), message: 'alerts.email.sent' },
    { name: 'limited_demo', answer: json(200, { status: 'limited_demo' }), message: 'alerts.email.limited' },
    { name: '400 (captcha rejected)', answer: json(400, { detail: 'captcha' }), message: 'alerts.email.captcha' },
    { name: '429 (rate limited)', answer: json(429, { detail: 'rate' }), message: 'alerts.email.rate' },
    { name: '503 (not configured on the server)', answer: json(503, { detail: 'off' }), message: 'alerts.email.notConfigured' },
  ];
  for (const o of outcomes) {
    test(`answer ${o.name} shows its message`, async ({ page }) => {
      const { card, captchaLoads, bodies, blocked } = await setup(page, o.answer);
      expect(captchaLoads, 'hCaptcha not loaded before the form is used').toEqual([]);
      await card.locator('input[type=email]').fill('qa@example.org'); // focus loads the check
      await expect(card.getByRole('button', { name: 'qa-captcha' })).toBeVisible();
      expect(captchaLoads).toHaveLength(1);
      await card.getByRole('button', { name: t('en', 'alerts.email.send') }).click();
      await expect(card.locator('[role=status]')).toHaveText(t('en', 'alerts.email.tick'));
      await card.getByRole('button', { name: 'qa-captcha' }).click();
      await expect(card.locator('[role=status]')).toHaveText(t('en', o.message));
      expect(bodies).toEqual([{ email: 'qa@example.org', captcha_token: 'qa-token', lang: 'en' }]);
      expect(blocked, 'no CSP violation').toEqual([]);
    });
  }

  test('a slow cold start says the service is waking up after 4 s, then shows the answer', async ({ page }) => {
    const { card } = await setup(page, async (r) => {
      await new Promise((f) => setTimeout(f, 6000));
      await json(200, { status: 'sent' })(r);
    });
    await card.locator('input[type=email]').fill('qa@example.org');
    await card.getByRole('button', { name: 'qa-captcha' }).click();
    const status = card.locator('[role=status]');
    await expect(status).toHaveText(t('en', 'alerts.email.sending'));
    await expect(status).toHaveText(t('en', 'alerts.email.waking'), { timeout: 5500 });
    await expect(card.getByRole('button', { name: t('en', 'alerts.email.send') })).toBeDisabled();
    await expect(status).toHaveText(t('en', 'alerts.email.sent'), { timeout: 10_000 });
  });

  test('an invalid address is caught before any request', async ({ page }) => {
    const { card, bodies } = await setup(page, json(200, { status: 'sent' }));
    await card.locator('input[type=email]').fill('not-an-address');
    await card.getByRole('button', { name: t('en', 'alerts.email.send') }).click();
    await expect(card.locator('[role=status]')).toHaveText(t('en', 'alerts.email.invalid'));
    expect(bodies).toEqual([]);
  });

  test.describe('in Spanish', () => {
    test.use({ prefs: { language: 'es', units: 'metric', mode: 'agronomist', storage_mode: 'full', theme: 'dark' } });
    test('the limited-demo answer is in Spanish and the request says lang es', async ({ page }) => {
      await page.route(CAPTCHA_URL, (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE_HCAPTCHA }));
      const bodies: unknown[] = [];
      await page.route(API, async (r) => {
        bodies.push(r.request().postDataJSON());
        await json(200, { status: 'limited_demo' })(r);
      });
      await page.goto('/#alerts');
      const card = page.locator('section', { has: page.getByRole('heading', { name: t('es', 'alerts.email.title') }) });
      await card.locator('input[type=email]').fill('qa@example.org');
      await card.getByRole('button', { name: 'qa-captcha' }).click();
      await expect(card.locator('[role=status]')).toHaveText(t('es', 'alerts.email.limited'));
      expect(bodies).toEqual([{ email: 'qa@example.org', captcha_token: 'qa-token', lang: 'es' }]);
    });
  });
});
