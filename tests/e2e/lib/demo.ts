// Node-side oracle for the e2e suite: every expected level, date, count and value is read from the committed
// engine snapshots in app/public/data/demo (never hard-coded; Rule zero). Owner: qa-demo-engineer (T-044).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '..', '..', '..');
export const DEMO_DIR = join(REPO, 'app', 'public', 'data', 'demo');

export type Level = 'normal' | 'watch' | 'warning' | 'severe' | 'stale';
export type Lang = 'en' | 'es';

/** Level words fixed by CLAUDE.md §2 (colour AND word); stale words from the app's dictionaries. */
export const LEVEL_WORDS: Record<Lang, Record<Level, string>> = {
  en: { normal: 'Normal', watch: 'Watch', warning: 'Warning', severe: 'Severe', stale: 'Out of date' },
  es: { normal: 'Normal', watch: 'Vigilancia', warning: 'Aviso', severe: 'Severo', stale: 'Desactualizado' },
};
export const RANK: Record<Level, number> = { stale: -1, normal: 0, watch: 1, warning: 2, severe: 3 };

export function readDemo<T = any>(rel: string): T {
  return JSON.parse(readFileSync(join(DEMO_DIR, rel), 'utf-8')) as T;
}

export interface Factor {
  name: string;
  share: number;
}
export interface Unit {
  unit_id: string;
  alert: {
    level: Level;
    w: number | null;
    factors: Factor[];
    updated_at: string;
    confidence: number;
  };
  features: Record<string, any> | null;
}
export interface Day {
  date: string;
  units: Unit[];
  events: { id: string; unit_id: string; from_level: Level; to_level: Level; at: string; factors: Factor[] }[];
}

export const manifest = readDemo('manifest.json');
export const farm = readDemo('farm.json');
export const verification = readDemo('verification.json');
export const strategies = readDemo('strategies.json');
export const glossary = readDemo('glossary.json');

export const lots: { id: string; name: string; area_ha: number | null; area_ha_origin: string }[] = farm.lots;
export const lotIds = lots.map((l) => l.id);
export const lotName = (id: string) => lots.find((l) => l.id === id)?.name ?? id;

/** Every day of the manifest's replay window, inclusive (the same window the app reads). */
export function replayDays(): string[] {
  const { start, end } = manifest.replay_window as { start: string; end: string };
  const out: string[] = [];
  for (let t = Date.parse(`${start}T00:00:00Z`); t <= Date.parse(`${end}T00:00:00Z`); t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function replayDay(date: string): Day | null {
  const rel = `replay/${date}.json`;
  return existsSync(join(DEMO_DIR, rel)) ? readDemo<Day>(rel) : null;
}

/** The lot units of a day (zones excluded, as on Home). */
export function lotUnits(date: string): Unit[] {
  return (replayDay(date)?.units ?? []).filter((u) => lotIds.includes(u.unit_id));
}

export function levelsOn(date: string): Record<string, Level> {
  return Object.fromEntries(lotUnits(date).map((u) => [u.unit_id, u.alert.level]));
}

/** Days (in window order) on which at least one lot's level differs from the previous day, plus the first day. */
export function transitionDays(until: string): string[] {
  const days = replayDays().filter((d) => d <= until);
  const out: string[] = [];
  let prev: Record<string, Level> | null = null;
  for (const d of days) {
    const cur = levelsOn(d);
    if (!prev || Object.keys(cur).some((id) => cur[id] !== prev?.[id])) out.push(d);
    prev = cur;
  }
  return out;
}

/**
 * Lots whose replay levels, read day by day up to `until`, pass through Watch, then Warning, then Severe.
 * Returns the first day of each stage per lot.
 */
export function escalations(until: string): { id: string; watch: string; warning: string; severe: string }[] {
  const days = replayDays().filter((d) => d <= until);
  const out: { id: string; watch: string; warning: string; severe: string }[] = [];
  for (const id of lotIds) {
    let watch: string | null = null;
    let warning: string | null = null;
    let severe: string | null = null;
    for (const d of days) {
      const l = levelsOn(d)[id];
      if (l === 'watch' && !watch) watch = d;
      if (l === 'warning' && watch && !warning) warning = d;
      if (l === 'severe' && warning && !severe) severe = d;
    }
    if (watch && warning && severe) out.push({ id, watch, warning, severe });
  }
  return out;
}

/** The unit the Home banner should show (SPEC 18): worst of Warning/Severe, then highest W. */
export function bannerUnit(date: string): Unit | null {
  const alerting = lotUnits(date).filter((u) => u.alert.level === 'warning' || u.alert.level === 'severe');
  alerting.sort((a, b) => RANK[b.alert.level] - RANK[a.alert.level] || (b.alert.w ?? -1) - (a.alert.w ?? -1));
  return alerting[0] ?? null;
}

export function topFactor(u: Unit): Factor | null {
  return u.alert.factors.reduce<Factor | null>((best, f) => (best === null || f.share > best.share ? f : best), null);
}

/** Level-change events up to and including `date` for the farm's lots, newest first (stable on ties). */
export function eventsUntil(date: string): Day['events'] {
  const out: Day['events'] = [];
  for (const d of replayDays()) {
    if (d > date) break;
    out.push(...(replayDay(d)?.events ?? []).filter((e) => lotIds.includes(e.unit_id)));
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** en-US / es-EC number formatting as a reader expects it; the decimals come from the quantity kind. */
export function fmt(n: number, decimals: number, lang: Lang = 'en'): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** App dictionaries parsed from source, read-only: used to detect raw keys and untranslated strings. */
export function dictionary(lang: Lang): Record<string, string> {
  const src = readFileSync(join(REPO, 'app', 'src', 'i18n', `${lang}.ts`), 'utf-8');
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/^\s*'([A-Za-z0-9_.]+)':\s*'((?:[^'\\]|\\.)*)',?\s*$/gm)) {
    out[m[1] as string] = (m[2] as string).replace(/\\'/g, "'");
  }
  return out;
}

/** Name the app must never render (D-027): read from the copy-time scrubber, so the test never restates it. */
export function formerAgronomistName(): string {
  const src = readFileSync(join(REPO, 'app', 'scripts', 'build_domain_snapshots.py'), 'utf-8');
  const m = /^NAME_HEX\s*=\s*"([0-9a-f]+)"/m.exec(src);
  if (!m) throw new Error('NAME_HEX not found in app/scripts/build_domain_snapshots.py');
  return Buffer.from(m[1] as string, 'hex').toString('utf-8');
}

export const DEMO_DAY = '2026-02-23';
