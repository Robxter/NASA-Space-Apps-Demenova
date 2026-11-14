// Severity words and proposed UI copy for the presentational components. Owner: product-designer.
// The four level words are fixed by CLAUDE.md §2. frontend-engineer's dictionaries may override any string
// through component props; these are the defaults so a level can never render without its word.
import type { Severity } from '../../types/contracts';

export type Lang = 'es' | 'en';

export const SEVERITY_WORDS: Record<Lang, Record<Severity, string>> = {
  es: { normal: 'Normal', watch: 'Vigilancia', warning: 'Aviso', severe: 'Severo', stale: 'Desactualizado' },
  en: { normal: 'Normal', watch: 'Watch', warning: 'Warning', severe: 'Severe', stale: 'Out of date' },
};

/** Height of the water in the soil-core glyph, 0..1. A colour-free cue for the level. */
export const SEVERITY_WATER: Record<Severity, number> = {
  normal: 0.25,
  watch: 0.5,
  warning: 0.75,
  severe: 1,
  stale: 0,
};

export function severityWord(level: Severity, lang: Lang = 'es'): string {
  return SEVERITY_WORDS[lang][level];
}

/** Proposed copy (sentence case, user's side). frontend-engineer owns the final dictionaries. */
export const UI_COPY = {
  es: {
    noData: 'Sin datos',
    demo: 'Demo',
    demoHint: 'Datos de ejemplo',
    play: 'Reproducir',
    pause: 'Pausar',
    replayDay: 'Día de la reproducción',
    loading: 'Cargando',
  },
  en: {
    noData: 'No data',
    demo: 'Demo',
    demoHint: 'Example data',
    play: 'Play replay',
    pause: 'Pause replay',
    replayDay: 'Replay day',
    loading: 'Loading',
  },
} as const satisfies Record<Lang, Record<string, string>>;
