// Display helpers for strategies.json. They filter and order; scores are shown as stored, never recomputed.
import type { Language, LocalizedText, NumericValue, Strategy } from '../types/contracts';

/** Origins that count as "sourced" for cost and labour (D-028): read from a source, calibrated, or given by the farm. */
const SOURCED = new Set(['sourced', 'calibrated', 'provided', 'observed']);

export function isSourcedScore(v: NumericValue): boolean {
  return v.value !== null && SOURCED.has(v.origin);
}

/** Strategies for one unit (its own, else the regional defaults marked "*"), ordered A, B, C. */
export function strategiesForUnit(all: readonly Strategy[], unitId: string): Strategy[] {
  const own = all.filter((s) => s.lot_scope.includes(unitId));
  const pick = own.length ? own : all.filter((s) => s.lot_scope.includes('*'));
  return [...pick].sort((a, b) => a.label.localeCompare(b.label));
}

/** Text in the asked language; null when that language was not written (never machine-filled). */
export function localized(text: LocalizedText | null | undefined, lang: Language): string | null {
  const v = text?.[lang];
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}
