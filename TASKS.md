# Demenova tasks

Mirrors GitHub Issues (one issue per task ID; label = agent, milestone = block). The main session keeps both in sync;
if the GitHub CLI is installed and authenticated, it may run `gh issue create --title "T-001 ..." --label <agent>`.
Status: [ ] todo, [~] in progress, [x] done, [!] blocked (see PENDING.md).

## Re-plan after FIX2.md (15 Nov ~00:30 Spain): solo build by Roberto (D-021..D-028)
The former team agronomist left the team on 14 Nov; nothing waits on him (D-022). Opus 5-hour limit hit at ~00:15; resets 03:30.

| When (Spain, 15 Nov) | What | Tasks |
| --- | --- | --- |
| 03:30-10:00 | Resume data-scientist (T-024 + sensitivity check, FIX2 §4) and api-engineer (T-028); then engine review; devops | T-024, T-024b, T-025, T-028, T-029 |
| 10:00-13:00 | Strategies, data levels 0–2, deploy to Render, QA (emulated Android + iPhone) | T-042, T-044 |
| 11:00 | Gate: nice-to-haves (FIX2 §8 list) only if must-haves are green | - |
| 13:00-15:00 | Fix blockers; technical-writer project page; instructor guides | T-045, T-051 |
| 15:00 / 15:00-19:00 / 19:00-20:00 | Feature freeze; Roberto records the 30 s video; submit (buffer to 23:59) | T-050..T-053 |

Must-haves (FIX2 §8, D-028): replay 15 Feb–5 Mar 2026 with four levels and factors; Home, Map, Lot detail with history;
Strategies (3 per lot, reasons/evidence/gaps/risks; cost and labour only if sourced); data levels 0–2 with confidence
badge; email on Severe; records saved by default; units and language toggles; public link; sensitivity result visible.
Nice-to-have: Telegram bot, flood memory timeline, level 3 field notes, farmer/agronomist toggle, priority sliders,
Sigatoka and cold indicators (badge "Experimental"), Costa Rica proof map, live IMERG polling, spraying indicator.

## Re-plan after FIX.md (14 Nov 18:10 Spain; superseded by the FIX2 re-plan above)
Rule: at most 2 subagents at a time (CLAUDE.md §11), so phase 1 runs in two waves.

| When (Spain) | What | Tasks |
| --- | --- | --- |
| 18:15-18:45 | Roberto: FIX.md steps 4-6, restart with `scripts/start.ps1` | T-006, T-007 |
| 18:45-19:30 | Finish phase 0 from commit 3a37c2b (lead-architect), review, commit, PR | T-001..T-005 |
| 19:30-21:00 | Phase 1 wave A: data-engineer + agronomist (the former team agronomist needs the review queue tonight) | T-010..T-014, T-017 |
| 21:00-22:15 | Phase 1 wave B: database-engineer + product-designer | T-015, T-016 |
| 22:15-22:45 | Checkpoint A (schema, logo, dependencies); flood candidates to the former team agronomist | T-018 |
| 22:45-23:30 | technical-writer block 1 report; HANDOFF for the former team agronomist's night shift; `/save-session` | T-030 (part) |
| Day 2 04:30-10:00 | Phase 2: engine + app shell, then email API + deploy (pairs of 2) | T-020..T-029 |
| Day 2 10:00 | Gate: if must-haves are not green, every nice-to-have is cut (SPEC cut order) | - |
| Day 2 10:00-15:00 | Phase 3 scope, as planned | T-040..T-046 |
| 15:00 / 19:00 / 20:00 | Freeze, video, submit (unchanged) | T-050..T-053 |

Moved: the Render preview link for the former team agronomist's night shift is now day 2 (devops in phase 2). Tonight the former team agronomist works on the
review queue, the flood candidates and the logo options.

## Block 0: skeleton
- [x] T-001 lead-architect: repo tree and folder READMEs (10 top-level READMEs, .gitkeep leaves)
- [x] T-002 lead-architect: JSON Schemas, Pydantic models, TS types, OpenAPI sketch from CONTRACTS.md (31 schemas,
  models.py, contracts.ts, openapi.yaml; drift test tests/test_contracts.py)
- [x] T-003 lead-architect: config stubs (datasets.yaml, alerts.yaml) with null values and origins (validated)
- [x] T-004 lead-architect: scripts/check_provenance.py + tests/test_provenance.py (94 tests pass, commit 3a37c2b)
- [x] T-005 lead-architect: ADR-001..005, DECISIONS.md, PENDING.md (P-001..P-003), HANDOFF.md
- [x] T-005b lead-architect: app/ scaffold (Vite React TS) and `npm --prefix app run build` green
- [~] T-007 main session: apply FIX.md (steps 1-3, 8 done; Ponytail and claude-mem installed; open: Roberto's
  Gemini key in claude-mem setup, run the unsigned FreeLLMAPI installer or not, OmniRoute removal, restart check)
- [ ] T-006 Roberto: accounts (Earthdata, Supabase + anonymous sign-in, Render, Resend, Telegram bot), .env filled

## Block 1: foundations
- [x] T-010 data-engineer: verify datasets and fill config/datasets.yaml with URLs and access dates (16 sourced via
  CMR/official pages, gaez pending; IMERG Final V07 ends 2025-09-30 -> Late daily after)
- [x] T-011 data-engineer: AOI Pasaje/Buenavista, SRTM catchment delineation (pysheds 0.5; catchment 253.8 km² after
  review M2: OSM river burned in, outlet at the OSM exit; processed/aoi/{farm_aoi,catchment}.geojson, processed/terrain/)
- [x] T-012 data-engineer: synthetic demo lot geometry (8 lots, 5–7 ha, low and high TWI) ->
  processed/aoi/demo_lots.geojson (geometry only; agronomist merges into domain/farm.json)
- [x] T-013 data-engineer: IMERG daily 2015→today for catchment; top-15 72 h events list (review B1: single
  product IMERG Early daily GPM_3IMERGDE V07, 4,335 UTC days, 0 missing, 1,233 events; processed/rain/*.csv; P-007 updated)
- [x] T-014 data-engineer: harmonized replay stack 2026-02-15 → 2026-03-05 (IMERG, SMAP/GLDAS, POWER, NDVI)
  (POWER 7, S2 NDVI 3 scenes, terrain, SMAP all-quality (NOT recommended) + recommended-only (0 days, P-010),
  IMERG Early daily, GLDAS 4 depths; day_definition + native_resolution per layer; follow-up: IMERG Early half-hourly)
- [~] T-015 database-engineer: migrations, RLS, views, RLS tests (class A before applying). Written, not applied:
  6 migrations + supabase/tests/rls_test.sql + README paste-in steps; waits on P-009 (Roberto) and database-reviewer;
  database-review fixes applied (P-002 b telegram_code, column grants, RLS at creation, 79-check test);
  P-009 approved (D-018). Local PostgreSQL 18.7 run (supabase/tests/run_local.ps1): migrations apply in one
  transaction and re-run cleanly; 79/79 checks pass; 6/7 mutants caught (7th blocked by the policy layer).
  Remaining: Roberto runs README steps 1–6 on Supabase (hosted-only items in the report)
- [x] T-015b lead-architect: contract addition (class B) — Farm and TelegramSubscriber gain `telegram_code`
  (random, server-generated) per P-002 (b) / database review; update schemas, models.py, contracts.ts, drift test
  (contract 1.1.0, D-020; Farm optional, subscriber required; 5 new tests; pytest 183 passed, export --check OK)
- [x] T-015c lead-architect: contract 1.2.0 (class B, D-030): VerificationFile `sensitivity`, SideIndicators
  `experimental`, `reviewed_by` / `human_review` on domain items, wording for a future local agronomist,
  verification.json 20 KB, openapi 0.2.0 (503 on /run), `APP_BASE_URL` in .env.example (P-013, P-015, D-025)
- [x] T-016 product-designer: BRIEF.md, three logos, severity palette, tokens, ui components (logo pick: P-006;
  next pass: Sheet, TabBar, chart frame; wordmark to paths after the pick)
- [x] T-016b product-designer: PWA icons (192 px, 512 px, maskable) in app/public/icons, manifest `icons`, apple-touch-icon
  in index.html; without them Android shows no install prompt (Phase 0 review, medium 7). Follow-up for
  frontend-engineer: add `png,svg` to Workbox globPatterns and `theme_color`/`background_color` to the manifest
  (done in 2ea3983)
- [~] T-017 agronomist: domain files; review-queue.md (Spanish); memory note on demo lots (thresholds,
  practices, strategies, actions, glossary, flood_memories written + review queue Q-01..Q-19 + memory note;
  checks run by the main session 19:45: pytest 154 passed (all 6 domain files validate), provenance checker OK;
  domain/farm.json waits for T-012 lot geometry; P-004 raised)
- [ ] T-018 Roberto: checkpoint A (schema, logo, dependencies); send flood candidates to the former team agronomist; answer PENDING
  P-001 (state-machine diagram text), P-002 (Telegram farm code), P-003 (nullable country/province/canton)
- [x] T-019 data-engineer (done in wave A, needed by T-014): `pipeline/common/{provenance,grid,io}.py`: provenance records per DATA_POLICY §3, the 30 m
  EPSG:32717 grid aligned to SRTM (ADR-002), writers whose output passes `scripts/check_provenance.py` (before T-014)

## Block 2: core
- [x] T-020 data-scientist: terrain features, TWI terciles, zones (c39de04; zones = TWI terciles of the lot cells,
  the demo farm has no outline)
- [x] T-021 data-scientist: runoff (CN), Kirpich first lag, calibrated lag on Feb 2026 event (83d8cf0, 969e4c8;
  Kirpich tc 250.7 min; travel_lag_days 0 `calibrated` on the El Universo 23 Feb 2026 report; CN pending, no data)
- [x] T-022 data-scientist: API, FAO-56 ETc, daily balance, 2-day floor rule (83d8cf0; FAO-56 Example 18 test;
  Kc 1.10 Table 12; D pending, so the floor runs on P - ETc)
- [x] T-023 data-scientist: index W, state machine, side indicators, explanations, confidence (8b1194e, 969e4c8;
  weights/thresholds `design` per D-024; AHP in unused ahp.py; side indicators experimental)
- [x] T-024 data-scientist: verification counts; replay snapshots; tests (7e1f49c, 940cd32; 2026: 4 hits, 0 misses,
  6 false alarms vs 4 press floods; replay window 1/0/0; snapshots 644 KB, reproducible-from-repo test; 91 engine tests)
- [x] T-024b data-scientist: weight sensitivity check ±0.10 on the 22–23 Feb 2026 replay ->
  app/public/data/demo/verification.json (7e1f49c, 940cd32; strict test NOT stable in 9/10 variants at marginal
  lots 3, 6, 8; lots 1, 2, 4, 5, 7 Severe on the flood days in every variant; result in `notes`, P-015)
- [x] T-024c data-scientist: review T-025 fixes (M1 latency, M2 per-episode tallies, M4 no cold level, M5 confirmations)
  and D-029 (Severe 0.90, replay 2026-01-20..03-05) (ee9d6e4, d70d7b2 + snapshot commit; catchment tally 1 hit, 0 misses,
  4 false alarms in 2026; sensitivity at 0.90 not stable 10/10, lots 1, 2 Severe on flood days in every variant)
- [x] T-049b data-scientist: old replay stack 2026-02-15_2026-03-05 removed (git rm) after the engine moved to the new one
- [x] T-024d data-scientist: on the next snapshot run write the structured `sensitivity` block into verification.json and
  `side.experimental: true` in replay snapshots (contract 1.2.0, D-030); not into Supabase alert_states (is_side check)
  (done: sensitivity block from the T-024b run at 0.90, Sigatoka `experimental: true` in files only; old hourly POWER
  file removed; existing fields unchanged, schema_version 1.2.0)
- [ ] T-047 data-scientist: source or replace the engine's `estimated` values with opened sources (api_k NWS PDF,
  Sigatoka/leaf-wetness/heat-unit papers, Saaty's RI table for n = 5); agent work, no human expert (D-022)
- [ ] T-048 data-scientist (post-hackathon, class A, P-017): seasonal (day-of-year window) percentiles for W, because
  annual percentiles keep wet-season days high for weeks (review T-025 M3); do not implement before Roberto approves
- [x] T-049 data-engineer: NDVI fixed (BOA offset applied twice on Earth Search items with
  `earthsearch:boa_offset_applied`; range test), composite regenerated, lots kept in place, ids `lot_demo-el-oro_N`
  (4c606ad); replay stack 2026-01-20..03-05 for D-029 in `processed/replay/2026-01-20_2026-03-05/` (8cf2ed1)
- [ ] T-049b data-scientist: point the engine STACK at `replay/2026-01-20_2026-03-05`, drop the lot-id mapping
  shim if wanted; then data-engineer deletes the old `replay/2026-02-15_2026-03-05` (pre-fix NDVI > 1)
- [x] T-025 scientist-reviewer + code-reviewer: engine review; blockers → tasks (approve with changes; fixed in T-024c)
- [x] T-026 frontend-engineer: shell, navigation, data layer, IndexedDB, replay scrubber (2ea3983; 36 Vitest tests;
  initial JS 86.3 kB gzip; Supabase lazy and optional; checked with the synthetic dev fixture only)
- [x] T-027 frontend-engineer: Home, Map, Lot detail; units and language toggles (2ea3983; Map = Leaflet + GIBS lazy,
  Lot charts uPlot lazy; re-checked on real snapshots in c5c2db4: D-029 window opens 23 Feb, lots-only lists,
  experimental Sigatoka; open: map month view, prior-years comparison)
- [x] T-028 api-engineer: FastAPI health/run/email-test; Severe email with dedupe; tests (39 backend tests;
  open: real email from the replay once T-024 is in Supabase; security review; P-013)
- [ ] T-029 devops-engineer: CI, pipeline workflow, render.yaml, deploys, size gate; CI must run
  `python scripts/check_provenance.py` and `uv run pytest` on every push (files committed and passing locally;
  open: Roberto pushes, adds GitHub secrets, creates the Render Blueprint per docs/DEPLOY.md; live hourly
  ingest/score entry point not built yet, step skipped in pipeline.yml)
- [x] T-030 technical-writer: block 2 report, SI-use log (English only, D-026) (16088a2)

## Block 3: scope completion (day 2)
- [x] T-040 agronomist: apply FIX2 §5 mandate (sourced or labelled, checks not prescriptions, reviewed_by /
  human_review fields, review-queue.md for a future local agronomist) (D-025) — done 2026-11-15, report
  docs/reports/agronomist/2026-11-15-0730.md; one Agrocalidad line in glossary fusarium_r4t
- [ ] T-065 agronomist (post-hackathon): source or replace the `estimated` domain values (Sigatoka, heat units, cold
  night, practice drafts, glossary definitions, questionnaire defaults) with opened sources; agent work, no human
  expert (D-022). Every estimated item in domain/ points here
- [x] T-041 closed: won't do — no expert AHP matrix; replaced by T-024b sensitivity check (D-024); ahp.py kept unused
- [x] T-042 frontend-engineer: Strategies (badge "Not yet reviewed by a local agronomist"), Alerts, Learn, Farm setup
  data levels 0–2 (level 3 is nice-to-have), data saver, sensitivity result in Lot detail or "How reliable is this?"
  (a0067a9 Strategies, 613f4f5 setup levels 0–2 + sync, 029b64e reliability sheet, 0f1f9b2 Learn + records CSV;
  61 Vitest tests; initial JS 92.6 kB gzip; open: domain/strategies.yaml still names the former agronomist
  (scrubbed at copy time by app/scripts/build_domain_snapshots.py; fix at source in T-040), farmer toggle, level 3)
- [ ] T-043 api-engineer: Telegram bot (nice-to-have)
- [ ] T-044 qa-demo-engineer: e2e suite, replay acceptance, DEVICE_CHECKLIST.md (iPhone 14 Pro, iPad Air M2,
  Chrome DevTools Android emulation 360×780, CPU 4×, Slow 4G) (suite built: tests/e2e, Playwright 1.65.1 (P-018),
  Edge, 4 viewports; 147 passed, 4 failed = T-066 on every viewport; replay acceptance green; perf Fast 4G + CPU 4×
  2.5 s, Slow 4G 4.4 s; report docs/reports/qa/2026-11-15-0607.md; open: T-066, Roberto fills DEVICE_CHECKLIST.md
  and the Lighthouse row on the Render URL)
- [x] T-066 frontend-engineer (be4ba60; per-level checks on Lot detail and Home banner 3ccd75c; e2e 150 passed, the
  Fast 4G perf test passes alone with --workers=1; size gate fixed 41f1b34): Strategies soil/water scores show an origin badge but no timestamp (acceptance: no
  number without origin and timestamp); pass strategies.json `generated_at` as `at` in Score (Strategies.tsx).
  Failing test: tests/e2e/specs/screens.spec.ts "every number on Strategies carries an origin badge and a timestamp"
- [x] T-067 qa-demo-engineer: block 3 (D-033) C1 gate: GREEN at 712400a (e2e 197 passed + @perf 2 alone, CSP, Flood
  and a11y specs new; report docs/reports/qa/2026-11-15-1005.md). C3 GREEN: app d64b98e, tests aa5fa09
  (docs/reports/qa/2026-11-15-1020.md). C4 GREEN: app 2231e63 (head b0634af), tests 66385b4
  (docs/reports/qa/2026-11-15-1110.md)
- [x] T-070 frontend-engineer or product-designer (P3, R-11, D-033; fixed 2231e63, e2e last-pass.spec.ts at 360 on 23 Feb): at 360 px a neighbour's label covers up to 40 %
  of Lote 2's outline on every replay day (its own label and word stay visible); not seen at 1440x900
- [x] T-068 frontend-engineer (non-blocking, D-033; done bea116f, e2e tightened aa5fa09): CL-07 separators may switch now (e2e accepts " · " or ", " for
  the Setup badge and the map rain label); Strategies cards are h3 under h1 (detector skipped-heading: make them h2)
- [x] T-069 product-designer (non-blocking, D-033; done d64b98e): map label padding sits at the detector limit (cramped-padding,
  4 px for 12 px text); dark-theme ink-2/ink-3 on surface flagged gray-on-color (contrast 5.70-8.54:1, AA pass)
- [x] T-071 qa-demo-engineer: block 4 (D-036) C5 gate GREEN at app 6917745 (e2e 317 passed + @perf 2 alone; new specs
  welcome, setup-block4, alerts-channels; report docs/reports/qa/2026-11-15-1418.md)
- [ ] T-072 product-designer (non-blocking, D-036): Welcome copy still lists the old imagery: Instructions "Map" step
  (content.en.ts/es.ts:46 "Relief or True colour") and Technical details (:132 lists ASTER relief and MODIS only; add
  Landsat WELD as the default Satellite and OpenStreetMap for Streets)
- [ ] T-073 owner of docs/site (non-blocking, D-036): docs/site/Instructions.md:57 and the built Instructions.pdf say
  "Imagery: Relief or True colour"; Satellite (default), Streets and Relief since 649d287; rebuild the PDF
- [x] T-045 instructor: farmer (Spanish first) and agronomist guides, judge quick start, Learn cards; agronomic
  guidance stated as general and not reviewed by a local agronomist (5 guides done 2026-11-15; learn-cards.md
  skipped, optional; <app URL> placeholder for Roberto; report docs/reports/instructor/2026-11-15-1400.md)
- [x] T-046 closed: won't do (team change, D-022)

## Freeze and submission (day 2, 15:00 → 20:00)
- [x] T-050 qa + scientist-reviewer + security-reviewer final pass; provenance and size gates (all claims-review
  blocker/major items fixed: guides 89dcdc9, README/project page f85b2eb, domain b176218; final run on b176218:
  pytest 424, Vitest 67, e2e 149 passed + 2 perf, size gate OK, provenance OK) (security review done,
  fixes a46d5ae/f0635be; claims review docs/reports/science/2026-11-15-0617-claims.md: 1 blocker + 7 major, fixes
  routed to instructor, technical-writer, agronomist; size gate OK 41f1b34)
- [ ] T-051 technical-writer: README, CITATIONS, CHANGELOG, SI-use description, project page (en); no naming of the
  former team agronomist (FIX2 §7, D-027). Done: CITATIONS e93d5d4, README f7f8fe1, project page draft 73226ac;
  open: app/video/repo URLs (Roberto), AI video tools line, final SI-use description at freeze
- [ ] T-052 Roberto: 30-second video with English captions, public link
- [ ] T-053 Roberto: submit by 20:00 Spain; confirm only active members are listed (ask the Local Lead, D-027)

## Former the former team agronomist inputs (closed 14 Nov 2026)
- [x] T-060 closed: won't do (team change, D-022); questionnaire defaults become v1 values tagged estimated (D-023)
- [x] T-061 closed: won't do (team change, D-022)
- [x] T-062 closed: won't do (team change, D-022); biosecurity: at most one cited line to the official authority (D-025)
- [x] T-063 closed: won't do (team change, D-022)
- [x] T-064 closed: won't do (team change, D-022); the synthetic demo farm is final for v1
