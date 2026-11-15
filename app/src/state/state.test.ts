import { describe, expect, it } from 'vitest';
import { href, parseHash, tabOf } from './nav';
import { readPrefs } from './prefs';
import { daysInRange, formatDate, formatInstant } from '../time';
import type { UserPrefs } from '../types/contracts';

describe('hash navigation', () => {
  it('parses tabs, lots, strategies and the replay day', () => {
    expect(parseHash('#map').route).toEqual({ name: 'map' });
    expect(parseHash('#lot/lot_demo_3')).toEqual({ route: { name: 'lot', id: 'lot_demo_3' }, date: null });
    expect(parseHash('#strategies/lot_demo_3').route).toEqual({ name: 'strategies', id: 'lot_demo_3' });
    expect(parseHash('#map?d=2026-02-22').date).toBe('2026-02-22');
    expect(parseHash('#map?d=yesterday').date).toBeNull();
  });

  it('falls back to home for unknown or incomplete hashes', () => {
    for (const h of ['#nope', '#lot', '#lot/']) expect(parseHash(h).route).toEqual({ name: 'home' });
  });

  it('opens the Welcome page for an empty hash (D-036)', () => {
    for (const h of ['', '#']) expect(parseHash(h).route).toEqual({ name: 'welcome', tab: 'home' });
  });

  it('round-trips ids through href', () => {
    const r = { name: 'lot', id: 'lot_a b' } as const;
    expect(parseHash(href(r)).route).toEqual(r);
    expect(tabOf({ name: 'lot', id: 'x' })).toBe('home');
    expect(tabOf({ name: 'alerts' })).toBe('alerts');
  });
});

describe('prefs', () => {
  const fallback: UserPrefs = {
    user_id: null,
    device_id: 'dev-1',
    language: 'es',
    units: 'metric',
    mode: 'agronomist',
    storage_mode: 'full',
    theme: 'system',
  };

  it('keeps known values and rejects unknown ones', () => {
    const p = readPrefs(JSON.stringify({ language: 'en', units: 'furlongs', device_id: 'dev-9', theme: 'dark' }), fallback);
    expect(p).toMatchObject({ language: 'en', units: 'metric', device_id: 'dev-9', theme: 'dark' });
  });

  it('survives corrupt storage', () => {
    expect(readPrefs('{not json', fallback)).toEqual(fallback);
    expect(readPrefs(null, fallback)).toEqual(fallback);
  });
});

describe('time display', () => {
  it('shows UTC instants in Guayaquil time (UTC-5)', () => {
    expect(formatInstant('2026-02-22T15:00:00Z', 'metric', 'es')).toBe('22/02/2026 10:00');
    expect(formatInstant('2026-02-23T03:30:00Z', 'metric', 'en')).toBe('22/02/2026 22:30');
    expect(formatInstant('2026-02-22T15:00:00Z', 'imperial', 'en')).toBe('02/22/2026 10:00 AM');
    expect(formatInstant(null, 'metric', 'en')).toBeNull();
    expect(formatInstant('garbage', 'metric', 'en')).toBeNull();
  });

  it('never shifts calendar dates', () => {
    expect(formatDate('2026-02-22', 'metric')).toBe('22/02/2026');
    expect(formatDate('2026-02-22', 'imperial')).toBe('02/22/2026');
  });

  it('lists the replay window inclusively', () => {
    const days = daysInRange('2026-02-15', '2026-03-05');
    expect(days).toHaveLength(19);
    expect(days).toContain('2026-02-28');
    expect(days).toContain('2026-03-01');
    expect(daysInRange('2026-03-05', '2026-02-15')).toEqual([]);
  });
});
