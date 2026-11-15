# frontend-engineer report 2026-11-15 block 5 (motion, D-038)
Model/effort: opus high   Branch: block/5-motion (not pushed)   Commit: 423c189
## Done
- Route changes run inside a View Transition (`state/nav.ts`: one shared hash store, `document.startViewTransition`
  + `flushSync`, feature-detected; skipped under reduced motion and when only `?d=` changes). The tapped lot row
  (Home, Alerts) or the map sheet heading lends `view-transition-name: dn-lot-title` to the Lot header (shared element).
- First-view entrances (`useScreenEntrance`): Home, Lot, Alerts, Settings, Strategies, Learn; once per screen per session,
  never on replay-day changes; non-uniform delays 0-175 ms, 220 ms rise of 4-10 px + fade (choreograph rules).
- FLIP reorder of "Lots by risk" while the replay plays (`useFlipList`, 240 ms ease-in-out, transform only); scrubbing jumps.
- Lot: W bar reveals its real length once (scaleX from the left, 520 ms); the number shows at once (Rule zero).
- Map: lots fade in on first load (opacity, staggered). Status lines (Setup, Email alerts) slide in on change.
## Dropped (time or limits)
- Chart line reveal: clip-path is outside "transform/opacity only" and an overlay would hide the chart > 300 ms.
- Reversed back-navigation direction and the map selection pulse: need CSS in `app/src/styles/` (product-designer).
- Badge colour+word cross-fade and the tab indicator: inside `components/ui/` (product-designer).
## Tool notes (ledger style)
- Emil `animate` (frequency table, WAAPI choice, easing), `choreograph` (one entrance per container, non-uniform
  stagger < 300 ms), `find-animation-opportunities` (rejected: tab switches, list rows on every day, number count-up),
  `gestures` (sheet already pointer-driven), `animation-performance` (transform/opacity, WAAPI off main thread),
  `review-animations` (self-check: no transition: all, no scale(0), reduced motion everywhere); Impeccable `animate`,
  `delight` (the Flood stays the one memorable moment), `onboard` (entrances only on first view).
- pw_mcp vt.json: Home row -> Lot (h1 "Lote 2 (demo)") and back, no reload; pw_mcp flip.json: 8 row glides over 3
  played days; reduced-motion run: 0 animations; 0 console errors.
## Checks
- tsc clean; Vitest 115; initial JS 101.4 kB gzip (+1.2); e2e 318 passed, 21 skipped, 1 failed = the known Fast-4G
  @perf under parallel load; @perf alone 2 passed.
## For QA
- Routes cross-fade (~250 ms in Chromium/Safari 18); content is in the DOM at once. Watch for flakiness in specs that
  click right after navigating (none seen). Lists move during play (FLIP 240 ms): read positions after play stops.
