// Test Severe email (block 4, api-engineer's POST /alerts/test-email). The address goes to the API in the request
// body and nowhere else: not stored, not logged, not cached (no service-worker rule for this host). The API sleeps on
// Render free, so a cold start can take up to ~60 s: callers get an `onSlow` signal for a "waking up" state.

export type TestEmailOutcome =
  | 'sent'
  | 'limited_demo'
  | 'captcha'
  | 'invalid'
  | 'rate_limited'
  | 'provider'
  | 'not_configured'
  | 'network'
  | 'timeout'
  | 'unexpected';

export const API_DEFAULT = 'https://demenova-api.onrender.com';
/** Cold start budget on Render free. */
export const TIMEOUT_MS = 60_000;
/** After this long the UI says the service is waking up. */
export const SLOW_MS = 4_000;

export function apiBase(): string {
  const v = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  return (v || API_DEFAULT).replace(/\/+$/, '');
}

/** Same shape the API accepts (it re-checks); catches typos before a request and a captcha are spent. */
export function looksLikeEmail(s: string): boolean {
  return s.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());
}

export interface SendDeps {
  fetchImpl?: typeof fetch;
  base?: string;
  timeoutMs?: number;
  slowMs?: number;
  onSlow?: () => void;
}

const BY_STATUS: Record<number, TestEmailOutcome> = {
  400: 'captcha',
  422: 'invalid',
  429: 'rate_limited',
  502: 'provider',
  503: 'not_configured',
};

export async function sendTestEmail(
  input: { email: string; captchaToken: string; lang: 'en' | 'es' },
  deps: SendDeps = {},
): Promise<TestEmailOutcome> {
  const email = input.email.trim();
  if (!looksLikeEmail(email)) return 'invalid';
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, deps.timeoutMs ?? TIMEOUT_MS);
  const slow = deps.onSlow ? setTimeout(deps.onSlow, deps.slowMs ?? SLOW_MS) : null;
  try {
    const res = await (deps.fetchImpl ?? fetch)(`${deps.base ?? apiBase()}/alerts/test-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, captcha_token: input.captchaToken, lang: input.lang }),
      signal: ctrl.signal,
      cache: 'no-store',
      credentials: 'omit',
    });
    if (res.status === 200) {
      const body = (await res.json().catch(() => null)) as { status?: unknown } | null;
      return body?.status === 'sent' ? 'sent' : body?.status === 'limited_demo' ? 'limited_demo' : 'unexpected';
    }
    return BY_STATUS[res.status] ?? 'unexpected';
  } catch {
    return timedOut ? 'timeout' : 'network';
  } finally {
    clearTimeout(timer);
    if (slow) clearTimeout(slow);
  }
}
