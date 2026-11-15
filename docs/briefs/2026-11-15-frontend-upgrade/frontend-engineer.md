# Brief: frontend-engineer, block 3 frontend upgrade (D-033)

Goal: every screen behaves like a native phone app (no tap flash, stuck hover, input zoom or notch clipping),
survives worst-case content, and carries product-designer's change list, with every gate green and the budgets
kept. Roberto: "upgrade the frontend ... USE THEM FULLY except for Figma".
Context: plan and times in `00-plan.md`; tools in `docs/DESIGN_TOOLS.md`. product-designer works in parallel and
writes `design/upgrade/CHANGE_LIST.md` by 10:20 (items owned "FE" are yours). Skills are under `.claude/skills/`;
you have no Skill tool, so Read the files named here, only the sections named.

## Guardrails (reasons in CLAUDE.md §1-2, §6-7)
1. Rule zero: every number keeps its origin badge and timestamp (e2e enforces it); missing shows "No data"/"Sin
   datos"; the "Demo" label stays; nothing says the app predicted the Feb 2026 flood; verification is counts only.
2. Severity is colour AND word, words from the dictionary. Keep the badges "Not yet reviewed by a local agronomist",
   "Experimental", "Estimated" and "Built with NASA Earth observations"; no NASA logo; never name the former team
   agronomist.
3. 360 px and desktop; contrast, visible focus, 44 px targets, `prefers-reduced-motion`; every new string goes into
   both `app/src/i18n/en.ts` and `es.ts` (the parity test checks it).
4. No new npm dependencies (class A: PENDING.md entry with a recommendation; continue without). Motion is CSS, the
   Web Animations API and pointer events. No CDNs or external fonts; no `style=""` attributes in HTML files (CSP
   `style-src 'self'`). Initial JS at most 150 kB gzip (94.3 now); cold load under 3 s on Fast 4G + CPU 4x (2.5 s
   now): lazy-load anything new, nothing before first render.
5. Do not change the `app/src/data/` loading order, the snapshots, contracts, the hCaptcha connect flow
   (`ConnectDevice.tsx` behaviour) or offline behaviour. Never compute alert logic in the app.
6. Write only `app/src/` (not `styles/`, not `components/ui/`), `app/vite.config.ts`, Vitest tests. Use the
   designer's tokens and components, never ad-hoc colours. A needed edit in `app/index.html` (for example
   `theme-color`) or in a ui component goes into your report or a CHANGE_LIST note; do not edit it.
7. If a visual change breaks an e2e selector, leave `tests/e2e/` alone: report the spec, the selector and the CL item
   that caused it; qa-demo-engineer updates the test.
Every step: append a row to `TOOL_LEDGER.md`; commit `git commit -m "<type>(app): ... (D-033)" -- <paths>`.

## Gate (you run it at A0, Gate A 11:00 and after C2; Gate B-lite at 12:15 is the first three lines only)
```powershell
$env:Path = 'C:\Program Files\nodejs;' + $env:Path; $env:PYTHONUTF8 = '1'
npm --prefix app run typecheck; npm --prefix app run test          # 76 tests
npm --prefix app run build; node scripts/check_bundle_size.mjs     # at most 150 kB
cd tests/e2e; npx playwright test; npx playwright test --grep @perf --workers=1; cd ../..
```
Green = 0 failures (149 + 2 perf). Write the commit hash as "last green" in the ledger. Red at the gate time:
`git revert` your commits since the last green hash and report why.

## Phase A (09:25-11:00): work that does not need new tokens
A0 (15 min) `git switch block/3-polish`; `.claude\skills\impeccable\scripts\impeccable.cmd context` (once); run the
   Gate as a baseline; record the hash.
A1 (20 min) Read `mobile-native/SKILL.md` (Hard Rules, Symptom Table, Fixes 1-11, Baseline, Never Ship). Check and fix
   in your files: hover styles only under `@media (hover: hover)`; inputs at least 16 px font (`Setup.tsx`,
   `ConnectDevice.tsx`, `LevelCheck.tsx`) so iOS does not zoom; `overscroll-behavior` on the Map and the sheet;
   long-press text selection on buttons; fast tap; notch and home-indicator insets (already
   `env(safe-area-inset-*)`): verify on Map and `ReliabilitySheet.tsx`. Done: each symptom marked fixed or absent.
A2 (25 min) Read `break-ui/SKILL.md` and its `CATALOG.md` (only the text, numbers, collections, time and states
   rows). Phase 1 table with limits from `app/src/types/contracts.ts`. Worst-case fixture in
   `app/src/dev/worst-case.ts`, tagged `origin: 'synthetic'` and shown with the Demo label, entering at the same
   boundary as the demo data, loaded only when `import.meta.env.DEV` and `?data=worst` (dev-only, Hard Rule 4).
   Cases: long Spanish strings, long lot names, 0, 1 and 40 lots, every value missing, stale, offline. Fix plain
   breaks (wrapping, `min-width: 0`, overflow) in screens; design decisions go to CHANGE_LIST under "From break-ui"
   for the designer. Check after the build: `Select-String -Path app/dist/assets/*.js -Pattern 'worst-case'` finds
   nothing.
A3 (20 min) Read `animation-performance/SKILL.md`, `find-animation-opportunities/SKILL.md`,
   `impeccable/reference/optimize.md`. Audit existing motion (`dn-ripple`, `dn-lot-onset`, Leaflet layers, the sheet):
   transform and opacity only, no animated layout properties. Opportunities that answer a user action go to
   CHANGE_LIST (FE section) for the designer's B2 review. Optimize: diagnose the cold load and change render-path code
   only; QA's note that Home waits for all 45 replay files is reported, not changed (guardrail 5).
A4 (20 min) Read `impeccable/reference/harden.md` and `clarify.md`. Harden: error and empty states at trust
   boundaries (Supabase, snapshot fetch, import parse) say what happened and how to fix it; long es strings fit.
   Clarify: apply `design/upgrade/copy-proposals.md` once it exists (new wording of existing facts only), en and es.
A5 (5 min) Read `pick-ui-library/SKILL.md` "Common mismatches to catch" for the sheet drag and the scrubber; record
   "built with pointer events + CSS". A library you would want becomes a PENDING.md entry (class A); continue without.
Gate A (11:00-11:15).

## Phase B (11:15-12:15): apply CHANGE_LIST, P1 first, screen by screen
Order: Home -> Map -> Lot (+ `ReliabilitySheet.tsx`) -> Alerts -> Strategies -> Learn -> Setup (cut order 5: the last
three may keep phase A only). Read once before the first edit: `impeccable/reference/craft-floor.md`,
`mode-operate.md`, `layout.md`, `adapt.md`, `animate.md`, `onboard.md`, `distill.md`, `animate/SKILL.md`,
`choreograph/SKILL.md`, `gestures/SKILL.md` ("Sheets without springs", "Touch checklist", "Reduced motion"),
`apple-design/SKILL.md` §3, `emil-design-eng/SKILL.md` "Review Checklist".
Per screen:
1. Apply its CL items (layout and hierarchy; adapt at 360x780, 393x852, 820x1180, 1440x900).
2. Motion only through the designer's tokens; every animation has a reduced-motion path.
3. Home and Map: the Severe moment as picked in `design/prototypes/severe-moment.html` (choreograph). It plays once
   per transition while scrubbing, never on the load of an already-Severe lot.
4. `ReliabilitySheet.tsx`: drag-to-dismiss with pointer events (interruptible, velocity threshold); keep the close
   button, Escape and focus return (cut order 3: drop the drag, keep the rest).
5. Setup level 0 first run and empty Alerts ("No alerts yet"): onboard playbook, empty screens invite the next action.
   Farmer mode Home: distill to one status, one alert, one action.
6. Look: `node scripts/pw_mcp.mjs .playwright-mcp/frontend-engineer/<screen>.json --max-chars 800` against
   `npm --prefix app run dev -- --port 5173` at 360 and 1440, light and dark, en and es; batch the fixes, then look
   once more. `browser_console_messages` shows no errors.
7. `npm --prefix app run typecheck; npm --prefix app run test`; Review Checklist; commit the screen.
Gate B-lite (12:15-12:20), then hand over to qa-demo-engineer in HANDOFF.md: list CL items done, selector risks.

## Phase C and stretch
C2 (13:00-13:10) Fix qa-demo-engineer's blockers in your paths, one commit each, then the full Gate.
Stretch S (about 10 min, when the designer asks in HANDOFF.md): in `app/vite.config.ts` workbox add
`navigateFallbackDenylist: [/^\/about\//]` so the service worker never answers `/about/` with the app shell. Check:
build, `node tests/e2e/serve.mjs 4173`, open `/` then `/about/`: the About page loads; `offline.spec.ts` green.

## Definition of done
Gate green after A, B-lite green, full Gate green after C2; each CL item owned FE marked done or open with a reason;
selector breaks listed; ledger rows for every tool; report `docs/reports/frontend-engineer/<YYYY-MM-DD-HHmm>.md`
(template in `docs/AGENTS.md`, at most 60 lines); TASKS.md and HANDOFF.md updated.
