// Missing stays missing (DATA_POLICY §2): the word "No data" and, when known, the reason. Never a dash or a zero.
import { UI_COPY, type Lang } from './severity';

export interface MissingDataProps {
  lang?: Lang;
  /** Why it is missing, e.g. "SMAP has no pass for this day". */
  reason?: string;
  /** Inline sits in a row; block stacks the reason under the word. */
  variant?: 'inline' | 'block';
  className?: string;
}

export function MissingData({ lang = 'es', reason, variant = 'inline', className = '' }: MissingDataProps) {
  const word = UI_COPY[lang].noData;
  if (variant === 'block') {
    return (
      <span className={`block ${className}`}>
        <span className="block text-callout font-semibold text-ink-2">{word}</span>
        {reason ? <span className="block text-footnote text-ink-3">{reason}</span> : null}
      </span>
    );
  }
  return (
    <span className={`text-callout text-ink-3 ${className}`} title={reason}>
      <span className="border-b border-dashed border-ink-3">{word}</span>
      {reason ? <span className="sr-only">: {reason}</span> : null}
    </span>
  );
}
