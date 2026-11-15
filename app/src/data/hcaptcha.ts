// Hand-rolled, lazy hCaptcha loader (D-032; no npm wrapper, which would be class A). Nothing here runs on app load:
// the script is injected only when the user taps "Connect this device".
// Verified 2026-11-15 against docs.hcaptcha.com (configuration, invisible, CSP) and the installed supabase-js types:
//   script  https://js.hcaptcha.com/1/api.js?render=explicit&onload=<fn>   (recaptchacompat=off: no grecaptcha global)
//   API     hcaptcha.render(container, params) -> widget id; hcaptcha.reset(id); callbacks: callback(token),
//           'expired-callback', 'chalexpired-callback', 'error-callback'(code), 'close-callback'
//   CSP     script/frame/style/connect-src: https://hcaptcha.com https://*.hcaptcha.com
//   Supabase: signInAnonymously({ options: { captchaToken } }); reset the captcha after every auth call.

export const HCAPTCHA_SCRIPT = 'https://js.hcaptcha.com/1/api.js';
export const ONLOAD_FN = '__demenovaHcaptchaOnload';
export const LOAD_TIMEOUT_MS = 20_000;

export interface HCaptchaApi {
  render(container: HTMLElement, params: Record<string, unknown>): string;
  reset(widgetId?: string): void;
  remove?(widgetId?: string): void;
}

/** The few DOM pieces the loader touches, so tests can pass fakes. */
export interface LoaderEnv {
  doc: {
    createElement(tag: 'script'): { src: string; async: boolean; defer: boolean; onerror: ((e: unknown) => void) | null };
    head: { appendChild(node: unknown): unknown };
  };
  win: Record<string, unknown>;
}

let pending: Promise<HCaptchaApi> | null = null;

export function scriptUrl(): string {
  return `${HCAPTCHA_SCRIPT}?render=explicit&onload=${ONLOAD_FN}&recaptchacompat=off`;
}

/** Injects api.js once and resolves with window.hcaptcha. A failed load can be retried. */
export function loadHCaptcha(env: LoaderEnv = { doc: document as unknown as LoaderEnv['doc'], win: window as unknown as Record<string, unknown> }, timeoutMs = LOAD_TIMEOUT_MS): Promise<HCaptchaApi> {
  const ready = env.win.hcaptcha as HCaptchaApi | undefined;
  if (ready && typeof ready.render === 'function') return Promise.resolve(ready);
  if (pending) return pending;
  pending = new Promise<HCaptchaApi>((resolve, reject) => {
    const fail = (why: string) => {
      pending = null;
      delete env.win[ONLOAD_FN];
      reject(new Error(why));
    };
    const timer = setTimeout(() => fail('hcaptcha-timeout'), timeoutMs);
    env.win[ONLOAD_FN] = () => {
      clearTimeout(timer);
      const api = env.win.hcaptcha as HCaptchaApi | undefined;
      if (api && typeof api.render === 'function') resolve(api);
      else fail('hcaptcha-missing');
    };
    const s = env.doc.createElement('script');
    s.src = scriptUrl();
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      clearTimeout(timer);
      fail('hcaptcha-network');
    };
    env.doc.head.appendChild(s);
  });
  return pending;
}

export function resetLoaderForTests(): void {
  pending = null;
}

/** Public site key from the build (VITE_HCAPTCHA_SITEKEY). Never hard-coded; null when unset. */
export function hcaptchaSiteKey(): string | null {
  const k = import.meta.env.VITE_HCAPTCHA_SITEKEY as string | undefined;
  return k && k.trim() ? k.trim() : null;
}
