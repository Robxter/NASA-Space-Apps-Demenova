// Inset group (not a floating SaaS card): sentence-case header above, surface group, source line below.
import type { ReactNode } from 'react';

export interface CardProps {
  /** Group header in sentence case, e.g. "Lots by risk". Rendered as a heading. */
  title?: string;
  /** Heading level for the title; defaults to h2. */
  headingLevel?: 2 | 3;
  /** Small trailing control next to the header (e.g. a DemoChip or a text button). */
  action?: ReactNode;
  /**
   * Source and freshness below the group. An array renders one line per part (e.g. the source, then
   * "Updated ..."), so callers do not join parts with a middle dot (CHANGE_LIST CL-12). Empty parts are skipped.
   */
  footer?: ReactNode | ReactNode[];
  /** Padding inside the group. Use false when the child is a <List>. */
  padded?: boolean;
  children: ReactNode;
  className?: string;
}

export function Card({ title, headingLevel = 2, action, footer, padded = true, children, className = '' }: CardProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const lines = Array.isArray(footer) ? footer.filter((part) => part !== null && part !== undefined && part !== false && part !== '') : null;
  return (
    <section className={`min-w-0 ${className}`}>
      {title || action ? (
        <div className="mb-2 flex min-h-6 items-end justify-between gap-3 px-4">
          {title ? <Heading className="m-0 text-footnote font-semibold text-ink-2">{title}</Heading> : <span />}
          {action}
        </div>
      ) : null}
      <div className={`overflow-hidden rounded-group bg-surface ${padded ? 'p-4' : ''}`}>{children}</div>
      {lines ? (
        lines.length > 0 ? (
          <div className="mt-2 flex flex-col gap-0.5 px-4 text-footnote text-ink-3">
            {lines.map((part, i) => (
              <span key={i} className="block">
                {part}
              </span>
            ))}
          </div>
        ) : null
      ) : footer ? (
        <div className="mt-2 px-4 text-footnote text-ink-3">{footer}</div>
      ) : null}
    </section>
  );
}
