// Alert banner for Home: shown only when a lot is Warning or Severe (docs/spec/18). Severe is the one solid fill.
import type { Severity } from '../../types/contracts';
import { SeverityGlyph } from './SeverityGlyph';
import { severityWord, type Lang } from './severity';

export interface AlertBannerProps {
  level: Severity;
  /** Lot name, e.g. "Lote 4". */
  title: string;
  /** Top factor in one line, written by the caller. */
  reason?: string;
  /** Freshness line, e.g. "Updated 2 h ago". */
  meta?: string;
  lang?: Lang;
  label?: string;
  /** When set, the whole banner is a button that opens the lot (its text is the accessible name). */
  onOpen?: () => void;
  onset?: boolean;
  className?: string;
}

export function AlertBanner({
  level,
  title,
  reason,
  meta,
  lang = 'es',
  label,
  onOpen,
  onset = false,
  className = '',
}: AlertBannerProps) {
  const solid = level === 'severe';
  const word = label && label.trim() !== '' ? label : severityWord(level, lang);
  const skin = solid ? 'bg-severe-solid text-on-severe-solid' : 'bg-lvl-tint text-lvl-ink';
  const quiet = solid ? 'text-on-severe-solid/90' : 'text-lvl-ink';

  const body = (
    <>
      <SeverityGlyph level={level} size={30} inverse={solid} onset={onset} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="block text-headline">
          {word}
          <span className="font-normal">, {title}</span>
        </span>
        {reason ? <span className="mt-0.5 block text-callout">{reason}</span> : null}
        {meta ? <span className={`mt-1 block text-footnote ${quiet}`}>{meta}</span> : null}
      </span>
      {onOpen ? (
        <svg aria-hidden="true" viewBox="0 0 8 14" width="8" height="14" className="mt-2 shrink-0">
          <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </>
  );

  const frame = `flex w-full items-start gap-3 rounded-group px-4 py-3.5 text-left shadow-banner ${skin} ${className}`;

  return onOpen ? (
    <button
      type="button"
      data-level={level}
      onClick={onOpen}
      className={`${frame} min-h-12 transition-transform duration-[120ms] ease-standard active:scale-[0.99]`}
    >
      {body}
    </button>
  ) : (
    <div data-level={level} className={frame}>
      {body}
    </div>
  );
}
