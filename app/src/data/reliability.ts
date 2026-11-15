// "How reliable is this?" (D-028, D-029): everything numeric comes from verification.json. Counts only: POD, FAR and
// CSI are never shown (the file's notes say so). Until the contract gains a structured sensitivity field (P-015), the
// sensitivity, lead-time and known-limit passages are quoted from the file's notes, never rewritten with numbers.
import type { AppManifest, Origin, VerificationEvent, VerificationFile } from '../types/contracts';
import { fromSpec } from './origin';
import { resolveProvenance } from './snapshots';

/** Section headings used in verification.json notes. Order does not matter; each section ends at the next heading. */
const HEADINGS = {
  leadTime: /LEAD TIME:/,
  knownLimits: /KNOWN LIMITS:/,
  sensitivity: /SENSITIVITY(?: \([^)]*\))?:/,
} as const;
const ANY_HEADING = /\b(?:LEAD TIME|KNOWN LIMITS|SENSITIVITY(?: \([^)]*\))?|COUNTS ONLY[^:]*):|\([a-z]\) [A-Z][A-Z' ]+[,(]/g;

export function noteSection(notes: string | null | undefined, which: keyof typeof HEADINGS): string | null {
  if (!notes) return null;
  const m = HEADINGS[which].exec(notes);
  if (!m) return null;
  const from = m.index + m[0].length;
  ANY_HEADING.lastIndex = from;
  let end = notes.length;
  for (let h = ANY_HEADING.exec(notes); h; h = ANY_HEADING.exec(notes)) {
    if (h.index >= from) {
      end = h.index;
      break;
    }
  }
  const text = notes.slice(from, end).trim();
  return text || null;
}

export interface Count {
  value: number;
  origin: Origin | null;
}

export interface Reliability {
  hits: Count;
  misses: Count;
  falseAlarms: Count;
  /** Period the counts cover, from the file's provenance time_range; null when not stated. */
  period: [string, string] | null;
  events: VerificationEvent[];
  sensitivity: string | null;
  leadTime: string | null;
  knownLimits: string | null;
  generatedAt: string;
}

export function reliabilityFrom(v: VerificationFile, manifest: AppManifest | null): Reliability {
  const count = (key: 'hits' | 'misses' | 'false_alarms'): Count => ({ value: v[key], origin: fromSpec(v.origin, key) });
  const range = resolveProvenance(v.provenance, manifest).find((p) => p.time_range)?.time_range ?? null;
  // Contract 1.2.0 may add a structured `sensitivity`; a plain summary string there wins over the notes.
  const structured = (v as VerificationFile & { sensitivity?: unknown }).sensitivity;
  const summary = structured && typeof structured === 'object' && typeof (structured as { summary?: unknown }).summary === 'string'
    ? ((structured as { summary: string }).summary)
    : typeof structured === 'string'
      ? structured
      : null;
  return {
    hits: count('hits'),
    misses: count('misses'),
    falseAlarms: count('false_alarms'),
    period: range,
    events: [...v.events].sort((a, b) => a.start.localeCompare(b.start)),
    sensitivity: summary ?? noteSection(v.notes, 'sensitivity'),
    leadTime: noteSection(v.notes, 'leadTime'),
    knownLimits: noteSection(v.notes, 'knownLimits'),
    generatedAt: v.generated_at,
  };
}
