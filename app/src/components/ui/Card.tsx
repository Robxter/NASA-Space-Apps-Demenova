// Inset group (not a floating SaaS card): sentence-case header above, surface group, source line below.
import type { ReactNode } from 'react';

export interface CardProps {
  /** Group header in sentence case, e.g. "Lots by risk". Rendered as a heading. */
  title?: string;
  /** Heading level for the title; defaults to h2. */
  headingLevel?: 2 | 3;
  /** Small trailing control next to the header (e.g. a DemoChip or a text button). */
  action?: ReactNode;
  /** Source and freshness below the group, e.g. "NASA GPM IMERG, updated 2 h ago". */
  footer?: ReactNode;
  /** Padding inside the group. Use false when the child is a <List>. */
  padded?: boolean;
  children: ReactNode;
  className?: string;
}

export function Card({ title, headingLevel = 2, action, footer, padded = true, children, className = '' }: CardProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <section className={`min-w-0 ${className}`}>
      {title || action ? (
        <div className="mb-2 flex min-h-6 items-end justify-between gap-3 px-4">
          {title ? <Heading className="m-0 text-footnote font-semibold text-ink-2">{title}</Heading> : <span />}
          {action}
        </div>
      ) : null}
      <div className={`overflow-hidden rounded-group bg-surface ${padded ? 'p-4' : ''}`}>{children}</div>
      {footer ? <div className="mt-2 px-4 text-footnote text-ink-3">{footer}</div> : null}
    </section>
  );
}
