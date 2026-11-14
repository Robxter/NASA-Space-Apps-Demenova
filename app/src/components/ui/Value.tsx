// A measured or computed value: light tabular figures with a small unit; missing values render MissingData.
import { MissingData } from './MissingData';
import type { Lang } from './severity';

export interface ValueProps {
  /** Already formatted by the caller (locale, decimals). null means missing. */
  value: string | null;
  unit?: string;
  /** Accessible label, e.g. "Index W". */
  label?: string;
  size?: 'display' | 'title' | 'body';
  /** Source and freshness, e.g. "NASA SMAP, updated 6 h ago". */
  meta?: string;
  missingReason?: string;
  lang?: Lang;
  className?: string;
}

const SIZES = {
  display: { num: 'text-display', unit: 'text-headline font-normal' },
  title: { num: 'text-title font-light', unit: 'text-callout font-normal' },
  body: { num: 'text-body font-medium', unit: 'text-footnote font-normal' },
} as const;

export function Value({ value, unit, label, size = 'body', meta, missingReason, lang = 'es', className = '' }: ValueProps) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex flex-col ${className}`}>
      {label ? <span className="text-footnote text-ink-2">{label}</span> : null}
      {value === null ? (
        <MissingData lang={lang} reason={missingReason} variant={size === 'body' ? 'inline' : 'block'} />
      ) : (
        <span className="dn-num text-ink">
          <span className={s.num}>{value}</span>
          {unit ? <span className={`ml-1 text-ink-2 ${s.unit}`}>{unit}</span> : null}
        </span>
      )}
      {meta ? <span className="mt-0.5 text-footnote text-ink-3">{meta}</span> : null}
    </span>
  );
}
