// D-032: no sign-in or hCaptcha on load; Connect loads hCaptcha once and passes its token to signInAnonymously.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HCAPTCHA_SCRIPT, loadHCaptcha, ONLOAD_FN, resetLoaderForTests, scriptUrl, type HCaptchaApi, type LoaderEnv } from './hcaptcha';
import { hasStoredSession, initIdentity, startConnect, type ConnectResult } from './identity';

afterEach(() => resetLoaderForTests());

/** A fake document that records injected scripts; `fire` simulates the script's onload callback. */
function fakeEnv() {
  const scripts: { src: string; onerror: ((e: unknown) => void) | null }[] = [];
  const win: Record<string, unknown> = {};
  const env: LoaderEnv = {
    doc: {
      createElement: () => {
        const s = { src: '', async: false, defer: false, onerror: null as ((e: unknown) => void) | null };
        return s;
      },
      head: { appendChild: (n: unknown) => scripts.push(n as (typeof scripts)[number]) },
    },
    win,
  };
  return { env, scripts, win };
}

/** A fake hCaptcha API: render keeps the params so tests can play the user's part. */
function fakeApi() {
  const calls = { render: [] as Record<string, unknown>[], reset: 0, remove: 0 };
  const api: HCaptchaApi = {
    render: (_c, params) => (calls.render.push(params), 'widget-1'),
    reset: () => void calls.reset++,
    remove: () => void calls.remove++,
  };
  return { api, calls };
}

const storage = (keys: string[]) => ({ length: keys.length, key: (i: number) => keys[i] ?? null });

describe('app load (no automatic sign-in)', () => {
  it('injects no script and never touches Supabase without a stored session', async () => {
    const getClient = vi.fn();
    const id = await initIdentity({ configured: true, storage: storage(['demenova.prefs.v1']), getClient });
    expect(id).toEqual({ status: 'local-only', userId: null });
    expect(getClient).not.toHaveBeenCalled();
  });

  it('restores a previous connection from the stored session, without a captcha', async () => {
    const sb = { auth: { getSession: async () => ({ data: { session: { user: { id: 'u-1' } } } }), signInAnonymously: vi.fn() } };
    const id = await initIdentity({ configured: true, storage: storage(['sb-abc-auth-token']), getClient: async () => sb as unknown as SupabaseClient });
    expect(id).toEqual({ status: 'signed-in', userId: 'u-1' });
    expect(sb.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('reports an unconfigured build', async () => {
    expect(await initIdentity({ configured: false })).toEqual({ status: 'unconfigured', userId: null });
    expect(hasStoredSession(null)).toBe(false);
  });
});

describe('hCaptcha loader', () => {
  it('injects the explicit-render script once, however often Connect is tapped', async () => {
    const { env, scripts, win } = fakeEnv();
    const a = loadHCaptcha(env);
    const b = loadHCaptcha(env);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.src).toBe(scriptUrl());
    expect(scripts[0]?.src.startsWith(`${HCAPTCHA_SCRIPT}?render=explicit&onload=${ONLOAD_FN}`)).toBe(true);
    const { api } = fakeApi();
    win.hcaptcha = api;
    (win[ONLOAD_FN] as () => void)();
    expect(await a).toBe(api);
    expect(await b).toBe(api);
    expect(await loadHCaptcha(env)).toBe(api);
    expect(scripts).toHaveLength(1);
  });

  it('rejects on a network error and allows a retry', async () => {
    const { env, scripts } = fakeEnv();
    const p = loadHCaptcha(env);
    scripts[0]?.onerror?.(new Event('error'));
    await expect(p).rejects.toThrow('hcaptcha-network');
    void loadHCaptcha(env).catch(() => undefined);
    expect(scripts).toHaveLength(2);
  });
});

describe('Connect', () => {
  const container = {} as HTMLElement;
  const base = { supabaseConfigured: true, online: true, container, lang: 'es' as const, theme: 'light' as const };

  it('passes the hCaptcha token to signInAnonymously and resets the widget after the call', async () => {
    const { api, calls } = fakeApi();
    const signIn = vi.fn(async () => ({ userId: 'anon-1', error: null }));
    const results: ConnectResult[] = [];
    const stop = await startConnect({ ...base, siteKey: 'site-key-from-env', loadApi: async () => api, signIn, onResult: (r) => results.push(r) });
    expect(stop).toBeTypeOf('function');
    const params = calls.render[0]!;
    expect(params.sitekey).toBe('site-key-from-env');
    expect(params.hl).toBe('es');
    await (params.callback as (t: string) => Promise<void>)('token-123');
    expect(signIn).toHaveBeenCalledWith('token-123');
    expect(calls.reset).toBe(1);
    expect(results).toEqual([{ ok: true, identity: { status: 'signed-in', userId: 'anon-1' } }]);
    stop?.();
    expect(calls.remove).toBe(1);
  });

  it('with no site key: says sync is not configured and loads nothing', async () => {
    const loadApi = vi.fn();
    const results: ConnectResult[] = [];
    expect(await startConnect({ ...base, siteKey: null, loadApi, onResult: (r) => results.push(r) })).toBeNull();
    expect(loadApi).not.toHaveBeenCalled();
    expect(results).toEqual([{ ok: false, error: 'unconfigured' }]);
  });

  it('offline: loads nothing and keeps working locally', async () => {
    const loadApi = vi.fn();
    const results: ConnectResult[] = [];
    await startConnect({ ...base, online: false, siteKey: 'k', loadApi, onResult: (r) => results.push(r) });
    expect(loadApi).not.toHaveBeenCalled();
    expect(results[0]).toEqual({ ok: false, error: 'offline' });
  });

  it('reports script load, captcha, expiry, close and Supabase errors, resetting the widget', async () => {
    const results: ConnectResult[] = [];
    const onResult = (r: ConnectResult) => results.push(r);
    await startConnect({ ...base, siteKey: 'k', loadApi: async () => Promise.reject(new Error('hcaptcha-network')), onResult });
    expect(results.pop()).toEqual({ ok: false, error: 'captcha-load' });

    const { api, calls } = fakeApi();
    const signIn = vi.fn(async () => ({ userId: null, error: 'captcha protection: request disallowed' }));
    await startConnect({ ...base, siteKey: 'k', loadApi: async () => api, signIn, onResult });
    const p = calls.render[0]!;
    (p['error-callback'] as (code: string) => void)('challenge-error');
    expect(results.pop()).toEqual({ ok: false, error: 'captcha' });
    (p['expired-callback'] as () => void)();
    expect(results.pop()).toEqual({ ok: false, error: 'captcha-expired' });
    (p['close-callback'] as () => void)();
    expect(results.pop()).toEqual({ ok: false, error: 'captcha-closed' });
    await (p.callback as (t: string) => Promise<void>)('tok');
    expect(results.pop()).toEqual({ ok: false, error: 'supabase' });
    expect(calls.reset).toBe(3);

    const throwing = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const f = fakeApi();
    await startConnect({ ...base, siteKey: 'k', loadApi: async () => f.api, signIn: throwing, onResult });
    await (f.calls.render[0]!.callback as (t: string) => Promise<void>)('tok');
    expect(results.pop()).toEqual({ ok: false, error: 'supabase' });
  });
});
