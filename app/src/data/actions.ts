// The check per alert level and mode (domain/actions.yaml via actions.json). The app picks one; it never writes one.
import type { ActionEntry, Mode, Severity } from '../types/contracts';

/** The check for a level in a mode; null for `stale` or when the file has none (shown as nothing, never invented). */
export function checkFor(actions: readonly ActionEntry[], level: Severity | null | undefined, mode: Mode): ActionEntry | null {
  if (!level || level === 'stale') return null;
  return actions.find((a) => a.level === level && a.mode === mode) ?? null;
}

/** Not reviewed unless a human review is recorded (D-025: human_review none) or a local agronomist approved it. */
export function isReviewed(item: { approved_by?: string | null; human_review?: unknown }): boolean {
  return Boolean(item.approved_by) || (typeof item.human_review === 'string' && item.human_review !== 'none');
}
