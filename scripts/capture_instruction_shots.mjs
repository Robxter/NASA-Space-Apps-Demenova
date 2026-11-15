// Captures the screenshots named in docs/site/Instructions.md from a production build (app/dist served by
// tests/e2e/serve.mjs) and writes docs/site/screenshots.json for scripts/build_instructions_pdf.mjs.
// Usage: npm --prefix app run build; node scripts/capture_instruction_shots.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(ROOT, 'tests', 'e2e', 'package.json'));
const { chromium } = require('@playwright/test');
const PORT = 4281;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, 'docs', 'site', 'screenshots');
mkdirSync(OUT, { recursive: true });

const server = spawn(process.execPath, [join(ROOT, 'tests', 'e2e', 'serve.mjs'), String(PORT)], { stdio: 'ignore', windowsHide: true });
await new Promise((r) => setTimeout(r, 1500));
const LOT = 'lot_demo-el-oro_1';
// name in Instructions.md -> how to capture it
const shots = [
  { name: 'Home on a phone', hash: '#home', wait: 'Lots by risk' },
  { name: 'Home with a Severe banner', hash: '#home', wait: 'Severe', clip: 'banner' },
  { name: 'Replay control', hash: '#home', wait: 'Lots by risk', element: 'input[type=range]', up: 3 },
  { name: 'Map, Alert level layer', hash: '#map', settle: 3500 },
  { name: 'Lot detail, Why section', hash: `#lot/${LOT}`, wait: 'Why', scrollTo: 'Why' },
  { name: 'Lot detail, History chart', hash: `#lot/${LOT}`, wait: 'History', scrollTo: 'History', settle: 1500 },
  { name: 'How reliable is this? sheet', hash: `#lot/${LOT}`, wait: 'How reliable is this?', open: 'How reliable is this?' },
  { name: 'Strategies cards', hash: `#strategies/${LOT}`, settle: 1200 },
  { name: 'Alerts, Level changes', hash: '#alerts', settle: 1200 },
  { name: 'Learn', hash: '#learn', settle: 1200 },
  { name: 'Farm setup, level badge and pin', hash: '#setup', settle: 2500 },
  { name: 'Farm setup, lots', hash: '#setup', settle: 2500, full: true },
  { name: 'Settings', hash: '#settings', settle: 1200 },
];
const map = {};
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', colorScheme: 'light', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  for (const s of shots) {
    const file = `${s.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/-+$/, '').toLowerCase()}.png`;
    await page.goto(`${BASE}/${s.hash}`, { waitUntil: 'networkidle' });
    if (s.wait) await page.getByText(s.wait, { exact: false }).first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(s.settle ?? 900);
    if (s.scrollTo) await page.getByText(s.scrollTo, { exact: false }).filter({ visible: true }).first().scrollIntoViewIfNeeded();
    if (s.open) { await page.getByRole('button', { name: s.open }).first().click(); await page.waitForTimeout(900); }
    const path = join(OUT, file);
    if (s.element) {
      let el = page.locator(s.element).first();
      for (let i = 0; i < (s.up ?? 0); i++) el = el.locator('xpath=..');
      await el.screenshot({ path });
    } else if (s.clip === 'banner') {
      await page.screenshot({ path, clip: { x: 0, y: 0, width: 393, height: 300 } });
    } else {
      if (s.scrollTo) await page.waitForTimeout(400);
      await page.screenshot({ path, fullPage: Boolean(s.full) });
    }
    map[s.name] = `docs/site/screenshots/${file}`;
    console.log('captured', s.name);
  }
} finally {
  await browser.close();
  server.kill();
}
writeFileSync(join(ROOT, 'docs', 'site', 'screenshots.json'), JSON.stringify(map, null, 1) + '\n');
console.log(Object.keys(map).length, 'screenshots');
