// Severity badge: soil core + level word on the level's tint. Colour AND word, always (CLAUDE.md §2).
import type { Severity } from '../../types/contracts';
import { SeverityGlyph } from './SeverityGlyph';
import { severityWord, type Lang } from './severity';

export interface SeverityBadgeProps {
  level: Severity;
  lang?: Lang;
  /** Overrides the built-in word (frontend-engineer's dictionary). Never pass an empty string. */
  label?: string;
  size?: 'sm' | 'md';
  /** tint: pill on the level's tint (default). plain: glyph and coloured word only, for list rows and tables. */
  variant?: 'tint' | 'plain';
  /** Hide the core when a glyph already leads the row (the word stays). */
  glyph?: boolean;
  /** Plays the Severe ripple on the glyph. */
  onset?: boolean;
  className?: string;
}

export function SeverityBadge({
  level,
  lang = 'es',
  label,
  size = 'md',
  variant = 'tint',
  glyph = true,
  onset = false,
  className = '',
}: SeverityBadgeProps) {
  const word = label && label.trim() !== '' ? label : severityWord(level, lang);
  const text = size === 'sm' ? 'gap-1 text-caption font-semibold' : 'gap-1.5 text-footnote font-semibold';
  const pad = variant === 'plain' ? '' : size === 'sm' ? 'rounded-full bg-lvl-tint px-2 py-0.5' : 'rounded-full bg-lvl-tint px-2.5 py-1';
  return (
    <span
      data-level={level}
      className={`inline-flex items-center whitespace-nowrap text-lvl-ink ${text} ${pad} ${className}`}
    >
      {glyph ? <SeverityGlyph level={level} size={size === 'sm' ? 13 : 16} onset={onset} /> : null}
      {word}
    </span>
  );
}
