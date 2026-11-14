// Time display (ADR-002): instants are stored UTC and shown in America/Guayaquil; dates (YYYY-MM-DD) are calendar
// days and are never shifted by a time zone. Date order follows the unit system (CONTRACTS.md §2).
import type { Language, UnitSystem } from './types/contracts';

export const DISPLAY_TZ = 'America/Guayaquil';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(s: string): boolean {
  return DATE_RE.test(s);
}

/** DD/MM/YYYY (metric) or MM/DD/YYYY (imperial). Invalid input is returned unchanged. */
export function formatDate(date: string, units: UnitSystem): string {
  const m = DATE_RE.exec(date);
  if (!m) return date;
  const [, y, mo, d] = m;
  return units === 'imperial' ? `${mo}/${d}/${y}` : `${d}/${mo}/${y}`;
}

/** Short day label for the replay strip, e.g. "22 feb" / "Feb 22". */
export function formatDayShort(date: string, lang: Language): string {
  const m = DATE_RE.exec(date);
  if (!m) return date;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-EC' : 'en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(dt)
    .replace('.', '');
}

export function formatDayLong(date: string, lang: Language): string {
  const m = DATE_RE.exec(date);
  if (!m) return date;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-EC' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

/** A UTC instant shown in Guayaquil time: "22/02/2026 10:00" (metric) or "02/22/2026 10:00 AM". */
export function formatInstant(iso: string | null | undefined, units: UnitSystem, lang: Language): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: units === 'imperial' && lang === 'en' ? 'h12' : 'h23',
  }).formatToParts(new Date(t));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const date = formatDate(`${get('year')}-${get('month')}-${get('day')}`, units);
  const period = get('dayPeriod');
  return `${date} ${get('hour')}:${get('minute')}${period ? ` ${period}` : ''}`;
}

/** Every calendar day from start to end inclusive (YYYY-MM-DD). Empty on invalid input or end before start. */
export function daysInRange(start: string, end: string): string[] {
  if (!isIsoDate(start) || !isIsoDate(end)) return [];
  const out: string[] = [];
  const t0 = Date.parse(`${start}T00:00:00Z`);
  const t1 = Date.parse(`${end}T00:00:00Z`);
  for (let t = t0; t <= t1 && out.length < 400; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}
