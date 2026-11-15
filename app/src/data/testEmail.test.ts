import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiBase, API_DEFAULT, looksLikeEmail, sendTestEmail } from './testEmail';

afterEach(() => vi.useRealTimers());

const reply = (status: number, body?: unknown) =>
  vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

const input = { email: 'roberto@example.org', captchaToken: 'tok-1', lang: 'es' as const };

describe('sendTestEmail', () => {
  it('posts email, captcha token and language as JSON, without credentials', async () => {
    const f = reply(200, { status: 'sent' });
    expect(await sendTestEmail({ ...input, email: '  roberto@example.org ' }, { fetchImpl: f as unknown as typeof fetch, base: 'https://api.test' })).toBe('sent');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/alerts/test-email');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'roberto@example.org', captcha_token: 'tok-1', lang: 'es' });
  });

  it('maps every documented answer', async () => {
    const cases: [number, unknown, string][] = [
      [200, { status: 'limited_demo' }, 'limited_demo'],
      [200, { status: 'other' }, 'unexpected'],
      [400, { detail: 'captcha' }, 'captcha'],
      [422, { detail: 'invalid' }, 'invalid'],
      [429, { detail: 'limited' }, 'rate_limited'],
      [502, { detail: 'provider' }, 'provider'],
      [503, { detail: 'not configured' }, 'not_configured'],
      [500, { detail: 'boom' }, 'unexpected'],
    ];
    for (const [status, body, outcome] of cases) {
      expect(await sendTestEmail(input, { fetchImpl: reply(status, body) as unknown as typeof fetch, base: 'x' }), String(status)).toBe(outcome);
    }
  });

  it('rejects an obviously invalid address without calling the API', async () => {
    const f = reply(200, { status: 'sent' });
    expect(await sendTestEmail({ ...input, email: 'not-an-email' }, { fetchImpl: f as unknown as typeof fetch })).toBe('invalid');
    expect(f).not.toHaveBeenCalled();
    expect(looksLikeEmail('a@b.co')).toBe(true);
    expect(looksLikeEmail('a@b')).toBe(false);
  });

  it('reports a network failure', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await sendTestEmail(input, { fetchImpl: f as unknown as typeof fetch })).toBe('network');
  });

  it('says it is waking up after a few seconds and gives up after the cold-start budget', async () => {
    vi.useFakeTimers();
    const f = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    );
    const onSlow = vi.fn();
    const p = sendTestEmail(input, { fetchImpl: f as unknown as typeof fetch, timeoutMs: 60_000, slowMs: 4_000, onSlow });
    await vi.advanceTimersByTimeAsync(3_999);
    expect(onSlow).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onSlow).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(56_000);
    expect(await p).toBe('timeout');
  });

  it('a cold start that answers within the budget still succeeds', async () => {
    vi.useFakeTimers();
    const f = vi.fn(() => new Promise<Response>((res) => setTimeout(() => res(new Response(JSON.stringify({ status: 'sent' }), { status: 200 })), 45_000)));
    const onSlow = vi.fn();
    const p = sendTestEmail(input, { fetchImpl: f as unknown as typeof fetch, onSlow });
    await vi.advanceTimersByTimeAsync(45_000);
    expect(await p).toBe('sent');
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('uses the default API base when no build variable is set', () => {
    expect(apiBase()).toBe(API_DEFAULT);
  });
});
