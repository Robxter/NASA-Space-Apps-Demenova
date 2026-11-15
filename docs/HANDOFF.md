# Handoff log

Newest entry on top. Template in `docs/AGENTS.md` §7. Every person and agent ending a block or shift adds an entry.

## 2026-11-15 09:35 - Main session (Claude Code) to Roberto: Extract.md filled; live state
State: `Extract.md` (repo root, 19 sections) describes the build that is live, commit 79e05f3 on block/2-core, for
Roberto's claude.ai conversation; 54 screenshots in docs/extract/screenshots/ (9 screens x light/dark x 393/360/1440).
Facts, health checks and screenshots were taken in a separate clean worktree, so block 3 was not interrupted.
Live state checked earlier today: the live app build `index-BA1yB0-Q.js` contains the hCaptcha site key; tapping
"Connect this device for sync" loads the hCaptcha widget (2 frames) with 0 CSP violations; a human has not yet been
recorded completing the box, so sign-in and sync are still unproven. Render did not auto-deploy new commits (no new
build 20 minutes after CI passed on 666cb6a); Roberto deployed by hand with "Clear build cache & deploy".
Health at 79e05f3: pytest 424, Vitest 76, build + size gate green (94.3 kB of 150 kB), provenance and contracts OK.
Block 3 (frontend upgrade, D-033) is in phase B on block/3-polish: see docs/briefs/2026-11-15-frontend-upgrade/.
Waiting on Roberto: tick the hCaptcha box once on the live site and say what it shows; merge + tag; device checklist;
video; submit. After block 3 is QA-green, sections 11 to 13 of Extract.md and the screenshots can be refreshed.

## 2026-11-15 ~11:10 - frontend-engineer to main session: block 3 Phase A done, Gate A green
State: block/3-polish, last green adabfac (tsc, Vitest 79, 95.3 kB gzip, e2e 149 + 3 skipped, @perf 2). Not pushed.
Done: A0 impeccable context + baseline; A1 mobile-native (theme-color per scheme + color-scheme + interactive-widget
in index.html, forced-theme status bar sync, side/bottom insets, tap feel, overscroll, input keyboards); A2 break-ui
(dev-only worst-case fixture app/src/dev/, ?data=worst|empty|one|offline on the dev server; map label collisions +
legend, missing-day message, alert time never truncated; fixture absent from dist); A3 motion/perf audit; A4 harden
(error states say what to do, real sync retry) + clarify (10 of 12 copy rows); A5 pick-ui-library (no library).
CHANGE_LIST: CL-25..CL-28 + CL-07 note appended. Ledger rows for every tool.
For QA: tests/e2e/specs/setup.spec.ts:9 hard-codes the " · " separator in the confidence badge; CL-07 wants a
comma, so the helper needs updating before that change lands (held back for now).
Next: Phase B on the coordinator's message (CHANGE_LIST P1 first, Home -> Map -> Lot ...).

## 2026-11-15 ~08:30 - Main session (Claude Code) to Roberto: Supabase live and seeded
State: schema applied by Roberto (SQL Editor, one transaction) and rls_test.sql passed on the hosted project; demo
farm seeded by the main session (`supabase/seed/seed_demo.py`): provenance 13, farms 1, lots 8, zones 3,
daily_features 495, alert_states 11, alert_events 18. Anon check: views v_farm_status 11, v_lot_history_7d 77,
v_lot_history_90d 495, v_alert_log 18; anon UPDATE of the demo farm refused (42501); email_log not readable by anon.
hCaptcha (D-032): app build index-vy1O5R7E.js is live with the Connect button and no CSP violations, but it was built
WITHOUT `VITE_HCAPTCHA_SITEKEY` (loader absent from every chunk; verified locally that the loader is only bundled when
the key is set), so Connect says "Sync is not configured on this build".
Waiting on Roberto: set VITE_HCAPTCHA_SITEKEY on demenova-app (Render → Environment), Save, then Manual Deploy →
Clear build cache & deploy; then the main session re-runs the live Connect test. Then: merge to main + tag v1.0.0,
device checklist, video, submit.

## 2026-11-15 ~07:45 - Main session (Claude Code) to Roberto: LIVE, waiting on Supabase
State: app and API live and smoke-tested; public docs carry the URLs (4ab7fcb); demo seed script ready (e5c766a).
Live links: app https://demenova-app.onrender.com/ | backend https://demenova-api.onrender.com/health | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Live smoke (headless Edge, 360 px): health ok; CSP/headers ok; Home 1.6 s on 23 Feb; Map tiles, Lot, Strategies,
Alerts, Learn, Settings ok; service worker + offline replay ok; app ships the anon key (role anon).
Failing: Supabase anonymous sign-in (422 anonymous_provider_disabled) → app runs device-only; schema not applied
(PGRST205: no public.farms etc.).
Waiting on Roberto, in order: 1. Supabase → Authentication → Sign In / Providers → allow anonymous sign-ins.
2. Apply the schema (supabase/README.md, SQL Editor, one transaction) and report the rls_test.sql line.
3. Then the main session runs `uv run python supabase/seed/seed_demo.py` (dry run OK: 1 farm, 8 lots, 3 zones,
495 daily features, 11 states, 18 events). After seeding, the first hourly pipeline run on main sends at most 4 DEMO
emails, once each, to ALERT_EMAIL_TO (zone high, lots 1, 2, 7); `/email/test` (X-Admin-Token) shows lot 7's event.
4. Merge block/2-core → main, tag v1.0.0, point Render at main. 5. Device checklist, video
(docs/project-page/video-script.md), submit (docs/project-page/SUBMISSION.md).

## 2026-11-15 ~07:00 - Main session (Claude Code) to Roberto: FEATURE-COMPLETE, ready for freeze
State: all must-haves (D-028) built, reviewed and green on block/2-core (b176218 + this entry), pushed. Nothing live yet.
Live links: app <app URL> (pending deploy) | backend <api URL> (pending) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: engine (T-020..T-024d, science-reviewed), email backend (T-028, security-reviewed), CI +
Render blueprint + headers (T-029), app screens incl. Strategies, data levels 0–2, reliability sheet, level checks
(T-026/T-027/T-042/T-066), contracts 1.2.0 (D-030), domain FIX2 mandate (T-040), guides (T-045), README, CITATIONS,
project page draft, block-2 report (T-030/T-051 part), e2e suite (T-044), claims review fixes (T-050), name scrub (D-031).
Checks: pytest 424; Vitest 67; e2e 149 passed + 2 perf (run alone); size gate 93.1 kB / 150 kB; provenance OK.
Waiting on Roberto, in order:
1. Open the PR block/2-core → main (https://github.com/Robxter/NASA-Space-Apps-Demenova/compare/main...block/2-core),
   check CI is green, merge, tag v1.0.0. (block/0-skeleton and block/1-foundations are contained in block/2-core.)
2. Deploy per docs/DEPLOY.md: GitHub Environment `production` (limited to main) with the 6 secrets; Render Blueprint
   with the listed env vars (app gets only the Supabase anon key); apply the Supabase schema (supabase/README.md).
3. Put the app URL into README.md, docs/project-page/project-page.md and docs/guide/judge-quickstart.md (`<app URL>`).
4. docs/reports/qa/DEVICE_CHECKLIST.md on the iPhone 14 Pro and iPad Air M2; one Lighthouse run on the Render URL.
5. 15:00–19:00 the 30 s video (honest story: no claim that the Feb 2026 flood was predicted; counts only).
6. Submit by 20:00; SI-use description from docs/SI_USE_LOG.md; add a line on any AI video tools used.
Open, accepted for v1: P-016 (email_log unique index, deferred); P-017/T-048 seasonal percentiles (post-hackathon);
no in-app email sign-up (alerts go to ALERT_EMAIL_TO); live hourly ingest/score step is a TODO in pipeline.yml.
Do not touch: .env and api keys.txt.

## 2026-11-15 07:30 - agronomist to main session
State: T-040 done in domain/ (all yaml + review-queue.md + README.md); not committed (no shell). Report
docs/reports/agronomist/2026-11-15-0730.md. Former agronomist no longer named in any domain yaml.
Next for the receiver: 1. `uv run pytest -q` and `python scripts/check_provenance.py`. 2. frontend-engineer reruns
app/scripts/build_domain_snapshots.py (glossary fusarium_r4t now has the one Agrocalidad line, so it is no longer
skipped). 3. thresholds key `review_turnaround` renamed `review_turnaround` (no code reads it).

## 2026-11-15 06:00 - frontend-engineer to main session
State: real-data re-check and T-042 must-haves done on block/2-core (c5c2db4..0f1f9b2); not pushed.
Report docs/reports/frontend-engineer/2026-11-15-0600.md. Checks: tsc clean; Vitest 61; build 92.6 kB gzip initial.
For agronomist (T-040): domain/strategies.yaml and glossary.yaml still name the former agronomist; the app copy
scrubs it (app/scripts/build_domain_snapshots.py). Fix at source, then rerun the script.
Next for the receiver: 1. qa e2e incl. Setup and the reliability sheet. 2. Live Supabase sync test once deployed.

## 2026-11-15 06:15 - data-engineer to data-scientist / main session
State: T-049 done on block/2-core (4c606ad, 8cf2ed1); not pushed.
Done since last handoff: D-029 replay stack at `pipeline/data/processed/replay/2026-01-20_2026-03-05/` (45 days, same
layers/products; POWER hourly `weather/power_hourly_farm_2026-01-20_2026-03-05.csv`); NDVI scaling fixed (values now
in [-1, 1]); demo lot ids now `lot_demo-el-oro_<n>` (same numbers, same geometry). Report docs/reports/data-engineer/2026-11-15-0615.md.
Next for the receiver, in order: 1. data-scientist: set engine STACK to the new dir and re-run the replay (T-049b).
2. data-engineer: delete `replay/2026-02-15_2026-03-05` once the engine no longer reads it.
Do not touch: demo lot geometry (re-running `lots.run()` moves all 8 lots).

## 2026-11-15 04:55 - data-scientist to main session
State: T-020..T-024b done on block/2-core (c39de04, 83d8cf0, 8b1194e, 969e4c8, 7e1f49c, 940cd32); not pushed.
Done since last handoff: engine + demo snapshots in app/public/data/demo (644 KB, all contracts pass; 348 tests);
verification 4 hits / 0 misses / 6 false alarms in 2026; sensitivity not stable at marginal lots (report
docs/reports/data-scientist/2026-11-15-0450.md). Re-run: `uv run python -m pipeline.engine replay`.
Waiting on Roberto: P-014 (thresholds and replay start: the replay is Severe all window for 7 of 8 lots).
Waiting on lead-architect: P-015 (sensitivity field, experimental flag; class B).
Next for the receiver, in order: 1. T-025 scientist-reviewer + code review of 969e4c8..940cd32. 2. data-engineer
T-049 (NDVI layers invalid, > 1; lot ids). 3. frontend: real snapshots replace the fixture; NDVI is null everywhere.
Do not touch: app/public/data/demo by hand (regenerate with the command above).

## 2026-11-15 04:50 - devops-engineer (via main session) to Roberto
State: T-029 committed (0a8024a): ci.yml, pipeline.yml (hourly; live ingest/score step is a marked, never-run TODO),
render.yaml (Static Site app + free Web Service API), scripts/check_bundle_size.mjs, docs/DEPLOY.md. Nothing live yet.
Waiting on Roberto: follow docs/DEPLOY.md: push, GitHub secrets (EARTHDATA_USERNAME/PASSWORD, SUPABASE_URL,
SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, ALERT_EMAIL_TO), Render Blueprint with the listed env vars; apply schema.
Next for the receiver: record the two public URLs here and in README.md; run the pipeline once from Actions after main.

## 2026-11-15 04:34 - api-engineer to main session
State: T-028 done on block/2-core (backend FastAPI + Severe email with dedupe); not pushed.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: backend/app/{main,alerts,email,supabase,settings,ids}.py, 39 tests; report
docs/reports/api-engineer/2026-11-15-0434.md. Full suite 305 passed; provenance OK.
Waiting on Roberto: Render env vars ADMIN_TOKEN, RESEND_API_KEY, ALERT_EMAIL_TO, SUPABASE_URL,
SUPABASE_SERVICE_ROLE_KEY (+ optional APP_BASE_URL, ALERT_EMAIL_FROM_NAME). lead-architect: P-013 (class B).
Next for the receiver, in order: 1. ECC security-reviewer on backend/. 2. devops T-029: Render service; pipeline
workflow runs `uv run python -m backend.app.alerts` after Scoring. 3. After T-024 is in Supabase: send the real
demo Severe email to Roberto's inbox and film it.

## 2026-11-15 00:45 - Main session (Claude Code) to Roberto and the next session (PAUSED at the usage limit)
State: Phase 2 paused on block/2-core: Opus 5-hour limit hit ~00:15, resets 03:30 Spain. FIX2.md applied (solo build).
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: frontend T-026/T-027 (2ea3983, d0acc61); engine T-020 (c39de04), T-021/T-022 (83d8cf0),
T-023 (8b1194e); FIX2: Roster→Roberto, the former team agronomist tasks closed, answers archived (domain/agronomist-answers-archive.md),
review queue → domain/review-queue.md, DATA_POLICY §4–§5, CLAUDE.md §13, agent files, D-021..D-028; P-007 closed (D-024).
Paused agents (resume with SendMessage, their context is kept): data-scientist mid-T-024 (uncommitted
pipeline/engine/verification.py + test_side_and_verification.py: leave them for it); api-engineer T-028 (nothing written).
Waiting on Roberto: apply schema to Supabase; open PRs to main. (Members tab: done by Roberto, 15 Nov.)
Next for the receiver, in order: 1. After 03:30 resume data-scientist: finish T-024, then T-024b sensitivity check
(D-024; weights origin `design`), snapshots to app/public/data/demo/. 2. Resume api-engineer T-028. 3. Then:
scientist-reviewer + one code review on the engine; frontend re-check against real snapshots; devops T-029.
4. FIX2 follow-ups for agents: agronomist T-040 (domain YAMLs still say the former team agronomist/approved_by; reviewed_by/human_review
fields); lead-architect class B: contract text in models.py/schemas mentioning the former team agronomist, `reviewed_by`/`human_review`
on domain items; data-engineer: demo_lots `to_be_redefined_by: future-local-agronomist`; engine comments mention the former team agronomist.
Do not touch: contracts without lead-architect; .env and api keys.txt.

## 2026-11-14 23:55 - frontend-engineer to main session
State: T-026 and T-027 done on block/2-core (2ea3983); not pushed. Report docs/reports/frontend-engineer/2026-11-14-2355.md.
Done since last handoff: hash nav, context state, en/es dictionaries, snapshot loader with IndexedDB offline copy,
lazy Supabase identity, replay scrubber, Home/Map/Lot/Alerts/Settings, units.ts, PWA follow-ups from T-016b.
Checks: tsc clean; Vitest 36 passed; build OK, initial JS 86.3 kB gzip; provenance OK.
Waiting on data-scientist: app/public/data/demo/ snapshots (T-024); until then `vite dev` shows a synthetic fixture
with a "Development fixture" notice, and production shows "snapshot not available" (no invented values).
For product-designer: origin badge into ui/Value; Segmented, TabBar, Sheet into ui; map colours for wetness/rain.
Next for the receiver, in order: 1. Load real snapshots and re-check 360 px. 2. T-042. 3. qa e2e (T-044).
Do not touch: app/src/components/DataValue.tsx semantics (unknown origin renders as missing).

## 2026-11-14 19:32 - data-engineer to main session
State: T-010/T-011/T-012/T-019 done, T-014 partial, T-013 blocked on Earthdata credentials; all work uncommitted.
Done since last handoff: datasets.yaml verified (16 sourced); pysheds added; AOI + 252.7 km² catchment; 8 synthetic lots;
POWER daily/hourly; S2 NDVI; replay stack (no rain/soil yet). Report docs/reports/data-engineer/2026-11-14-1932.md.
Waiting on Roberto: P-005 (Earthdata keys in .env), P-007 (demo flood date).
Next for the receiver, in order: 1. Review/commit. 2. After P-005: `uv run python -m pipeline.ingest imerg`, then `replay`.
3. agronomist merges processed/aoi/demo_lots.geojson into domain/farm.json.
Do not touch: pipeline/data/raw (git-ignored cache, ~80 MB SRTM tiles).

## 2026-11-14 19:30 - agronomist to main session
State: T-017 domain files drafted (all unapproved except the former team agronomist's 2 days / 70 cm); review queue ready for the former team agronomist tonight.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: domain/{thresholds,practices,strategies,actions,glossary,flood_memories}.yaml,
domain/review-queue.md (Spanish, Q-01..Q-19); P-004 (unreadable Sigatoka/heat-unit PDFs, values kept estimated).
Waiting on Roberto: run `uv run pytest -q` and `python scripts/check_provenance.py`; P-004.
Next for the receiver, in order: 1. Run checks. 2. Send queue to the former team agronomist. 3. After T-012 geometry, agronomist writes
domain/farm.json lot attributes (null unless sourced, origin synthetic, to_be_redefined_by the former team agronomist).
Do not touch: domain/ approvals (only the former team agronomist's answers, via agronomist-answers-archive.md, set approved_by).

## 2026-11-14 23:45 - Main session (Claude Code) to Roberto (morning) and next session
State: Phase 1 complete on block/1-foundations (stacked on block/0-skeleton); all reviews' findings fixed.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: rain history rebuilt on one product (IMERG Early); SMAP recommended-only (0 days); outlet on
OSM river; schema approved (D-018) and 79/79 RLS checks pass on local Postgres 18.7 (supabase/tests/run_local.ps1);
telegram_code in contracts 1.1.0 (D-020); D-014..D-019 recorded; block 0+1 report docs/reports/blocks/block-0-1.md.
Checks: pytest 183 passed; contracts in sync; provenance OK.
Waiting on Roberto: apply schema to Supabase (supabase/README.md) and report the RLS test line; open PR(s) to main.
Next for the receiver, in order: 1. Phase 2 (block/2-core): data-scientist engine T-020..T-024 + frontend-engineer
shell T-026/T-027, then api-engineer T-028 and devops T-029 (max 2 agents at a time). 2. Do not calibrate on rain until
P-007 answers; SMAP not used (D-019). 3. Engine review: scientist-reviewer + one code review.
Do not touch: contracts without lead-architect; .env and api keys.txt (git-ignored, never read into reports).

## 2026-11-14 23:00 - Main session (Claude Code) to the former team agronomist (turno de noche)
Estado: fase 1 casi completa en la rama block/1-foundations (commit d22c638). Sin enlace de la app todavía (domingo).
Para revisar esta noche, en orden:
1. `domain/review-queue.md` (19 preguntas, Q-01..Q-19). Las más urgentes: Q-01 (¿el daño empieza a los 2 días
   de encharcamiento o después de más de 2?) y Q-06 (¿5 = menor costo y menos mano de obra?).
2. Fecha real de la inundación de demostración (P-007). **Corrección 23:10:** la lista de 15 eventos y las cifras de
   lluvia que había aquí NO son comparables (mezclan dos productos IMERG distintos antes y después de oct 2025; revisión
   científica B1). No las uses para decidir; se recalculan con un solo producto y te llegan corregidas.
   Pregunta, sin depender de cifras: según lo que tú sabes, ¿qué fecha se inundó de verdad la zona Pasaje/Buenavista:
   22–23 feb 2026, 27–28 feb 2025 o 9 jun 2026 (las dos últimas aparecen en prensa)? ¿Recuerdas otras inundaciones con fecha?
   **Cifras corregidas (00:00, un solo producto: IMERG Early diario, días UTC; 1.233 eventos desde 2015):**
   - 22–24 feb 2026: 74,2 mm (se solapa con el evento 23–25 feb 2026: 84,6 mm, puesto 19).
   - 27 feb–1 mar 2025: 91,8 mm (evento 11).   - 7–9 jun 2026: 81,8 mm (evento 23).
   Lista completa de los 15 mayores: `pipeline/data/processed/rain/top15_72h_events.csv`. ¿Cuáles inundaron fincas?
3. Logo: tres opciones en `design/logo/options-sheet.png` (recomendada la 1, "Core").
Nada de esto cambia el plazo: entrega el domingo 15 a las 20:00 (hora de España).

## 2026-11-14 19:05 - Main session (Claude Code) to Roberto
State: Phase 0 complete and pushed on block/0-skeleton; review (1 HIGH, 6 MEDIUM) fixed with regression tests.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: tree + READMEs, openapi.yaml, config stubs (all null/pending), app scaffold (build green),
ADR-001..005, provenance checker hardened (CSV, sidecars, refs, numeric strings, pending origins); SPEC diagrams
transcribed from the Claude Doc (P-001 resolved). Checks: pytest 148 passed; checker OK; contracts in sync; app build OK.
Waiting on Roberto: P-002 (Telegram farm code), P-003 (nullable country/province/canton); open the PR to main;
claude-mem Gemini key; FreeLLMAPI installer; OmniRoute removal.
Next for the receiver, in order: 1. Phase 1 wave A (data-engineer + agronomist). 2. Wave B. 3. Checkpoint A.
Do not touch: contracts without lead-architect (CONTRACTS.md §9).

## 2026-11-14 18:40 - Main session (Claude Code) to Roberto
State: FIX.md applied except the steps only Roberto can finish; phase 0 resumes from 3a37c2b after the restart.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: Ponytail (lite) installed; claude-mem installed off-plan (gemini, chill, no telemetry); Node
22.23.5 + Bun 1.4.4 added; FreeLLMAPI installer downloaded and digest-verified (unsigned, not run). D-010..D-012 logged.
Waiting on Roberto: claude-mem setup page http://127.0.0.1:37774/?setup=1 with a Gemini key (never "Anthropic plan");
run or skip the FreeLLMAPI installer; remove OmniRoute (`npm uninstall -g omniroute`) or keep; restart with scripts/start.ps1.
Next for the receiver, in order: 1. Confirm "lite" shows at startup. 2. Resume phase 0 (lead-architect). 3. Phase 1 wave A.
Do not touch: committed phase 0 files except to complete them.

## 2026-11-14 18:15 - Main session (Claude Code) to the former team agronomist (plan change)
Resumen para el exagrónomo del equipo: el límite de uso de Claude retrasó la fase 0 unas tres horas. Esta noche no habrá enlace de vista
previa de la app; pasa al domingo por la mañana. Para tu turno de noche tendrás, hacia las 23:30 (hora de España):
la cola de revisión `domain/review-queue.md` (en español), la lista de las 15 lluvias de 72 h más fuertes aguas
arriba para que marques cuáles inundaron, y las tres opciones de logo. El plazo de entrega no cambia (domingo 20:00).

## 2026-11-14 17:55 - Main session (Claude Code) to Roberto
State: Applying FIX.md; phase 0 status: partial, checkpoint commit 3a37c2b on block/0-skeleton.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: SPEC.md exported from the Claude Doc; git initialised; kit pushed (8866698). Phase 0 partial
(lead-architect hit the Fable 5-hour limit twice): 31 JSON Schemas, pipeline/common/models.py, app/src/types/contracts.ts,
scripts/check_provenance.py + tests/test_provenance.py (94 passed), scripts/export_contracts.py, pyproject.toml + uv.lock,
.gitignore. Phase 0 still missing: folder READMEs, openapi.yaml, config stubs, ADR-001..004, app scaffold + build, TASKS.md phase 1.
Waiting on Roberto: FIX.md steps 4-6 (Ponytail, Node upgrade + claude-mem key, FreeLLMAPI decision).
Next for the receiver, in order: 1. Finish FIX.md. 2. Restart with scripts/start.ps1. 3. Resume phase 0 from 3a37c2b.
Do not touch: committed phase 0 files except to complete them.

## 2026-11-14 - Claude (claude.ai) to Roberto
State: agent kit, spec and data policy ready; repository empty except the kit.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: CLAUDE.md, 14 agents, AGENTS.md, WORKFLOW.md, DATA_POLICY.md, CONTRACTS.md draft, TASKS.md, launchers.
Waiting on Roberto: Step 0 accounts; export SPEC.md from the Claude Doc.
Next for the receiver, in order: 1. WORKFLOW Step 0 and Step 1. 2. Start orchestrator. 3. Phase 0 prompt.
Do not touch: nothing yet.
