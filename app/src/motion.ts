// Motion helpers shared by screens (D-038): read the designer's motion tokens and the reduced-motion preference, and
// run the screen-level motions with the Web Animations API (transform and opacity only; no keyframes in the
// stylesheets). Every helper is a no-op under prefers-reduced-motion, and none of them hides content for more than
// ~300 ms: motion is decoration, never a gate.
import { useLayoutEffect, useRef } from 'react';

/** ms from a CSS time token such as "700ms" or "0.7s"; the fallback when the token is missing. */
export function tokenMs(name: string, fallback: number): number {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!v) return fallback;
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return fallback;
  return v.endsWith('ms') ? n : n * 1000;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Easing token (falls back to the token's value). */
export function tokenEase(name: '--dn-ease-out' | '--dn-ease-in-out', fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

/**
 * Stagger delays (choreograph skill): non-uniform, shrinking gaps, total under 300 ms; items past the handful arrive
 * with the last one. Exported for tests.
 */
export function staggerDelays(count: number): number[] {
  const steps = [0, 55, 100, 135, 160, 175];
  return Array.from({ length: count }, (_, i) => steps[Math.min(i, steps.length - 1)] as number);
}

/** Screens that already played their entrance in this tab: the stagger is for the first view, not for every visit. */
const seen = new Set<string>();

/**
 * First-view entrance for a screen: the direct children of `ref` rise 8 px and fade in with a short, non-uniform
 * stagger. Runs once per screen per session; never on replay-day changes (it is keyed by screen, not by data).
 */
export function useScreenEntrance(screen: string, ready: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !ready || seen.has(screen)) return;
    seen.add(screen);
    if (prefersReducedMotion() || typeof el.animate !== 'function') return;
    const kids = [...el.children] as HTMLElement[];
    const delays = staggerDelays(kids.length);
    kids.forEach((kid, i) => {
      // The lead rises furthest; supporting items less (choreograph: vary the treatment, not only the delay).
      const rise = i === 0 ? 10 : i < 3 ? 8 : 4;
      kid.animate(
        [
          { opacity: 0, transform: `translateY(${rise}px)` },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 220, delay: delays[i], easing: tokenEase('--dn-ease-out', EASE_OUT), fill: 'backwards' },
      );
    });
  }, [screen, ready]);
  return ref;
}

/**
 * FLIP for a list whose order changes while the replay plays (Lots by risk): each row glides from its previous
 * position to the new one (transform only, 240 ms, ease-in-out: something on screen moves in place). Only when
 * `animate` is true (playing); scrubbing and first renders jump.
 */
export function useFlipList(ids: readonly string[], animate: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const before = useRef(new Map<string, number>());
  const key = ids.join('|');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rows = [...el.querySelectorAll<HTMLElement>(':scope > ul > li')];
    const now = new Map<string, number>();
    ids.forEach((id, i) => {
      const row = rows[i];
      if (row) now.set(id, row.getBoundingClientRect().top);
    });
    if (animate && !prefersReducedMotion() && typeof el.animate === 'function') {
      ids.forEach((id, i) => {
        const was = before.current.get(id);
        const is = now.get(id);
        const row = rows[i];
        if (row && was !== undefined && is !== undefined && Math.abs(was - is) > 1) {
          row.animate([{ transform: `translateY(${was - is}px)` }, { transform: 'none' }], {
            duration: 240,
            easing: tokenEase('--dn-ease-in-out', EASE_IN_OUT),
          });
        }
      });
    }
    before.current = now;
    // `key` captures the order; positions are read after React has placed the rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, animate]);
  return ref;
}

/** A one-time reveal of a bar's real final length (scaleX from the left). The value beside it is shown at once. */
export function useBarReveal(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled || done.current) return;
    done.current = true;
    if (prefersReducedMotion() || typeof el.animate !== 'function') return;
    el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: 520,
      easing: tokenEase('--dn-ease-out', EASE_OUT),
    });
  }, [enabled]);
  return ref;
}

/** A status line slides up and fades in when its text changes (occasional: form results). */
export function useEnterOnChange(value: unknown) {
  const ref = useRef<HTMLElement | null>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (first.current) {
      first.current = false;
      return;
    }
    if (!el || !value || prefersReducedMotion() || typeof el.animate !== 'function') return;
    el.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 200, easing: tokenEase('--dn-ease-out', EASE_OUT) },
    );
  }, [value]);
  return ref;
}
