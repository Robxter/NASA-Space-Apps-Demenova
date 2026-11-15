// Global setup for the e2e suite (qa-demo-engineer, block 4, D-036). The email-alert card needs a build-time hCaptcha
// site key (VITE_HCAPTCHA_SITEKEY) before it ever calls the API; the certified build has none locally (Render sets it).
// This builds the same app source a second time with a placeholder key into tests/e2e/.build-captcha (git-ignored),
// served on port 4175 by serve.mjs --root. The placeholder is not a key: the tests serve a fake widget script in place
// of js.hcaptcha.com and mock the API, so nothing reaches hCaptcha or the alert service.
// Rebuilt when missing or older than app/dist/index.html (the build under test).
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
export const CAPTCHA_BUILD = join(HERE, '.build-captcha');
export const PLACEHOLDER_SITEKEY = 'qa-placeholder-sitekey';

export default function globalSetup() {
  const dist = join(REPO, 'app', 'dist', 'index.html');
  const out = join(CAPTCHA_BUILD, 'index.html');
  if (existsSync(out) && existsSync(dist) && statSync(out).mtimeMs >= statSync(dist).mtimeMs) return;
  const vite = join(REPO, 'app', 'node_modules', 'vite', 'bin', 'vite.js');
  execFileSync(process.execPath, [vite, 'build', '--outDir', CAPTCHA_BUILD, '--emptyOutDir', '--logLevel', 'warn'], {
    cwd: join(REPO, 'app'),
    env: { ...process.env, VITE_HCAPTCHA_SITEKEY: PLACEHOLDER_SITEKEY },
    stdio: 'inherit',
  });
}
