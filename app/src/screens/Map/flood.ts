// The Severe moment on the map ("Flood", design/prototypes/severe-moment.js, CHANGE_LIST CL-29) and the map labels
// (CL-05). Motion values come from the designer's tokens; reduced motion skips the sweep and CSS hides the ring.
import type { Severity } from '../../types/contracts';
import { prefersReducedMotion, tokenMs } from '../../motion';

export { tokenMs };

const NS = 'http://www.w3.org/2000/svg';
const LEVEL_CLASSES = ['normal', 'watch', 'warning', 'severe', 'stale'].map((l) => `dn-lvl-${l}`);

/** Cubic ease-in-out, the curve of --dn-ease-in-out (0.77, 0, 0.175, 1) approximated as in the prototype. */
export const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** A label: the soil core (water from --lvl-ratio, as SeverityGlyph) and a text span. Created once per lot. */
export function makeLabel(): { root: HTMLSpanElement; word: HTMLSpanElement } {
  const root = document.createElement('span');
  root.className = 'inline-flex items-center gap-1';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 14 18');
  svg.setAttribute('width', '10');
  svg.setAttribute('height', '13');
  svg.setAttribute('aria-hidden', 'true');
  const water = document.createElementNS(NS, 'rect');
  water.setAttribute('class', 'dn-core-water');
  for (const [k, v] of Object.entries({ x: '2.5', y: '2.5', width: '9', height: '13', rx: '0.5' })) water.setAttribute(k, v);
  water.style.fill = 'var(--lvl-fill)';
  const shell = document.createElementNS(NS, 'rect');
  for (const [k, v] of Object.entries({ x: '1', y: '1', width: '12', height: '16', rx: '3', fill: 'none', 'stroke-width': '1.6' })) shell.setAttribute(k, v);
  shell.style.stroke = 'var(--lvl-ink, currentColor)';
  svg.append(water, shell);
  const word = document.createElement('span');
  root.append(svg, word);
  return { root, word };
}

/** Sets the label's level class (its core water follows --lvl-ratio with the token transition) and text. */
export function setLabelLevel(root: Element, level: Severity | null): void {
  root.classList.remove(...LEVEL_CLASSES);
  if (level) root.classList.add(`dn-lvl-${level}`);
  const svg = root.querySelector('svg');
  if (svg) svg.style.display = level ? '' : 'none';
}

/** Level class on the tooltip container too, so its border and text take the level ink (CL-11 CSS). */
export function setTooltipLevel(container: HTMLElement | undefined, level: Severity | null): void {
  if (!container) return;
  container.classList.remove(...LEVEL_CLASSES);
  if (level) container.classList.add(`dn-lvl-${level}`);
}

/**
 * Water rises in the lot: a hard-stop gradient sweeps bottom to top from the Warning fill to the Severe fill, then the
 * one spill ring leaves the outline. `alive()` turns false when a newer day arrives; the sweep then stops and leaves
 * the level the newer day set.
 */
export function flood(path: SVGPathElement, alive: () => boolean): void {
  const svg = path.ownerSVGElement;
  if (!svg || prefersReducedMotion()) return;
  const duration = tokenMs('--dn-dur-flood', 700);
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(NS, 'defs');
    svg.prepend(defs);
  }
  const g = document.createElementNS(NS, 'linearGradient');
  g.id = `dn-flood-${Math.random().toString(36).slice(2, 9)}`;
  for (const [k, v] of Object.entries({ x1: '0', y1: '1', x2: '0', y2: '0' })) g.setAttribute(k, v);
  const stops = (
    [
      // Stop opacities are relative to the class fill-opacity (0.75 once data-level is severe): 1 keeps Severe at
      // 0.75, and 0.733 gives Warning its own 0.55 (R-01: no dip at the start, no flash at the end).
      ['0', 'var(--dn-severe-fill)', '1'],
      ['0', 'var(--dn-severe-fill)', '1'],
      ['0', 'var(--dn-warning-fill)', '0.733'],
      ['1', 'var(--dn-warning-fill)', '0.733'],
    ] as const
  ).map(([o, c, op]) => {
    const s = document.createElementNS(NS, 'stop');
    s.setAttribute('offset', o);
    s.style.stopColor = c;
    s.style.stopOpacity = op;
    g.appendChild(s);
    return s;
  });
  defs.appendChild(g);
  path.style.fill = `url(#${g.id})`;
  // Only the stroke eases during the sweep; the fill and fill-opacity class transitions would run at both ends.
  path.style.transitionProperty = 'stroke, stroke-width';
  const end = () => {
    path.style.fill = '';
    path.style.transitionProperty = '';
    g.remove();
  };
  const t0 = performance.now();
  const frame = (now: number) => {
    if (!alive()) return end();
    const t = Math.min(1, (now - t0) / duration);
    const o = easeInOut(t).toFixed(3);
    stops[1]?.setAttribute('offset', o);
    stops[2]?.setAttribute('offset', o);
    if (t < 1) requestAnimationFrame(frame);
    else end();
  };
  requestAnimationFrame(frame);
  spill(path, alive);
}

/** One ring leaves the lot outline (class dn-lot-ring: delay, duration and easing are in the designer's CSS). */
function spill(path: SVGPathElement, alive: () => boolean): void {
  const ring = path.cloneNode(false) as SVGPathElement;
  ring.removeAttribute('data-level');
  ring.removeAttribute('aria-label');
  ring.removeAttribute('style');
  ring.setAttribute('class', 'dn-lot-ring');
  ring.setAttribute('aria-hidden', 'true');
  path.after(ring);
  const total = tokenMs('--dn-delay-spill', 560) + tokenMs('--dn-dur-spill', 900);
  const remove = () => ring.remove();
  ring.addEventListener('animationend', remove, { once: true });
  window.setTimeout(remove, total + 100);
  // R-06: one check when the ring would start; a newer day before then means it never shows.
  window.setTimeout(() => {
    if (!alive()) remove();
  }, tokenMs('--dn-delay-spill', 560));
}
