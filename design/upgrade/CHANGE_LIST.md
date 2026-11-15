# Change list, block 3 frontend upgrade (D-033)

Owner: product-designer. PD = product-designer, FE = frontend-engineer. One line per item: target, owner, change as a
checkable statement, finding, check. Findings: `design/upgrade/critique-a3.md` (critique H = heuristic, P = priority
issue, A = audit, R = ui review table), copy in `design/upgrade/copy-proposals.md`, FE notes from TOOL_LEDGER
(break-ui and mobile-native). Guardrails hold for every item: origin badge and time on every number, "No data" for
missing, colour AND word, no data or contract change. Status: open unless marked done with a commit.

## P1

- CL-01 P1 FE Home and Alerts lot rows: pass `level` and `levelLabel` to `ListRow` (CL-10) instead of a `LevelBadge` in `leading`; the lot name shows in full ("Lote 2 (demo)") and the subtitle starts with the level word in level ink (P1 truncation; FE break-ui "ListRow title truncation") - check 360 en/es light/dark, no ellipsis on any demo lot name.
- CL-02 P1 FE Home and Alerts trailing column: W value on top, its origin badge under it, right-aligned, so the trailing column is at most 64 px wide at 360 (P1 truncation, H7) - check 360 en/es: "Top factor: Upstream rain" fits on one line for Lote 1.
- CL-03 P1 FE Home order matches SPEC 18: header, alert banner, status today, lots by risk, replay; "What to check" moves below "Lots by risk" on Home (unchanged on Lot detail) (P1 one-glance, H8) - check 360x780: the "Highest W" value is inside the first viewport.
- CL-04 P1 FE Map at 360: the Relief/True colour switch and the imagery credit move onto the map (top-right control and bottom caption); only the layer switch stays above the map (P1 map squeezed) - check 360x780: the map is at least 55 % of the viewport height.
- CL-05 P1 FE Map lot labels: use Leaflet tooltip `className: 'dn-map-label'`, `direction: 'top'`, `offset: [0, -6]`, content glyph + level word, so the label no longer covers its lot (P1 map labels; CSS from CL-11) - check 360 and 1440 light/dark: every lot outline visible.
- CL-06 P1 FE Severe moment: implement the A4 pick exactly as written in "Severe moment" below (P1 onset reads as a square ring) - check: replay 21 to 22 Feb at 1440 and 360; reduced motion shows the final state with no ripple.
- CL-07 P1 FE Copy: apply every row of `design/upgrade/copy-proposals.md` in en and es, and replace the ten middle-dot joins listed there (critique P2 copy, v2 §9.F-9.G) - check: rendered text of all 7 screens has 0 em dashes and 0 " · " (grep the a11y snapshot), en/es parity test green.
- CL-08 P1 PD Reduced motion: replace the global `0.01ms` kill with token-level fallbacks (durations for movement go to 0, colour and opacity fades stay at 120-200 ms; ripple removed) (audit A1) - check: emulate reduced motion, banner tap still shows a colour change, no transform animates. Status: done (A5, see git log -- app/src/styles app/src/components/ui).
- CL-09 P1 PD `SeverityGlyph`: water rise uses `.dn-core-water` with motion tokens, no inline transition; no square ripple ring in HTML; `onset` prop kept (R2, R3) - check: `onset` on the Home banner shows the core filling, not a box. Status: done (A5, see git log -- app/src/styles app/src/components/ui).
- CL-10 P1 PD `ListRow`: add optional `level` and `levelLabel` props: fixed 14 px core leading, level word (semibold, level ink) before the subtitle, separated by a comma (R1; memory: variable-width leading badges misalign names) - check: typecheck; existing callers unchanged. Status: done (A5, see git log -- app/src/styles app/src/components/ui).
- CL-11 P1 PD `.dn-map-label` CSS in `index.css`: surface background, level-ink text, 1 px level-ink border, 8 px radius, no Leaflet arrow, caption size (supports CL-05) - check: 360 and 1440, both themes, contrast of word >= 7:1 (measured: light 8.87-10.25, dark 8.16-11.32). Status: done (A5, see git log -- app/src/styles app/src/components/ui).

## P2

- CL-12 P2 PD `Card` `footer` accepts `ReactNode[]`, one line each (R7; supports CL-07 separators) - check: typecheck; string callers unchanged. Status: done (A5, see git log -- app/src/styles app/src/components/ui).
- CL-13 P2 FE Home "Lots per level": four equal columns (count in headline tabular figures above a small `SeverityBadge`), no wrapping at 360 (critique minor, Casey) - check 360 en/es: one row.
- CL-14 P2 FE Lot detail "Today": label left, value right, one row per measure (like "Lot facts"); no label wraps to 3 lines (critique minor; FE break-ui "Today grid label wrap") - check 360 en/es.
- CL-15 P2 FE Lot detail: one source line for the W card (remove the duplicate under the card) (critique minor) - check 360.
- CL-16 P2 FE Desktop: tab bar content aligned to the 736 px content column (bar background stays full width) (Alex) - check 1440 light/dark.
- CL-17 P2 FE Strategies: drop the A/B/C discs; the current management card carries the word "Current" in a neutral tag; alternatives keep their titles (numbered-marker tell; ranking is by score, not letter) - check 360 en/es.
- CL-18 P2 PD Dark `--dn-shadow-banner` and `--dn-shadow-sheet` softened (black 0.35 to orbit-tinted 0.22 plus a 1 px top highlight) (high-end §2) - check 360 dark: banner edge visible, no halo. Status: done (A5, see git log -- app/src/styles app/src/components/ui).
- CL-19 P2 PD Motion tokens: `--dn-dur-press` 120, `--dn-dur-state` 200, `--dn-dur-sheet` 320, `--dn-dur-onset` 600 ms, `--dn-ease-out`, `--dn-ease-in-out`, `--dn-ease-drawer` as Tailwind utilities (`duration-press`, `ease-out-dn`...) so screens stop writing `duration-[120ms]` (R4, audit A3) - check: typecheck. Status: done (A5, see git log -- app/src/styles app/src/components/ui).
- CL-20 P2 PD mobile-native baseline in `index.css`: `touch-action: manipulation` on buttons and links, `user-select: none` on buttons, inputs at least 16 px (FE mobile-native "3 global CSS rules") - check: Setup farm name input does not zoom on iOS (needs a phone; FE fix 11). Status: done (A5, see git log -- app/src/styles app/src/components/ui).
- CL-21 P2 PD `Button` press `scale(0.97)`, `AlertBanner` press `scale(0.985)`, both on tokens (R5, R6) - check: tap at 360. Status: done (A5, see git log -- app/src/styles app/src/components/ui).
- CL-22 P2 FE Prose width: "What to check" body and Learn intro capped at 65ch on desktop (detector line-length) - check 1440: no line over ~75 characters.

## P3

- CL-23 P3 FE Learn: keep the page-level "General guidance, not yet reviewed" note and each card's origin badge; drop the repeated per-card caveat line only if the e2e Learn spec does not assert it (critique H10) - check `tests/e2e` Learn spec first; otherwise leave.
- CL-24 P3 FE Replay scrubber edge bars (FE break-ui) go to PD in phase B1 with `ReplayScrubber.tsx` - check: B1.

## Severe moment (A4 pick, owner FE for the map, PD for ui)

Prototype: `design/prototypes/severe-moment.html` (serve the repo root, open `/design/prototypes/severe-moment.html`;
keys 1-3 or the picker switch variants, R replays). Real demo data: replay 6 to 7 Feb 2026, Lote 1 (demo) and
Lote 7 (demo) go Warning to Severe; outlines from `farm.json`. Variants, one axis (where the motion lives):

| # | Variant | Axis | When it is right | Its cost |
| --- | --- | --- | --- | --- |
| 1 | Ripple (incumbent) | Outward: colour change 600 ms, ring x2 (2.2 s loop) | The lot is far from where the eye is | Longest; a loop on a data surface; the ring repeats the same news twice |
| 2 | Flood (pick) | Inside the shape: water rises in the lot, spills once | The core metaphor carries the alert | Rise is subtle on a 20 px lot; the label core and the spill carry it at small zoom |
| 3 | Label | Only the label moves (pop 260 ms, core fills 400 ms) | Daily-use screens | Not memorable; the brief puts the boldness here |

**Pick: 2 Flood.** review-animations verdict on it: justified (rare, high-stakes state change), frequency rare (so
over 300 ms is allowed), ease-in-out for on-screen fill and strong ease-out for the ring (STANDARDS curves), one ring
instead of a loop, interruptible (a newer day cancels the sweep), reduced motion = final state with a 200 ms colour
fade. Performance note (CL-26): the sweep updates two gradient stop offsets per frame on at most a few paths for
700 ms; acceptable once, never on scrub. Roberto may override before 15:00.

Timeline (choreograph format):

| Element | Role | Starts | Duration | Motion | Relationship |
| --- | --- | --- | --- | --- | --- |
| Lot fill (map) | Lead | 0 ms | 700 ms | hard-stop gradient sweeps bottom to top, Warning fill (opacity .55) to Severe fill (.75), `cubic-bezier(.77,0,.175,1)` | - |
| Lot stroke (map) | Support | 0 ms | 200 ms | stroke to severe ink, width 2 to 3, `--dn-ease-out` | Together with the fill |
| Label core water | Support | 0 ms | 700 ms | `scaleY(.75)` to `scaleY(1)`, origin bottom, same curve as the fill | Together (same object, same timing family) |
| Label word | Support | 350 ms | 0 ms | text swaps Warning to Severe, no animation | Midpoint of the rise |
| Spill ring (map) | Decoration | 560 ms | 900 ms | clone of the lot outline, stroke severe fill 2.5 px, `scale(1)` to `scale(1.5)`, opacity .85 to 0, `--dn-ease-out`, fill-mode forwards, removed at 1460 ms | Sequence: starts just before the rise ends |
| Home alert banner, list rows, scrubber | Static | - | - | - | - |

What does not move: the Home banner (it is read, not watched; the critique found its ring reads as a focus box), list
rows (high frequency), the scrubber bars (data), the W number (no count-up: data, and it would need a library),
neighbouring lots (their levels did not change).

Feel check: scrub the recording at 520-620 ms, where the rise ends and the ring leaves; it should read as one gesture
(water reaches the top and spills), not two events.

- CL-29 P1 FE MapView: implement the Flood timeline above; trigger only when a unit's level becomes Severe from a non-Severe level on a forward one-day step (play or step button), never on drag-scrub, first load, Lot open or a backward step (with CL-25); copy `flood()` from `design/prototypes/severe-moment.js` (it cancels on a newer step); add class `dn-lot-ring` to the clone - check: replay 6 to 7 Feb at 360 and 1440, Lote 1 and Lote 7 flood once; dragging the scrubber across 7 Feb plays nothing; reduced motion shows the final state.
- CL-30 P1 PD tokens and CSS for CL-29: `--dn-dur-flood` 700 ms, `--dn-dur-spill` 900 ms, `--dn-delay-spill` 560 ms, `--dn-ease-in-out`, `.dn-lot-ring` + `dn-lot-spill` keyframes, `SeverityGlyph` water as `scaleY` (replaces CL-26's `y`/`height`) - check: typecheck; reduced motion hides `.dn-lot-ring`. Status: done (A5, see git log -- app/src/styles app/src/components/ui).

## From frontend-engineer (A2 break-ui, A3 motion) — appended 10:40, for PD review in B2

- CL-25 P1 FE Severe ripple plays only on a transition: today `AlertBanner` is keyed by date and `onset` is just `level === 'severe'`, so the ripple replays on every scrubbed day and every Lot open of an already-Severe lot (A3 finding; breaks the CL-06 rule "never on the load of an already-Severe lot") - fix together with CL-06: onset when the previous replay day's level for that unit was not Severe.
- CL-26 P2 PD `dn-lot-onset` animates `stroke-width`/`stroke-opacity` and `.dn-lot-shape` transitions `fill`/`stroke` (paint tier, short, few paths); `SeverityGlyph` water animates SVG `y`/`height` (animation-performance tier table) - consider `transform: scale` / `opacity` versions in CL-06 and CL-09; not a blocker.
- CL-27 P2 FE Motion opportunities that passed find-animation-opportunities' gate (occasional, purpose = spatial continuity): (1) Map lot sheet enters from the bottom edge (`translateY(100%)`+`opacity` -> settled, `--dn-dur-sheet`, `--dn-ease-drawer`, `@starting-style`), exits the same edge; reduced motion: opacity only. (2) Reliability sheet as native `<dialog>` (focus trap, Escape; pick-ui-library mismatch "div dialog with manual focus") slides up on open, drag-to-dismiss per brief B4; reduced motion: 200 ms fade. Rejected (frequency or function): tab switches, Segmented thumb, Home list re-order while playing, W count-up (would need NumberFlow: class A), map layer switch, scrubber bars.
- CL-28 P2 PD Map legend shown when lot labels collide (break-ui: 40 lots): today a row of small `SeverityBadge`s under the controls (`MapView.tsx`); review its look with CL-04/CL-05.
- Note on CL-07: `learn.notReviewed` and the start of `learn.general` keep the D-026 wording with the em dash (coordinator's agreed text, asserted by `actions.test.ts`); the Setup badge separator " · " is asserted by QA in `tests/e2e/specs/setup.spec.ts:9` (`confidence()` helper), so QA updates that helper before the CL-07 separator change lands. The other 10 copy rows are applied (6210e77).
