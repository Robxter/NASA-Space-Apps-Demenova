// The motion rule as a check (DESIGN.md "Motion, block 5"; D-035 rule 2 relaxed by Roberto in D-038).
// Every keyframe lives in the design system's stylesheets and belongs to the approved set below (each animates
// transform/opacity only and rests under prefers-reduced-motion); screens use the dn-* utilities, never Tailwind's
// generic loops (animate-pulse, -bounce, -ping, -spin). Adding a keyframe means adding it here AND to DESIGN.md.
// Sources are read through Vite's raw glob; stylesheets through Node's fs (Vitest serves CSS as empty strings). The
// app has no Node types and adding them is a new dependency, so fs is typed locally here.
import { describe, expect, it } from 'vitest';

const ALLOWED_KEYFRAMES = [
  'dn-core-flood', // the Flood: water rises in the core (block 3)
  'dn-lot-spill', // the Flood: one ring leaves the lot (block 3)
  'dn-enter-up', // block 5: an element arrives (rise + fade)
  'dn-enter-fade',
  'dn-scale-in',
  'dn-shimmer', // block 5: skeleton sheen
  'dn-orbit', // block 5: Welcome hero illustration loops
  'dn-rain',
  'dn-wave',
];
const STYLESHEETS = ['index.css', 'tokens.css', 'theme.css'];
const sources = import.meta.glob<string>('../**/*.tsx', { query: '?raw', import: 'default', eager: true });

type Fs = { readFileSync: (path: URL, encoding: 'utf-8') => string };

describe('motion: the approved set', () => {
  it('declares only the approved keyframes', async () => {
    const fs = (await import(/* @vite-ignore */ ['node', 'fs'].join(':'))) as Fs;
    const names = STYLESHEETS.map((f) => fs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf-8'))
      .flatMap((css) => [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]))
      .sort();
    expect(names).toEqual([...ALLOWED_KEYFRAMES].sort());
  });

  it('uses none of Tailwind generic loops in components or screens', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(0);
    const hits = Object.entries(sources)
      .filter(([, code]) => /\banimate-(pulse|bounce|ping|spin)\b/.test(code))
      .map(([path]) => path);
    expect(hits).toEqual([]);
  });
});
