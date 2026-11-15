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
- CL-08 P1 PD Reduced motion: replace the global `0.01ms` kill with token-level fallbacks (durations for movement go to 0, colour and opacity fades stay at 120-200 ms; ripple removed) (audit A1) - check: emulate reduced motion, banner tap still shows a colour change, no transform animates. Status: open (PD A5).
- CL-09 P1 PD `SeverityGlyph`: water rise uses `.dn-core-water` with motion tokens, no inline transition; no square ripple ring in HTML; `onset` prop kept (R2, R3) - check: `onset` on the Home banner shows the core filling, not a box. Status: open (PD A5).
- CL-10 P1 PD `ListRow`: add optional `level` and `levelLabel` props: fixed 14 px core leading, level word (semibold, level ink) before the subtitle, separated by a comma (R1; memory: variable-width leading badges misalign names) - check: typecheck; existing callers unchanged. Status: open (PD A5).
- CL-11 P1 PD `.dn-map-label` CSS in `index.css`: surface background, level-ink text, 1 px level-ink border, 8 px radius, no Leaflet arrow, caption size (supports CL-05) - check: 360 and 1440, both themes, contrast of word >= 7:1 (uses severity ink on surface). Status: open (PD A5).

## P2

- CL-12 P2 PD `Card` `footer` accepts `ReactNode[]`, one line each (R7; supports CL-07 separators) - check: typecheck; string callers unchanged. Status: open (PD A5).
- CL-13 P2 FE Home "Lots per level": four equal columns (count in headline tabular figures above a small `SeverityBadge`), no wrapping at 360 (critique minor, Casey) - check 360 en/es: one row.
- CL-14 P2 FE Lot detail "Today": label left, value right, one row per measure (like "Lot facts"); no label wraps to 3 lines (critique minor; FE break-ui "Today grid label wrap") - check 360 en/es.
- CL-15 P2 FE Lot detail: one source line for the W card (remove the duplicate under the card) (critique minor) - check 360.
- CL-16 P2 FE Desktop: tab bar content aligned to the 736 px content column (bar background stays full width) (Alex) - check 1440 light/dark.
- CL-17 P2 FE Strategies: drop the A/B/C discs; the current management card carries the word "Current" in a neutral tag; alternatives keep their titles (numbered-marker tell; ranking is by score, not letter) - check 360 en/es.
- CL-18 P2 PD Dark `--dn-shadow-banner` and `--dn-shadow-sheet` softened (black 0.35 to orbit-tinted 0.22 plus a 1 px top highlight) (high-end §2) - check 360 dark: banner edge visible, no halo. Status: open (PD A5).
- CL-19 P2 PD Motion tokens: `--dn-dur-press` 120, `--dn-dur-state` 200, `--dn-dur-sheet` 320, `--dn-dur-onset` 600 ms, `--dn-ease-out`, `--dn-ease-in-out`, `--dn-ease-drawer` as Tailwind utilities (`duration-press`, `ease-out-dn`...) so screens stop writing `duration-[120ms]` (R4, audit A3) - check: typecheck. Status: open (PD A5).
- CL-20 P2 PD mobile-native baseline in `index.css`: `touch-action: manipulation` on buttons and links, `user-select: none` on buttons, inputs at least 16 px (FE mobile-native "3 global CSS rules") - check: Setup farm name input does not zoom on iOS (needs a phone; FE fix 11). Status: open (PD A5).
- CL-21 P2 PD `Button` press `scale(0.97)`, `AlertBanner` press `scale(0.985)`, both on tokens (R5, R6) - check: tap at 360. Status: open (PD A5).
- CL-22 P2 FE Prose width: "What to check" body and Learn intro capped at 65ch on desktop (detector line-length) - check 1440: no line over ~75 characters.

## P3

- CL-23 P3 FE Learn: keep the page-level "General guidance, not yet reviewed" note and each card's origin badge; drop the repeated per-card caveat line only if the e2e Learn spec does not assert it (critique H10) - check `tests/e2e` Learn spec first; otherwise leave.
- CL-24 P3 FE Replay scrubber edge bars (FE break-ui) go to PD in phase B1 with `ReplayScrubber.tsx` - check: B1.

## Severe moment (A4 pick, owner FE for the map, PD for ui)

Filled in after A4 (`design/prototypes/severe-moment.html`).
