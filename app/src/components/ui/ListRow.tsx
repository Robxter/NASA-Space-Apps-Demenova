// List and ListRow: rows of an inset group. Rows that navigate show a chevron and are buttons; 56 px minimum.
import type { ReactNode } from 'react';

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
  /** Usually a SeverityGlyph or SeverityBadge. */
  leading?: ReactNode;
  title: string;
  /** One line, e.g. the level word and the top factor. Truncates. */
  subtitle?: ReactNode;
  /** Usually a Value (W) or a DemoChip. */
  trailing?: ReactNode;
  /** Makes the row a button and shows a chevron. */
  onPress?: () => void;
  className?: string;
}

export function ListRow({ leading, title, subtitle, trailing, onPress, className = '' }: ListRowProps) {
  const inner = (
    <>
      {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-ink">{title}</span>
        {subtitle ? <span className="block truncate text-footnote text-ink-2">{subtitle}</span> : null}
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
          className={`${layout} bg-transparent transition-colors duration-[120ms] ease-standard active:bg-surface-2`}
        >
          {inner}
        </button>
      ) : (
        <div className={layout}>{inner}</div>
      )}
    </li>
  );
}
