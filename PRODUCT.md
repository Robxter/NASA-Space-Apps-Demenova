# Product

<!-- impeccable:product-schema 1 -->

<!-- Written by product-designer on 2026-11-15 (D-033) from repository evidence only. Impeccable's init interview
could not run (a subagent has no question tool; nobody to answer), so every fact below is an inference marked
"from <file>". Open questions for Roberto are listed in docs/reports/product-designer/ under "Needs Roberto". -->

## Platform

web (a mobile-first Progressive Web App; installable, works offline from cached snapshots). From `README.md`,
`docs/spec/17-ui-and-ux-pages-and-design-rules.md`.

## Users

- **Agronomist** checking many lots of a banana farm, on a phone or a laptop; selects the farm and lots once, then
  scans status and opens the lots at risk. From `design/BRIEF.md`, `docs/spec/17-*.md` (user flow).
- **Farmer with no staff**, glancing at a phone in strong equatorial sun, often one-handed; Spanish is the field
  default. From `design/BRIEF.md`, `.claude/agents/frontend/product-designer.md`, `docs/spec/17-*.md`.
- **Hackathon judges** (2026 NASA Space Apps Challenge, "Field Shift") open the live app and the demo replay.
  From `README.md`, `CLAUDE.md`.

## Product Purpose

Turn open, global Earth observations into waterlogging and flood alerts, field-condition history and
soil-management strategies for banana farms in coastal El Oro, Ecuador. The primary job of every session: answer "is
anything wrong on my farm?" in one glance, then say where and why. From `README.md`, `design/BRIEF.md`.

## Positioning

From orbit to the root zone: one pipeline that uses only global datasets (no US-only data), so the same method can run
for any farm by changing the area of interest. Each lot gets an alert index W (0 to 1) from five named factors.
From `README.md`, `docs/spec/03-pitch-angle-nasa-data-global-by-design.md`.

## Operating Context

- Screens: Home, Map, Lot detail, Strategies, Alerts, Learn, Farm setup; bottom tab bar (Home, Map, Alerts, Learn).
  From `docs/spec/18-screen-specifications.md`.
- The demo replays 20 Jan to 5 Mar 2026 around the 22-23 Feb Buenavista river flood (Pasaje, El Oro) on a synthetic
  demo farm of 8 lots, from committed snapshots, with no live download. From `README.md`.
- Cached data loads first; offline shows "offline, showing data from ...". From `docs/spec/17-*.md`.
- A Severe alert arrives by banner and email; tapping it opens the lot. From `docs/spec/17-*.md`.

## Capabilities and Constraints

- Severity is always colour and word: Normal, Watch, Warning, Severe (es: Normal, Vigilancia, Aviso, Severo).
  From `CLAUDE.md` §2.
- Every number shows its source and "updated X ago", and an origin badge (Sourced, Calibrated, Provided, Observed,
  Estimated, Design, Pending, Demo). Missing values show "No data" / "Sin datos". From `README.md`, `docs/spec/17-*.md`.
- Verification is counts only (2026, farm catchment: 1 hit, 0 misses, 4 false alarms). Demenova gave no
  flood-specific lead time for the February 2026 flood; nothing may say it predicted the flood. From `README.md`.
- The Severe threshold and weights are design choices, not a calibration (D-029). From `README.md`.
- Spanish and English, switchable; Spanish is the field default. From `docs/spec/17-*.md`.
- No external fonts or CDNs; CSP `'self'`; initial JS at most 150 kB gzip. From the D-033 brief.
- Undecided: licence (no LICENSE file yet). From `README.md`.

## Brand Commitments

- Name: Demenova (Demeter + nova). Logo option 1 "Core" (`design/logo/option-1-core.svg`, D-015).
- Credit in words: "Built with NASA Earth observations". No NASA logo; no implied endorsement. From `CLAUDE.md` §2.
- Voice: plain, active, sentence case, from the user's side; errors say what happened and how to fix it.
  From `.claude/agents/frontend/product-designer.md`.
- Strategy screens say: "Demenova supports the agronomist's judgment; it never replaces it." From `docs/spec/18-*.md`.

## Evidence on Hand

- Synthetic demo farm (8 lots) with a visible "Demo" label; committed replay snapshots in `app/public/data/`.
- Verification counts and limits in `README.md`; sources in `docs/CITATIONS.md`.
- Absent, never to be fabricated: real farm data, testimonials, accuracy percentages, agronomist review
  (badge "Not yet reviewed by a local agronomist").

## Product Principles

1. One glance first: status before detail, on a 360 px phone in sun. From `design/BRIEF.md`.
2. Show the source, never guess: origin and time on every number; missing is shown as missing. From `CLAUDE.md` §1.
3. Support, never replace, the agronomist's judgment. From `CLAUDE.md` §2.
4. Global by design: nothing depends on US-only data or a sleeping server. From `CLAUDE.md` §2-3.

## Accessibility & Inclusion

WCAG AA at least, severity text AAA (measured in `design/BRIEF.md`); visible focus; touch targets at least 44 px
(48 px used); reduced motion respected; outdoor legibility in strong sun; colour-blind safe severity (three
redundant cues). From `design/BRIEF.md`, the D-033 brief.
