// Playwright config for the Demenova e2e suite (T-044). Owner: qa-demo-engineer.
// Runs the production build (app/dist) served by serve.mjs on phone, tablet and desktop viewports.
// Browser: the installed Microsoft Edge (Chromium) via `channel: 'msedge'`; no browser download.
// The iPhone and iPad projects are viewport emulation in Chromium, not WebKit: Safari itself is covered by
// Roberto's device checklist (docs/reports/qa/DEVICE_CHECKLIST.md).
// Before running: npm --prefix app run build
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4173);

const phone = { isMobile: true, hasTouch: true };

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: 'msedge',
    headless: true,
    locale: 'en-US',
    serviceWorkers: 'allow',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'android-360', use: { ...phone, viewport: { width: 360, height: 780 }, deviceScaleFactor: 3 } },
    { name: 'iphone-14-pro', use: { ...phone, viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 } },
    { name: 'ipad-air', use: { ...phone, viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `node serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
