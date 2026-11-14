// Display selectors over engine output. They sort, count and pick; they never compute a level or W
// (the engine owns alert logic; the app only displays what it produced).
import { SEVERITY_VALUES, type Factor, type ReplayDay, type ReplayUnit, type Severity } from '../types/contracts';

/** Display order of levels; stale ranks below normal because it says nothing about water. */
export const LEVEL_RANK: Record<Severity, number> = { stale: -1, normal: 0, watch: 1, warning: 2, severe: 3 };

/** Highest level on a day for the replay strip; null when the day has no file or no units. */
export function highestLevel(day: ReplayDay | null | undefined): Severity | null {
  if (!day || day.units.length === 0) return null;
  return day.units.reduce<Severity>(
    (best, u) => (LEVEL_RANK[u.alert.level] > LEVEL_RANK[best] ? u.alert.level : best),
    'stale',
  );
}

export function countByLevel(units: readonly ReplayUnit[]): Record<Severity, number> {
  const out = Object.fromEntries(SEVERITY_VALUES.map((s) => [s, 0])) as Record<Severity, number>;
  for (const u of units) out[u.alert.level] += 1;
  return out;
}

/** Highest W first; units without W go last, then by level, then by id for a stable order. */
export function sortByW(units: readonly ReplayUnit[]): ReplayUnit[] {
  return [...units].sort((a, b) => {
    const wa = a.alert.w;
    const wb = b.alert.w;
    if (wa !== null && wb !== null && wa !== wb) return wb - wa;
    if (wa === null && wb !== null) return 1;
    if (wb === null && wa !== null) return -1;
    const r = LEVEL_RANK[b.alert.level] - LEVEL_RANK[a.alert.level];
    return r !== 0 ? r : a.unit_id.localeCompare(b.unit_id);
  });
}

/** The unit the Home banner shows: only Warning or Severe (SPEC 18), worst level first, then highest W. */
export function bannerUnit(units: readonly ReplayUnit[]): ReplayUnit | null {
  const alerting = units.filter((u) => u.alert.level === 'warning' || u.alert.level === 'severe');
  if (!alerting.length) return null;
  return [...alerting].sort(
    (a, b) => LEVEL_RANK[b.alert.level] - LEVEL_RANK[a.alert.level] || (b.alert.w ?? -1) - (a.alert.w ?? -1),
  )[0] ?? null;
}

export function topFactor(factors: readonly Factor[]): Factor | null {
  return factors.reduce<Factor | null>((best, f) => (best === null || f.share > best.share ? f : best), null);
}

/** Highest W among units, with the unit it belongs to; null when no unit has a W. */
export function highestW(units: readonly ReplayUnit[]): ReplayUnit | null {
  return units.reduce<ReplayUnit | null>((best, u) => {
    if (u.alert.w === null) return best;
    return best === null || (best.alert.w ?? -1) < u.alert.w ? u : best;
  }, null);
}

/** Newest `updated_at` among units (the freshness line on Home). */
export function newestUpdate(units: readonly ReplayUnit[]): string | null {
  let best: string | null = null;
  for (const u of units) if (!best || Date.parse(u.alert.updated_at) > Date.parse(best)) best = u.alert.updated_at;
  return best;
}
