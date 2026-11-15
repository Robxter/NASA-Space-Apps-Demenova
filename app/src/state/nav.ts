// Hand-rolled hash navigation (no router): #home, #map, #alerts, #learn, #settings, #setup, #lot/<id>, #strategies/<id>.
// An optional query sets the replay day for deep links and tests: #map?d=2026-02-22.
import { useSyncExternalStore } from 'react';

export type Tab = 'home' | 'map' | 'alerts' | 'learn';

export type Route =
  | { name: Tab | 'settings' | 'setup' }
  | { name: 'lot'; id: string }
  | { name: 'strategies'; id: string };

export interface ParsedHash {
  route: Route;
  date: string | null;
}

const SIMPLE = new Set(['home', 'map', 'alerts', 'learn', 'settings', 'setup']);

export function parseHash(hash: string): ParsedHash {
  const raw = hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const d = new URLSearchParams(query).get('d');
  const date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  const [head = '', ...rest] = path.split('/');
  const id = rest.length ? safeDecode(rest.join('/')) : '';
  if ((head === 'lot' || head === 'strategies') && id) return { route: { name: head, id }, date };
  if (SIMPLE.has(head)) return { route: { name: head as Tab | 'settings' | 'setup' }, date };
  return { route: { name: 'home' }, date };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function href(route: Route): string {
  return 'id' in route ? `#${route.name}/${encodeURIComponent(route.id)}` : `#${route.name}`;
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}

/** Which tab is highlighted for a route (lot and strategies sit under Home; settings too). */
export function tabOf(route: Route): Tab {
  return route.name === 'map' || route.name === 'alerts' || route.name === 'learn' ? route.name : 'home';
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash, () => '');
}
