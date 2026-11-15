// The One Moment Rule as a check (DESIGN.md, approved by Roberto 2026-11-15, design/upgrade/taste-rules-proposed.md C1).
// The Flood is the only orchestrated motion: its two keyframes are the only ones in the stylesheets, and no screen
// or component uses a Tailwind `animate-*` class. A new animation needs Roberto's approval and a line in DESIGN.md
// before this list changes. Sources are read through Vite's raw glob; stylesheets through Node's fs (Vitest serves CSS
// as empty strings). The app has no Node types and adding them is a new dependency, so fs is typed locally here.
import { describe, expect, it } from 'vitest';

const ALLOWED_KEYFRAMES = ['dn-core-flood', 'dn-lot-spill'];
const STYLESHEETS = ['index.css', 'tokens.css', 'theme.css'];
const sources = import.meta.glob<string>('../**/*.tsx', { query: '?raw', import: 'default', eager: true });

type Fs = { readFileSync: (path: URL, encoding: 'utf-8') => string };

describe('motion: one orchestrated moment', () => {
  it('declares only the Flood keyframes', async () => {
    const fs = (await import(/* @vite-ignore */ ['node', 'fs'].join(':'))) as Fs;
    const names = STYLESHEETS.map((f) => fs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf-8'))
      .flatMap((css) => [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]))
      .sort();
    expect(names).toEqual([...ALLOWED_KEYFRAMES].sort());
  });

  it('uses no Tailwind animate-* class in components or screens', () => {
    const hits = Object.entries(sources)
      .filter(([, code]) => /\banimate-[a-z]/.test(code))
      .map(([path]) => path);
    expect(Object.keys(sources).length).toBeGreaterThan(0);
    expect(hits).toEqual([]);
  });
});
