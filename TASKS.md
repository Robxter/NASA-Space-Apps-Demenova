# Demenova tasks

Mirrors GitHub Issues (one issue per task ID; label = agent, milestone = block). The main session keeps both in sync;
if the GitHub CLI is installed and authenticated, it may run `gh issue create --title "T-001 ..." --label <agent>`.
Status: [ ] todo, [~] in progress, [x] done, [!] blocked (see PENDING.md).

## Re-plan after FIX2.md (15 Nov ~00:30 Spain): solo build by Roberto (D-021..D-028)
Tyson left the team on 14 Nov; nothing waits on him (D-022). Opus 5-hour limit hit at ~00:15; resets 03:30.

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
| 19:30-21:00 | Phase 1 wave A: data-engineer + agronomist (Tyson needs the review queue tonight) | T-010..T-014, T-017 |
| 21:00-22:15 | Phase 1 wave B: database-engineer + product-designer | T-015, T-016 |
| 22:15-22:45 | Checkpoint A (schema, logo, dependencies); flood candidates to Tyson | T-018 |
| 22:45-23:30 | technical-writer block 1 report; HANDOFF for Tyson's night shift; `/save-session` | T-030 (part) |
| Day 2 04:30-10:00 | Phase 2: engine + app shell, then email API + deploy (pairs of 2) | T-020..T-029 |
| Day 2 10:00 | Gate: if must-haves are not green, every nice-to-have is cut (SPEC cut order) | - |
| Day 2 10:00-15:00 | Phase 3 scope, as planned | T-040..T-046 |
| 15:00 / 19:00 / 20:00 | Freeze, video, submit (unchanged) | T-050..T-053 |

Moved: the Render preview link for Tyson's night shift is now day 2 (devops in phase 2). Tonight Tyson works on the
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
- [x] T-016 product-designer: BRIEF.md, three logos, severity palette, tokens, ui components (logo pick: P-006;
  next pass: Sheet, TabBar, chart frame; wordmark to paths after the pick)
- [x] T-016b product-designer: PWA icons (192 px, 512 px, maskable) in app/public/icons, manifest `icons`, apple-touch-icon
  in index.html; without them Android shows no install prompt (Phase 0 review, medium 7). Follow-up for
  frontend-engineer: add `png,svg` to Workbox globPatterns and `theme_color`/`background_color` to the manifest
  (done in 2ea3983)
- [~] T-017 agronomist: domain files; tyson-review-queue.md (Spanish); memory note on demo lots (thresholds,
  practices, strategies, actions, glossary, flood_memories written + review queue Q-01..Q-19 + memory note;
  checks run by the main session 19:45: pytest 154 passed (all 6 domain files validate), provenance checker OK;
  domain/farm.json waits for T-012 lot geometry; P-004 raised)
- [ ] T-018 Roberto: checkpoint A (schema, logo, dependencies); send flood candidates to Tyson; answer PENDING
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
- [ ] T-047 data-scientist: source or replace the engine's `estimated` values with opened sources (api_k NWS PDF,
  Sigatoka/leaf-wetness/heat-unit papers, Saaty's RI table for n = 5); agent work, no human expert (D-022)
- [ ] T-048 data-scientist: apply Roberto's answer to P-014 (W thresholds, earlier replay start) and re-run replay
- [ ] T-049 data-engineer: NDVI layers invalid (19 Feb 2026 scene: 90 % of clear pixels > 1, median 1.40; the
  2025–26 composite used for lot placement likewise; check the STAC raster:bands scale/offset); demo_lots.geojson
  ids `lot_demo_el_oro_N` break the contract (`lot_demo-el-oro_N`); engine maps them meanwhile
- [ ] T-025 scientist-reviewer + code-reviewer: engine review; blockers → tasks
- [x] T-026 frontend-engineer: shell, navigation, data layer, IndexedDB, replay scrubber (2ea3983; 36 Vitest tests;
  initial JS 86.3 kB gzip; Supabase lazy and optional; checked with the synthetic dev fixture only)
- [x] T-027 frontend-engineer: Home, Map, Lot detail; units and language toggles (2ea3983; Map = Leaflet + GIBS lazy,
  Lot charts uPlot lazy; open: run against real snapshots after T-024, map month view, prior-years comparison)
- [x] T-028 api-engineer: FastAPI health/run/email-test; Severe email with dedupe; tests (39 backend tests;
  open: real email from the replay once T-024 is in Supabase; security review; P-013)
- [ ] T-029 devops-engineer: CI, pipeline workflow, render.yaml, deploys, size gate; CI must run
  `python scripts/check_provenance.py` and `uv run pytest` on every push (files committed and passing locally;
  open: Roberto pushes, adds GitHub secrets, creates the Render Blueprint per docs/DEPLOY.md; live hourly
  ingest/score entry point not built yet, step skipped in pipeline.yml)
- [ ] T-030 technical-writer: block 2 report, SI-use log (English only, D-026)

## Block 3: scope completion (day 2)
- [ ] T-040 agronomist: apply FIX2 §5 mandate (sourced or labelled, checks not prescriptions, reviewed_by /
  human_review fields, review-queue.md for a future local agronomist) (D-025)
- [x] T-041 closed: won't do — no expert AHP matrix; replaced by T-024b sensitivity check (D-024); ahp.py kept unused
- [ ] T-042 frontend-engineer: Strategies (badge "Not yet reviewed by a local agronomist"), Alerts, Learn, Farm setup
  data levels 0–2 (level 3 is nice-to-have), data saver, sensitivity result in Lot detail or "How reliable is this?"
- [ ] T-043 api-engineer: Telegram bot (nice-to-have)
- [ ] T-044 qa-demo-engineer: e2e suite, replay acceptance, DEVICE_CHECKLIST.md (iPhone 14 Pro, iPad Air M2,
  Chrome DevTools Android emulation 360×780, CPU 4×, Slow 4G)
- [ ] T-045 instructor: farmer (Spanish first) and agronomist guides, judge quick start, Learn cards; agronomic
  guidance stated as general and not reviewed by a local agronomist
- [x] T-046 closed: won't do (team change, D-022)

## Freeze and submission (day 2, 15:00 → 20:00)
- [ ] T-050 qa + scientist-reviewer + security-reviewer final pass; provenance and size gates
- [ ] T-051 technical-writer: README, CITATIONS, CHANGELOG, SI-use description, project page (en); no naming of the
  former team agronomist (FIX2 §7, D-027)
- [ ] T-052 Roberto: 30-second video with English captions, public link
- [ ] T-053 Roberto: submit by 20:00 Spain; confirm only active members are listed (ask the Local Lead, D-027)

## Former Tyson inputs (closed 14 Nov 2026)
- [x] T-060 closed: won't do (team change, D-022); questionnaire defaults become v1 values tagged estimated (D-023)
- [x] T-061 closed: won't do (team change, D-022)
- [x] T-062 closed: won't do (team change, D-022); biosecurity: at most one cited line to the official authority (D-025)
- [x] T-063 closed: won't do (team change, D-022)
- [x] T-064 closed: won't do (team change, D-022); the synthetic demo farm is final for v1
