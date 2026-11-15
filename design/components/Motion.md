# Motion tokens (D-033)

Owner: product-designer. Values in `app/src/styles/tokens.css`; utilities in `theme.css`; rules in `DESIGN.md`.
Curves are Emil Kowalski's (review-animations `STANDARDS.md`); terms from `animation-vocabulary`.

| Token | Value | Use | Reduced motion |
| --- | --- | --- | --- |
| `--dn-ease-out` (`ease-out`) | `cubic-bezier(.23,1,.32,1)` | Press, state, anything that answers a touch | same |
| `--dn-ease-in-out` (`ease-in-out`) | `cubic-bezier(.77,0,.175,1)` | Something on screen changes in place (the flood) | same |
| `--dn-ease-drawer` (`ease-drawer`) | `cubic-bezier(.32,.72,0,1)` | Sheets, the scrubber dock | same |
| `--dn-dur-press` (`duration-press`) | 120 ms | Press feedback | same (colour only) |
| `--dn-dur-state` (`duration-state`) | 200 ms | Colour and state changes | same |
| `--dn-dur-sheet` (`duration-sheet`) | 320 ms | Sheet slide in | same; `--dn-sheet-offset` 0, so a fade |
| `--dn-dur-flood` | 700 ms | Water rises in the lot and in the core | 0 ms |
| `--dn-dur-spill`, `--dn-delay-spill` | 900 ms, 560 ms | The one ring that leaves the lot | 0 ms, hidden |
| `--dn-press-scale`, `--dn-press-scale-wide` | 0.97, 0.985 | `.dn-press`, `.dn-press-wide` | 1 |

Classes: `.dn-press`, `.dn-press-wide`, `.dn-core-water` (+ `.is-onset`), `.dn-lot-ring`, `.leaflet-tooltip.dn-map-label`
with `.dn-lvl-<level>`. The global "0.01 ms" reduced-motion kill was replaced by these token fallbacks (audit: it
erased feedback, not only movement). Screens should use `duration-press ease-out` instead of `duration-[120ms]`.
States: not applicable (tokens); the Severe moment's states are in `design/upgrade/CHANGE_LIST.md`.

Update B2 (2026-11-15): `--dn-ease-flood` `cubic-bezier(.65,0,.35,1)` (easeInOutCubic, the map sweep's JS curve) drives
the core's rise; the rise plays only under `.is-onset` or `.is-flooding`, never on ordinary day changes. Lot fills
change over `--dn-dur-state`. `--dn-dur-onset`, `dn-lot-onset` and `.dn-ripple` are removed.

## Block 5 (D-038): entrances, reveals, spring, skeleton, view transitions, chart tokens

Roberto relaxed the One Moment Rule ("Improve the frontend graphics and animations, doesnt matter if it makes it a
little bit heavier"). Rules kept: a purpose for each motion, transform and opacity only, a reduced-motion path, never on
data values (no count-up or tweened numbers), never on keyboard actions. `app/src/styles/motion.test.ts` pins the
approved keyframes: add one there and in DESIGN.md, or it fails.

| Token | Value | Reduced motion |
| --- | --- | --- |
| `--dn-ease-spring` | CSS `linear()` spring, about 1 % overshoot (fallback: `--dn-ease-out`) | same |
| `--dn-dur-enter` / `--dn-dur-exit` | 420 ms / 180 ms | 0 / same |
| `--dn-dur-reveal` | 600 ms | 0 |
| `--dn-stagger` | 60 ms per sibling | 0 |
| `--dn-rise` | 12 px (24 px for a reveal) | 0 |
| `--dn-chart-rain`, `--dn-chart-rain-fill`, `--dn-chart-temp`, `--dn-chart-ndvi`, `--dn-chart-grid` | light/dark colours for uPlot (read with `getComputedStyle(document.documentElement)`) | n/a |

| Utility | Use | Notes |
| --- | --- | --- |
| `.dn-enter` | an element arrives (sheet content, a new card) | rise + fade on the spring |
| `.dn-enter-fade` | a view swaps in place (tab body: `key` it so it re-mounts) | 200 ms fade |
| `.dn-scale-in` | a drawing or a dialog body appears | from 0.96, never from 0 |
| `.dn-stagger` (parent) | a short group arrives in reading order | 60 ms steps, the 8th+ child together; not on lists seen 100+ times a day |
| `<Reveal as="section">` (ui) | a section below the fold reveals once | content is never hidden without JS or under reduced motion |
| `.dn-skeleton` | a loading block with a sheen | one per region, not one per bar |
| `::view-transition-*(root)` | `document.startViewTransition(() => ...)` between screens | 200 ms crossfade; off under reduced motion |
| `.dn-orbit`, `.dn-rain`, `.dn-wave`, `.is-paused` | Welcome hero illustration only | ambient loops, paused off screen |

Chart fill (uPlot): `fill: (u) => { const g = u.ctx.createLinearGradient(0, u.bbox.top, 0, u.bbox.top + u.bbox.height);
g.addColorStop(0, css('--dn-chart-rain-fill')); g.addColorStop(1, 'transparent'); return g; }` with
`css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()`.
