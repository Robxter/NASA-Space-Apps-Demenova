# Demenova tasks

Mirrors GitHub Issues (one issue per task ID; label = agent, milestone = block). The main session keeps both in sync;
if the GitHub CLI is installed and authenticated, it may run `gh issue create --title "T-001 ..." --label <agent>`.
Status: [ ] todo, [~] in progress, [x] done, [!] blocked (see PENDING.md).

## Re-plan after FIX.md (14 Nov 18:10 Spain; deadline unchanged: submit by 20:00 on 15 Nov, hard close 23:59)
Rule: at most 2 subagents at a time (CLAUDE.md §11), so phase 1 runs in two waves.

| When (Spain) | What | Tasks |
| --- | --- | --- |
| 18:15-18:45 | Roster: FIX.md steps 4-6, restart with `scripts/start.ps1` | T-006, T-007 |
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
- [~] T-007 main session: apply FIX.md (steps 1-3, 8 done; Ponytail and claude-mem installed; open: Roster's
  Gemini key in claude-mem setup, run the unsigned FreeLLMAPI installer or not, OmniRoute removal, restart check)
- [ ] T-006 Roster: accounts (Earthdata, Supabase + anonymous sign-in, Render, Resend, Telegram bot), .env filled

## Block 1: foundations
- [x] T-010 data-engineer: verify datasets and fill config/datasets.yaml with URLs and access dates (16 sourced via
  CMR/official pages, gaez pending; IMERG Final V07 ends 2025-09-30 -> Late daily after)
- [x] T-011 data-engineer: AOI Pasaje/Buenavista, SRTM catchment delineation (pysheds 0.5; catchment 252.7 km²,
  processed/aoi/{farm_aoi,catchment}.geojson, processed/terrain/{dem,upslope_area}_farm_30m.tif)
- [x] T-012 data-engineer: synthetic demo lot geometry (8 lots, 5–7 ha, low and high TWI) ->
  processed/aoi/demo_lots.geojson (geometry only; agronomist merges into domain/farm.json)
- [x] T-013 data-engineer: IMERG daily 2015→today for catchment; top-15 72 h events list (4,335 days, 0 missing;
  processed/rain/{imerg_catchment_daily,top15_72h_events}.csv; P-007 numbers added; P-008 resolved)
- [x] T-014 data-engineer: harmonized replay stack 2026-02-15 → 2026-03-05 (IMERG, SMAP/GLDAS, POWER, NDVI)
  (POWER 7, S2 NDVI 3 scenes, terrain, SMAP AM/PM + flags, IMERG Late daily, GLDAS 4 depths; flood date P-007 open;
  follow-up: IMERG Early half-hourly for the window)
- [~] T-015 database-engineer: migrations, RLS, views, RLS tests (class A before applying). Written, not applied:
  6 migrations + supabase/tests/rls_test.sql + README paste-in steps; waits on P-009 (Roster) and database-reviewer;
  then Roster runs README steps 1–9 (RLS tests need a real Supabase; no local Postgres)
- [x] T-016 product-designer: BRIEF.md, three logos, severity palette, tokens, ui components (logo pick: P-006;
  next pass: Sheet, TabBar, chart frame; wordmark to paths after the pick)
- [x] T-016b product-designer: PWA icons (192 px, 512 px, maskable) in app/public/icons, manifest `icons`, apple-touch-icon
  in index.html; without them Android shows no install prompt (Phase 0 review, medium 7). Follow-up for
  frontend-engineer: add `png,svg` to Workbox globPatterns and `theme_color`/`background_color` to the manifest
- [~] T-017 agronomist: domain files; tyson-review-queue.md (Spanish); memory note on demo lots (thresholds,
  practices, strategies, actions, glossary, flood_memories written + review queue Q-01..Q-19 + memory note;
  checks run by the main session 19:45: pytest 154 passed (all 6 domain files validate), provenance checker OK;
  domain/farm.json waits for T-012 lot geometry; P-004 raised)
- [ ] T-018 Roster: checkpoint A (schema, logo, dependencies); send flood candidates to Tyson; answer PENDING
  P-001 (state-machine diagram text), P-002 (Telegram farm code), P-003 (nullable country/province/canton)
- [x] T-019 data-engineer (done in wave A, needed by T-014): `pipeline/common/{provenance,grid,io}.py`: provenance records per DATA_POLICY §3, the 30 m
  EPSG:32717 grid aligned to SRTM (ADR-002), writers whose output passes `scripts/check_provenance.py` (before T-014)

## Block 2: core
- [ ] T-020 data-scientist: terrain features, TWI terciles, zones
- [ ] T-021 data-scientist: runoff (CN), Kirpich first lag, calibrated lag on Feb 2026 event
- [ ] T-022 data-scientist: API, FAO-56 ETc, daily balance, 2-day floor rule
- [ ] T-023 data-scientist: index W, state machine, side indicators, explanations, confidence
- [ ] T-024 data-scientist: verification counts; replay snapshots; tests
- [ ] T-025 scientist-reviewer + code-reviewer: engine review; blockers → tasks
- [ ] T-026 frontend-engineer: shell, navigation, data layer, IndexedDB, replay scrubber
- [ ] T-027 frontend-engineer: Home, Map, Lot detail; units and language toggles
- [ ] T-028 api-engineer: FastAPI health/run/email-test; Severe email with dedupe; tests
- [ ] T-029 devops-engineer: CI, pipeline workflow, render.yaml, deploys, size gate; CI must run
  `python scripts/check_provenance.py` and `uv run pytest` on every push (not wired anywhere yet; Phase 0 review)
- [ ] T-030 technical-writer: block 2 report, SI-use log; HANDOFF for Tyson's night shift

## Block 3: scope completion (day 2)
- [ ] T-040 agronomist: apply Tyson's answers; approvals; remaining queue
- [ ] T-041 data-scientist: AHP weights from Tyson's matrix (class A to apply)
- [ ] T-042 frontend-engineer: Strategies, Alerts, Learn, Farm setup data levels 0–3, modes, data saver
- [ ] T-043 api-engineer: Telegram bot (nice-to-have)
- [ ] T-044 qa-demo-engineer: e2e suite, replay acceptance, DEVICE_CHECKLIST.md
- [ ] T-045 instructor: farmer and agronomist guides (es/en), judge quick start, Learn cards
- [ ] T-046 Tyson: device checklist on Galaxy A55; issues; project page draft; video script and voice

## Freeze and submission (day 2, 15:00 → 20:00)
- [ ] T-050 qa + scientist-reviewer + security-reviewer final pass; provenance and size gates
- [ ] T-051 technical-writer: README, CITATIONS, CHANGELOG, SI-use description, project page (en) + Tyson summary
- [ ] T-052 Roster + Tyson: 30-second video with English subtitles, public link
- [ ] T-053 Roster: submit by 20:00 Spain; confirm all members and public links

## Waiting on Tyson (questionnaire 5.1–5.10, Tasks 5–7 in his doc)
- [ ] T-060 variety, density, soil type, drainage depth/spacing
- [ ] T-061 actions per alert level; solo-farmer actions; local vocabulary; preferred channel
- [ ] T-062 biosecurity text (Fusarium TR4) — nothing shown until approved
- [ ] T-063 evidence of zero-data farms; flood memory table; AHP pairwise comparisons
- [ ] T-064 redefine the demo farm's imaginary lot layout and attributes
