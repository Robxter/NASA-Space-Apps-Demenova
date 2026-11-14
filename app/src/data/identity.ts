// Device identity (ADR-003): Supabase anonymous sign-in, loaded lazily so supabase-js never weighs on first paint.
// Without configuration, offline, or on any error, the app runs local-only and says so.
import type { SupabaseClient } from '@supabase/supabase-js';

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

export async function initIdentity(): Promise<Identity> {
  if (!config()) return { status: 'unconfigured', userId: null };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'local-only', userId: null };
  try {
    const sb = await getSupabase();
    if (!sb) return { status: 'unconfigured', userId: null };
    const { data: session } = await sb.auth.getSession();
    if (session.session?.user) return { status: 'signed-in', userId: session.session.user.id };
    const { data, error } = await sb.auth.signInAnonymously();
    if (error || !data.user) return { status: 'local-only', userId: null };
    return { status: 'signed-in', userId: data.user.id };
  } catch {
    return { status: 'local-only', userId: null };
  }
}
