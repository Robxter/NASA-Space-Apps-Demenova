// Empty, offline, error and missing-data blocks. They say what happened and invite the next action.
// Block 5 (D-038): a richer drawing of the same soil core, set in the ground, and a quiet arrival (the drawing scales
// in on the spring, the words follow 80 ms later; still under prefers-reduced-motion). Props unchanged.
import type { ReactNode } from 'react';

/** calm: nothing is wrong (e.g. all lots Normal); the core shows low water, the Normal level, so "fine" is visible. */
export type EmptyTone = 'empty' | 'offline' | 'error' | 'missing' | 'calm';

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

// The soil core standing in the ground, the same object as the severity glyph and the logo: dashed when the data is
// out of reach, low water when all is calm, a mark when something failed.
function CoreIllustration({ tone }: { tone: EmptyTone }) {
  const dashed = tone === 'offline' || tone === 'missing';
  const stroke = tone === 'error' ? 'var(--dn-warning-ink)' : tone === 'calm' ? 'var(--dn-normal-ink)' : 'var(--dn-ink-3)';
  return (
    <svg aria-hidden="true" viewBox="0 0 72 64" width="72" height="64">
      {/* The ground: a soft band under a hairline horizon. */}
      <rect x="4" y="40" width="64" height="20" rx="10" fill="var(--dn-surface-2)" />
      <path d="M6 40h60" stroke="var(--dn-line-strong)" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={dashed ? '3 4' : undefined} />
      {/* The core: half above the ground, half in the root zone. */}
      <rect x="25" y="6" width="22" height="50" rx="7" fill="var(--dn-surface)" />
      {tone === 'calm' ? <rect x="29" y="40" width="14" height="12" rx="3" fill="var(--dn-normal-fill)" /> : null}
      <rect x="25" y="6" width="22" height="50" rx="7" fill="none" stroke={stroke} strokeWidth="2.2" strokeDasharray={dashed ? '4.5 3.5' : undefined} />
      {tone === 'error' ? <path d="M36 18v14M36 39v.5" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" /> : null}
      {tone === 'offline' ? (
        <path d="M54 14a9 9 0 0 1 9 9M54 20a3 3 0 0 1 3 3M52 12l12 14" fill="none" stroke="var(--dn-ink-3)" strokeWidth="1.8" strokeLinecap="round" />
      ) : null}
      {tone === 'calm' ? <path d="M12 26l2 2 4-4" fill="none" stroke="var(--dn-normal-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
}

export function EmptyState({ tone = 'empty', title, body, action, className = '' }: EmptyStateProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={`flex flex-col items-center gap-3 px-6 py-8 text-center ${className}`}
    >
      <span className="dn-scale-in">
        <CoreIllustration tone={tone} />
      </span>
      <div className="dn-enter max-w-72 [animation-delay:80ms]">
        <p className="m-0 text-headline text-ink">{title}</p>
        {body ? <p className="m-0 mt-1 text-callout text-ink-2">{body}</p> : null}
      </div>
      {action ? <div className="dn-enter mt-1 [animation-delay:140ms]">{action}</div> : null}
    </div>
  );
}
