// Device identity (ADR-003, D-032). No sign-in on load: judges, the replay and offline use never load supabase-js or
// hCaptcha unless this device connected before (a stored Supabase session). Connecting happens only on demand, from
// Settings or Setup: hCaptcha widget -> token -> signInAnonymously({ options: { captchaToken } }).
import type { SupabaseClient } from '@supabase/supabase-js';
import { hcaptchaSiteKey, loadHCaptcha, type HCaptchaApi } from './hcaptcha';

/** pending: checking a stored session; local-only: working on this device only; unconfigured: no sync in this build. */
export type IdentityStatus = 'pending' | 'signed-in' | 'local-only' | 'unconfigured';

export interface Identity {
  status: IdentityStatus;
  userId: string | null;
}

let client: Promise<SupabaseClient | null> | null = null;

function config(): { url: string; key: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return url && key ? { url, key } : null;
}

/** Sync needs Supabase and the hCaptcha site key (Supabase rejects anonymous sign-in without a captcha token). */
export function syncConfigured(): boolean {
  return config() !== null && hcaptchaSiteKey() !== null;
}

/** The shared client, or null when this build has no Supabase configuration. */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (client) return client;
  const cfg = config();
  if (!cfg) return (client = Promise.resolve(null));
  client = import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true } }),
  );
  return client;
}

/** supabase-js stores its session in localStorage under sb-<project>-auth-token. */
export function hasStoredSession(storage: Pick<Storage, 'length' | 'key'> | null): boolean {
  if (!storage) return false;
  try {
    for (let i = 0; i < storage.length; i++) if (/^sb-.+-auth-token$/.test(storage.key(i) ?? '')) return true;
  } catch {
    return false;
  }
  return false;
}

export interface IdentityDeps {
  configured?: boolean;
  storage?: Pick<Storage, 'length' | 'key'> | null;
  getClient?: () => Promise<SupabaseClient | null>;
}

/** Startup: never signs in. Restores a previous connection only if this device has a stored session. */
export async function initIdentity(deps: IdentityDeps = {}): Promise<Identity> {
  const configured = deps.configured ?? syncConfigured();
  if (!configured) return { status: 'unconfigured', userId: null };
  const storage = deps.storage !== undefined ? deps.storage : typeof localStorage === 'undefined' ? null : localStorage;
  if (!hasStoredSession(storage)) return { status: 'local-only', userId: null };
  try {
    const sb = await (deps.getClient ?? getSupabase)();
    const { data } = sb ? await sb.auth.getSession() : { data: { session: null } };
    const user = data.session?.user;
    return user ? { status: 'signed-in', userId: user.id } : { status: 'local-only', userId: null };
  } catch {
    return { status: 'local-only', userId: null };
  }
}

export type ConnectError = 'unconfigured' | 'offline' | 'captcha-load' | 'captcha' | 'captcha-expired' | 'captcha-closed' | 'supabase';

export type ConnectResult = { ok: true; identity: Identity } | { ok: false; error: ConnectError };

export interface ConnectDeps {
  siteKey: string | null;
  supabaseConfigured: boolean;
  online: boolean;
  container: HTMLElement;
  lang: 'es' | 'en';
  theme: 'light' | 'dark';
  loadApi?: () => Promise<HCaptchaApi>;
  signIn?: (captchaToken: string) => Promise<{ userId: string | null; error: string | null }>;
  /** Called with each outcome while the widget stays on screen (errors are recoverable: the user can tick again). */
  onResult: (r: ConnectResult) => void;
}

async function defaultSignIn(captchaToken: string): Promise<{ userId: string | null; error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { userId: null, error: 'unconfigured' };
  const { data, error } = await sb.auth.signInAnonymously({ options: { captchaToken } });
  return { userId: data.user?.id ?? null, error: error ? error.message : data.user ? null : 'no user' };
}

/**
 * Renders the hCaptcha checkbox in `container` and signs in with each token it yields. Returns a cleanup function,
 * or null when nothing was rendered (the reason is reported through onResult).
 */
export async function startConnect(deps: ConnectDeps): Promise<(() => void) | null> {
  if (!deps.siteKey || !deps.supabaseConfigured) {
    deps.onResult({ ok: false, error: 'unconfigured' });
    return null;
  }
  if (!deps.online) {
    deps.onResult({ ok: false, error: 'offline' });
    return null;
  }
  let api: HCaptchaApi;
  try {
    api = await (deps.loadApi ?? loadHCaptcha)();
  } catch {
    deps.onResult({ ok: false, error: 'captcha-load' });
    return null;
  }
  const signIn = deps.signIn ?? defaultSignIn;
  let id: string | undefined;
  const reset = () => {
    try {
      api.reset(id);
    } catch {
      /* widget already gone */
    }
  };
  id = api.render(deps.container, {
    sitekey: deps.siteKey,
    size: 'compact',
    theme: deps.theme,
    hl: deps.lang,
    callback: async (token: string) => {
      let out: { userId: string | null; error: string | null };
      try {
        out = await signIn(token);
      } catch (e) {
        out = { userId: null, error: e instanceof Error ? e.message : String(e) };
      }
      // A captcha token is single use: reset after every auth call (Supabase captcha guide).
      reset();
      deps.onResult(
        out.userId && !out.error
          ? { ok: true, identity: { status: 'signed-in', userId: out.userId } }
          : { ok: false, error: 'supabase' },
      );
    },
    'expired-callback': () => {
      reset();
      deps.onResult({ ok: false, error: 'captcha-expired' });
    },
    'chalexpired-callback': () => {
      reset();
      deps.onResult({ ok: false, error: 'captcha-expired' });
    },
    'error-callback': () => {
      reset();
      deps.onResult({ ok: false, error: 'captcha' });
    },
    'close-callback': () => deps.onResult({ ok: false, error: 'captcha-closed' }),
  });
  return () => {
    try {
      api.remove?.(id);
    } catch {
      /* ignore */
    }
  };
}
