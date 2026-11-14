// Empty, offline, error and missing-data blocks. They say what happened and invite the next action.
import type { ReactNode } from 'react';

export type EmptyTone = 'empty' | 'offline' | 'error' | 'missing';

export interface EmptyStateProps {
  tone?: EmptyTone;
  /** What happened, in one line: "No alerts yet". */
  title: string;
  /** What it means or how to fix it: "You will see level changes here as they happen." */
  body?: string;
  /** Usually a Button. */
  action?: ReactNode;
  className?: string;
}

// An empty core, the same object as the severity glyph: dashed when the data is out of reach.
function CoreIllustration({ tone }: { tone: EmptyTone }) {
  const dashed = tone === 'offline' || tone === 'missing';
  const stroke = tone === 'error' ? 'var(--dn-warning-ink)' : 'var(--dn-ink-3)';
  return (
    <svg aria-hidden="true" viewBox="0 0 28 36" width="28" height="36">
      <rect x="1.5" y="1.5" width="25" height="33" rx="6" fill="none" stroke={stroke} strokeWidth="2" strokeDasharray={dashed ? '4 3' : undefined} />
      {tone === 'error' ? <path d="M14 10v10M14 25v.5" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" /> : null}
      {tone === 'empty' ? <path d="M7 26h14" stroke={stroke} strokeWidth="2" strokeLinecap="round" /> : null}
    </svg>
  );
}

export function EmptyState({ tone = 'empty', title, body, action, className = '' }: EmptyStateProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={`flex flex-col items-center gap-3 px-6 py-8 text-center ${className}`}
    >
      <CoreIllustration tone={tone} />
      <div className="max-w-72">
        <p className="m-0 text-headline text-ink">{title}</p>
        {body ? <p className="m-0 mt-1 text-callout text-ink-2">{body}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
