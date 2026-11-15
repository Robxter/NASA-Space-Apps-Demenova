// Hand-rolled hash navigation (no router): #home, #map, #alerts, #learn, #settings, #setup, #lot/<id>, #strategies/<id>.
// An optional query sets the replay day for deep links and tests: #map?d=2026-02-22.
// Block 4 (D-036): an EMPTY hash, #welcome, #welcome/instructions and #welcome/qa open the Welcome page (the project's
// reception); every app hash above parses exactly as before, and an unknown hash still opens the app's Home.
import { useSyncExternalStore } from 'react';

export type Tab = 'home' | 'map' | 'alerts' | 'learn';

export type WelcomeTab = 'home' | 'instructions' | 'qa';

export type Route =
  | { name: Tab | 'settings' | 'setup' }
  | { name: 'lot'; id: string }
  | { name: 'strategies'; id: string }
  | { name: 'welcome'; tab: WelcomeTab };

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
  if (path === '' || head === 'welcome') {
    const sub = rest[0];
    const tab: WelcomeTab = sub === 'instructions' || sub === 'qa' ? sub : 'home';
    return { route: { name: 'welcome', tab }, date };
  }
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
  if (route.name === 'welcome') return route.tab === 'home' ? '#welcome' : `#welcome/${route.tab}`;
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
