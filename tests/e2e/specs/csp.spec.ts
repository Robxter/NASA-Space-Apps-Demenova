// CSP (D-033 brief C1 step 2): the build served with the exact Content-Security-Policy that render.yaml sets for /*
// (serve.mjs --csp, port 4174). Every screen, the played Flood, the reliability dialog, dark theme and a Setup
// drawing run under it; any violation (inline style="" or <style>, inline script, external font or image) fails.
import { expect, open, slider, t, test } from '../lib/app';
import { bannerUnit, DEMO_DAY, replayDays } from '../lib/demo';

const CSP_PORT = Number(process.env.E2E_CSP_PORT ?? 4174);
test.use({ baseURL: `http://127.0.0.1:${CSP_PORT}` });

const LOT = encodeURIComponent(bannerUnit(DEMO_DAY)!.unit_id);

test('every screen runs under the render.yaml CSP with no violation', async ({ page }) => {
  const consoleCsp: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to (apply|load|execute|connect|frame)/i.test(m.text())) consoleCsp.push(m.text());
  });
  // Reported through an exposed function, so violations survive reloads and navigations.
  const blocked: string[] = [];
  await page.exposeFunction('__reportCsp', (v: string) => void blocked.push(v));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { __reportCsp: (v: string) => void }).__reportCsp(
        `${e.violatedDirective} blocked ${e.blockedURI || 'inline'} at ${e.sourceFile}:${e.lineNumber}`,
      ),
    );
  });

  const response = await page.goto('/#home');
  expect(response?.headers()['content-security-policy'], 'the server sends the render.yaml CSP').toMatch(/script-src 'self'/);
  await expect(slider(page)).toBeVisible();

  // Map: layers, then a played forward step 6 -> 7 Feb 2026 (the Flood), then the lot sheet.
  await page.goto('/#map?d=2026-02-06');
  await page.reload(); // the replay day is read from the hash on load
  await expect(page.locator('path.leaflet-interactive').first()).toBeVisible();
  for (const l of ['map.layer.terrain', 'map.layer.rain', 'map.layer.level'])
    await page.getByRole('radio', { name: t('en', l) }).click();
  await page.getByRole('button', { name: t('en', 'replay.play') }).click();
  await expect(slider(page)).toHaveValue(String(replayDays().indexOf('2026-02-07')), { timeout: 5000 });
  await page.waitForTimeout(1600); // flood 700 ms + spill until 1460 ms
  await page.getByRole('button', { name: t('en', 'replay.pause') }).click();
  await page.locator('path.leaflet-interactive').first().dispatchEvent('click');
  await expect(page.getByRole('button', { name: t('en', 'map.openLot') })).toBeVisible();

  // Lot detail with charts and the reliability dialog.
  await page.goto(`/#lot/${LOT}`);
  await expect(page.getByRole('heading', { level: 3, name: t('en', 'lot.chart.rain'), exact: true })).toBeVisible();
  await page.getByRole('button', { name: t('en', 'reliability.open') }).click();
  await expect(page.getByRole('dialog', { name: t('en', 'reliability.title') })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto(`/#strategies/${LOT}`);
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(3);
  await page.getByText(t('en', 'strategies.details')).first().click();
  await open(page, '#alerts');
  await page.goto('/#learn');
  await expect(page.getByText(t('en', 'learn.datasets'))).toBeVisible();

  // Settings: dark theme and Spanish, then Home again in both.
  await page.goto('/#settings');
  await page.getByRole('radio', { name: t('en', 'settings.theme.dark') }).click();
  await page.getByRole('radio', { name: 'Español' }).click();
  await page.goto('/#home');
  await expect(slider(page, 'es')).toBeVisible();

  // Setup: a pin drawn on the Leaflet map.
  await page.goto('/#setup');
  await page.getByLabel(t('es', 'setup.farmName')).fill('CSP check');
  await page.getByRole('button', { name: t('es', 'setup.dropPin') }).click();
  await page.getByRole('application', { name: t('es', 'setup.mapLabel') }).click();
  await page.getByRole('button', { name: t('es', 'setup.savePin') }).click();
  await expect(page.getByText('CSP check', { exact: true })).toBeVisible();

  await page.waitForTimeout(300);
  expect(blocked, 'securitypolicyviolation events').toEqual([]);
  expect(consoleCsp, 'CSP errors in the console').toEqual([]);
});
