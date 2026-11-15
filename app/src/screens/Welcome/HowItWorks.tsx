// "From orbit to the root zone" as three illustrated steps (block 5): open data from orbit, one index per lot, a level
// to act on. A real sequence, so an ordered list; drawn in the system's own marks (satellite, soil core, the four
// level cores). Static drawings; the list reveals once with a stagger (index.css .dn-stagger inside <Reveal>).
import type { ReactNode } from 'react';
import { Reveal } from '../../components/ui';

const ICONS: ReactNode[] = [
  // Data from orbit: a satellite over a rain cloud.
  <svg key="data" aria-hidden="true" viewBox="0 0 64 64" width="56" height="56">
    <rect x="22" y="8" width="8" height="6" rx="1" fill="var(--dn-leaf)" />
    <rect x="34" y="8" width="8" height="6" rx="1" fill="var(--dn-leaf)" />
    <rect x="29" y="6" width="6" height="10" rx="1.5" fill="var(--dn-ink)" />
    <path d="M32 20v6" stroke="var(--dn-ink-3)" strokeWidth="1.5" strokeDasharray="2 2" />
    <path d="M20 44a8 8 0 0 1 2-15.8A10 10 0 0 1 41 30a7 7 0 0 1 3 14z" fill="var(--dn-surface-2)" stroke="var(--dn-ink-3)" strokeWidth="1.5" />
    <path d="M24 50l-2 5M32 50l-2 5M40 50l-2 5" stroke="var(--dn-normal-fill)" strokeWidth="2" strokeLinecap="round" />
  </svg>,
  // One index per lot: the soil core with its water level and a W scale beside it.
  <svg key="index" aria-hidden="true" viewBox="0 0 64 64" width="56" height="56">
    <rect x="20" y="8" width="20" height="48" rx="6" fill="var(--dn-surface-2)" />
    <rect x="23" y="24" width="14" height="29" rx="3" fill="var(--dn-normal-fill)" />
    <rect x="20" y="8" width="20" height="48" rx="6" fill="none" stroke="var(--dn-ink)" strokeWidth="2" />
    <path d="M46 10v44M44 10h4M44 32h4M44 54h4" stroke="var(--dn-ink-3)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>,
  // A level to act on: the four level cores, water rising, Severe full.
  <svg key="level" aria-hidden="true" viewBox="0 0 64 64" width="56" height="56">
    {(
      [
        ['--dn-normal', 0.25],
        ['--dn-watch', 0.5],
        ['--dn-warning', 0.75],
        ['--dn-severe', 1],
      ] as const
    ).map(([v, r], i) => {
      const x = 4 + i * 15;
      const h = 34 * r;
      return (
        <g key={v}>
          <rect x={x + 2} y={13 + 34 - h} width="9" height={h} rx="1.5" fill={`var(${v}-fill)`} />
          <rect x={x} y="11" width="13" height="38" rx="4" fill="none" stroke={`var(${v}-ink)`} strokeWidth="2" />
        </g>
      );
    })}
  </svg>,
];

export function HowItWorks({ title, steps }: { title: string; steps: { title: string; body: string }[] }) {
  return (
    <Reveal as="section" aria-labelledby="welcome-how" data-testid="welcome-how">
      <h2 id="welcome-how" className="m-0 mb-4 px-4 text-headline text-ink">
        {title}
      </h2>
      <ol className="dn-stagger m-0 grid list-none gap-3 p-0 md:grid-cols-3 md:gap-4">
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex items-start gap-4 rounded-group bg-surface p-4 md:flex-col md:gap-3 md:p-5">
            <span className="shrink-0">{ICONS[i]}</span>
            <span className="min-w-0">
              <h3 className="m-0 text-body font-semibold text-ink">{s.title}</h3>
              <p className="m-0 mt-1 text-callout text-ink-2">{s.body}</p>
            </span>
            {i < steps.length - 1 ? (
              <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12" className="absolute -right-3.5 top-1/2 z-10 hidden -translate-y-1/2 text-ink-3 md:block">
                <path d="M3 1.5 7.5 6 3 10.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </li>
        ))}
      </ol>
    </Reveal>
  );
}
