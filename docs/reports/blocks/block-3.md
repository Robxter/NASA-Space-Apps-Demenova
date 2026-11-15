# Block 3: frontend upgrade (79e05f3..143fb1a, branch `block/3-polish`, not pushed)

Status: QA GREEN on app code `2231e63` (head `b0634af` has the same `app/` tree; final test commit `66385b4`).
Plan: `docs/briefs/2026-11-15-frontend-upgrade/00-plan.md`. Tools: `docs/DESIGN_TOOLS.md`.

## 1. What was built, by whom
- Main session: installed the design tools (79829f6); filled `Extract.md` for Roberto's claude.ai conversation in a
  separate worktree so frontend work was not interrupted (dbdd24f); recorded D-035 (16b2625).
- agent-ops-engineer: plan, per-agent briefs, tool ledger (e1cafb2).
- product-designer (reports `docs/reports/product-designer/2026-11-15-0925.md`, `-0950.md`, `-1105.md`):
  PRODUCT.md and DESIGN.md (9c58796); critique, audit, copy proposals, change list (9bf117d); Severe-moment prototype,
  3 variants, Flood picked (666667f); motion tokens and ui components (2e5b1d1, 750d4b6, 67b282d); scrubber 44 px
  thumb (a45c73a); review round (6f56b95, 8daebc0, b9512db, d64b98e); taste rules (7947118, ce445a8); About page
  attempt (0361afe, fc3c12e; cut in c22fd70; b0634af).
- frontend-engineer (HANDOFF.md entries of 15 Nov): phone fixes and worst-case dev fixture (377df53); hardened error
  and empty states (6210e77, adabfac); change list on every screen (35a08a2, 81c033a, 971c318, a5998ff, 71edcfd,
  d354fa6); review fixes (227d9bb, 2005ea6, bea116f); claims test (ee721cf); last pass: adapt, onboard, distill (2231e63).
- qa-demo-engineer (reports `docs/reports/qa/2026-11-15-1005.md`, `-1020.md`, `-1110.md`): C1 (836e41c, 712400a,
  831c676), C3 (aa5fa09, a6bc668, e3f8ead), C4 (afb5ffb, 66385b4, 143fb1a).
- Outcome: change list of 32 items (`design/upgrade/CHANGE_LIST.md`) plus review items R-01..R-11. Severe moment
  "Flood" on the map; Home leads with banner and status; map labels above their lots; reliability sheet as a native
  dialog; phone meta tags; two-column Home from 1024 px; onboarding and empty-state actions; farmer Home distilled.
  No data, engine, contract or backend change (D-033 guardrails).

## 2. Decisions
- D-033 (A): upgrade with third-party design tools, Figma MCP excluded, no new npm dependency, CSP and 150 kB
  initial-JS budget kept. D-034 (A): block working rules (append-only ledger, About page owner for this block, phone
  meta tags, Taste kit files for the stretch only). D-035 (A): four design rules Roberto approved ("APPROVE ALL"):
  soil-core icons only, One Moment Rule, theme follows the phone, no claim that the app predicted the February 2026
  flood; CLAUDE.md §8 gains "read DESIGN.md before UI work". D-035 was recorded from product-designer's record.
- Waiting for Roberto (not yet in PENDING.md): Flood or Ripple; two-column Lot detail proposal (in CHANGE_LIST).

## 3. Tools used (ledger: 102 rows; product-designer 50, frontend-engineer 29, qa-demo-engineer 23)
- Emil Kowalski skills: 19 installed, 3 not applicable (animate-expo, write-swift, ask-sonner); about 22 rows.
- Impeccable 4.9.1, signed engine 0.1.24, telemetry and hooks off: about 30 rows (context, init, document, critique,
  audit, detect). Critique, typeset and motion review ran degraded in one context (no helper sub-agents).
- Taste skill 2.5.1 (about 14 rows, mostly the About page gate) plus four classics (about 3 rows).
- Playwright MCP 0.0.85 through `scripts/pw_mcp.mjs`: about 22 rows (screenshots, drags, sweeps).
- Row counts are keyword matches; one row can name more than one tool. Figma MCP not used (excluded by Roberto).

## 4. Data
- No data values added or changed; severity hex values unchanged. Prototype and tests read the synthetic demo
  (`app/public/data/demo`, labelled "Demo"). The cut About page used one NASA GIBS VIIRS image; it is not shipped.

## 5. Tests and reviews
- C1 GREEN at 712400a: e2e 197 passed, 0 failed, 3 skipped. C3 GREEN at d64b98e: 197 passed (CSP 4/4, Flood 12/12,
  a11y 32/32). C4 GREEN on b0634af: e2e 213 passed, 0 failed, 15 skipped; CSP 0 violations; Vitest 84/84; initial
  JS 96.4 kB of 150 kB; cold load 2.13-2.34 s on Fast 4G + CPU 4x over 3 runs (budget 3 s); detector 0 blockers.
- New specs: csp, flood, a11y, last-pass. New unit checks: motion.test.ts (One Moment Rule), claims test (CL-32).

## 6. Cut
- Stretch "About Demenova" page (Taste 2.5.1 full flow): gate OPEN 3 after three rounds, removed by plan (cut
  order 1) in c22fd70; kept in history at fc3c12e.

## 7. Open items and risks
- Not live: the site still deploys `block/2-core` at 79e05f3; putting block 3 live is Roberto's step.
- Roberto: device checklist on iPhone 14 Pro and iPad Air M2 (portrait and landscape), one Lighthouse run on the
  Render URL, Flood or Ripple, two-column Lot detail, PRODUCT.md confirmations (users and principles are inferred).
- Pending: scrubber on a real phone (Edge only so far); R-10 deferred; imagery caption padding at its 4 px limit at
  360; reduced motion keeps 120-200 ms colour fades; `/about/` service-worker denylist and test point at nothing.
