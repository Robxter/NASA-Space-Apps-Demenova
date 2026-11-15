// User preferences (UserPrefs contract) in React context, persisted to localStorage. No state library.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { detectLanguage, makeT, type Translate } from '../i18n';
import type { UserPrefs } from '../types/contracts';

const KEY = 'demenova.prefs.v1';

function newDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Full storage by default; Data saver when the browser asks to save data (ADR-004). */
function defaultStorage(): UserPrefs['storage_mode'] {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData ? 'saver' : 'full';
}

export function defaultPrefs(): UserPrefs {
  return {
    user_id: null,
    device_id: newDeviceId(),
    language: detectLanguage(typeof navigator === 'undefined' ? undefined : navigator.language),
    units: 'metric',
    mode: 'agronomist',
    storage_mode: typeof navigator === 'undefined' ? 'full' : defaultStorage(),
    theme: 'system',
  };
}

/** Reads stored prefs, keeping only known values; anything unreadable falls back to the default. */
export function readPrefs(raw: string | null, fallback: UserPrefs): UserPrefs {
  if (!raw) return fallback;
  try {
    const p = JSON.parse(raw) as Partial<UserPrefs>;
    const pick = <K extends keyof UserPrefs>(k: K, allowed: readonly UserPrefs[K][]): UserPrefs[K] =>
      allowed.includes(p[k] as UserPrefs[K]) ? (p[k] as UserPrefs[K]) : fallback[k];
    return {
      user_id: typeof p.user_id === 'string' ? p.user_id : null,
      device_id: typeof p.device_id === 'string' && p.device_id ? p.device_id : fallback.device_id,
      language: pick('language', ['en', 'es']),
      units: pick('units', ['metric', 'imperial']),
      mode: pick('mode', ['farmer', 'agronomist']),
      storage_mode: pick('storage_mode', ['full', 'saver']),
      theme: pick('theme', ['system', 'light', 'dark']),
    };
  } catch {
    return fallback;
  }
}

/**
 * Status-bar colour (mobile-native fix 10). index.html carries one theme-color per prefers-color-scheme; a forced
 * theme overrides both with the page background token, read from CSS so no colour is written here.
 */
function syncThemeColor(theme: UserPrefs['theme']): void {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m) => {
    if (!m.dataset.scheme) m.dataset.scheme = m.media.includes('dark') ? 'dark' : 'light';
    if (!m.dataset.initial) m.dataset.initial = m.content;
  });
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--dn-bg').trim();
  metas.forEach((m) => {
    m.content = theme === 'system' || !bg ? (m.dataset.initial ?? m.content) : bg;
  });
}

interface PrefsValue {
  prefs: UserPrefs;
  set: <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => void;
  t: Translate;
}

const PrefsContext = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UserPrefs>(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch {
      raw = null;
    }
    return readPrefs(raw, defaultPrefs());
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* private mode: prefs live for this session only */
    }
    const html = document.documentElement;
    html.lang = prefs.language;
    if (prefs.theme === 'system') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', prefs.theme);
    syncThemeColor(prefs.theme);
  }, [prefs]);

  // Data saver keeps no imagery cache (ADR-004): drop the runtime tile cache when it is selected.
  useEffect(() => {
    if (prefs.storage_mode === 'saver' && typeof caches !== 'undefined') void caches.delete('gibs-tiles').catch(() => false);
  }, [prefs.storage_mode]);

  const set = useCallback<PrefsValue['set']>((key, value) => setPrefs((p) => ({ ...p, [key]: value })), []);
  const value = useMemo(() => ({ prefs, set, t: makeT(prefs.language) }), [prefs, set]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const v = useContext(PrefsContext);
  if (!v) throw new Error('usePrefs outside PrefsProvider');
  return v;
}
