// List and ListRow: rows of an inset group. Rows that navigate show a chevron and are buttons; 56 px minimum.
// With `level`, the row leads with a fixed-width soil core and the level word opens the subtitle in level ink,
// so lot names align and keep their width at 360 px (CHANGE_LIST CL-10).
import type { ReactNode } from 'react';
import type { Severity } from '../../types/contracts';
import { SeverityGlyph } from './SeverityGlyph';
import { severityWord, type Lang } from './severity';

export interface ListProps {
  children: ReactNode;
  /** Accessible name for the list, if the surrounding Card title does not already name it. */
  label?: string;
  className?: string;
}

export function List({ children, label, className = '' }: ListProps) {
  return (
    <ul role="list" aria-label={label} className={`dn-list m-0 list-none p-0 ${className}`}>
      {children}
    </ul>
  );
}

export interface ListRowProps {
  /** Usually a SeverityGlyph or SeverityBadge. Overrides the core drawn from `level`. */
  leading?: ReactNode;
  /** Up to two lines, then clipped. */
  title: string;
  /** One line, e.g. the top factor. Truncates. */
  subtitle?: ReactNode;
  /** Usually a Value (W) or a DemoChip. */
  trailing?: ReactNode;
  /** Makes the row a button and shows a chevron. */
  onPress?: () => void;
  /** Severity of the row: draws the core in the leading slot and the level word before the subtitle. */
  level?: Severity;
  /** The level word from the dictionary (frontend-engineer's i18n); falls back to the built-in word. */
  levelLabel?: string;
  lang?: Lang;
  /** Plays the core's flood once (only for a fresh Severe; see SeverityGlyph). */
  onset?: boolean;
  className?: string;
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  level,
  levelLabel,
  lang = 'es',
  onset = false,
  className = '',
}: ListRowProps) {
  const lead = leading ?? (level ? <SeverityGlyph level={level} size={18} onset={onset} /> : null);
  const word = level ? (levelLabel && levelLabel.trim() !== '' ? levelLabel : severityWord(level, lang)) : null;
  const inner = (
    <>
      {lead ? (
        <span className={`flex shrink-0 items-center ${leading ? '' : 'w-[14px] justify-center'}`}>{lead}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 break-words text-body font-medium text-ink">{title}</span>
        {word || subtitle ? (
          <span className="flex min-w-0 items-baseline gap-1.5 text-footnote text-ink-2">
            {word ? (
              <span data-level={level} className="shrink-0 font-semibold text-lvl-ink">
                {word}
              </span>
            ) : null}
            {word && subtitle ? <span className="sr-only">, </span> : null}
            {subtitle ? <span className="min-w-0 truncate">{subtitle}</span> : null}
          </span>
        ) : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center text-right">{trailing}</span> : null}
      {onPress ? (
        <svg aria-hidden="true" viewBox="0 0 8 14" width="7" height="12" className="shrink-0 text-ink-3">
          <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </>
  );
  const layout = 'flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left';
  return (
    <li className={className}>
      {onPress ? (
        <button
          type="button"
          onClick={onPress}
          className={`${layout} bg-transparent transition-colors duration-press ease-out active:bg-surface-2`}
        >
          {inner}
        </button>
      ) : (
        <div className={layout}>{inner}</div>
      )}
    </li>
  );
}
