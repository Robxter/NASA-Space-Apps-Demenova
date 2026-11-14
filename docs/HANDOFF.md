# Handoff log

Newest entry on top. Template in `docs/AGENTS.md` §7. Every person and agent ending a block or shift adds an entry.

## 2026-11-14 19:32 - data-engineer to main session
State: T-010/T-011/T-012/T-019 done, T-014 partial, T-013 blocked on Earthdata credentials; all work uncommitted.
Done since last handoff: datasets.yaml verified (16 sourced); pysheds added; AOI + 252.7 km² catchment; 8 synthetic lots;
POWER daily/hourly; S2 NDVI; replay stack (no rain/soil yet). Report docs/reports/data-engineer/2026-11-14-1932.md.
Waiting on Roster: P-005 (Earthdata keys in .env), P-007 (demo flood date).
Next for the receiver, in order: 1. Review/commit. 2. After P-005: `uv run python -m pipeline.ingest imerg`, then `replay`.
3. agronomist merges processed/aoi/demo_lots.geojson into domain/farm.json.
Do not touch: pipeline/data/raw (git-ignored cache, ~80 MB SRTM tiles).

## 2026-11-14 19:30 - agronomist to main session
State: T-017 domain files drafted (all unapproved except Tyson's 2 days / 70 cm); review queue ready for Tyson tonight.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: domain/{thresholds,practices,strategies,actions,glossary,flood_memories}.yaml,
domain/tyson-review-queue.md (Spanish, Q-01..Q-19); P-004 (unreadable Sigatoka/heat-unit PDFs, values kept estimated).
Waiting on Roster: run `uv run pytest -q` and `python scripts/check_provenance.py`; P-004; paste the queue to Tyson.
Waiting on Tyson: tyson-review-queue Q-01..Q-19 (biosecurity draft Q-17 never shown until he approves, T-062).
Next for the receiver, in order: 1. Run checks. 2. Send queue to Tyson. 3. After T-012 geometry, agronomist writes
domain/farm.json lot attributes (null unless sourced, origin synthetic, to_be_redefined_by Tyson).
Do not touch: domain/ approvals (only Tyson's answers, via tyson-answers.md, set approved_by).

## 2026-11-14 23:45 - Main session (Claude Code) to Roster (morning) and next session
State: Phase 1 complete on block/1-foundations (stacked on block/0-skeleton); all reviews' findings fixed.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: rain history rebuilt on one product (IMERG Early); SMAP recommended-only (0 days); outlet on
OSM river; schema approved (D-018) and 79/79 RLS checks pass on local Postgres 18.7 (supabase/tests/run_local.ps1);
telegram_code in contracts 1.1.0 (D-020); D-014..D-019 recorded; block 0+1 report docs/reports/blocks/block-0-1.md.
Checks: pytest 183 passed; contracts in sync; provenance OK.
Waiting on Roster: apply schema to Supabase (supabase/README.md) and report the RLS test line; open PR(s) to main.
Waiting on Tyson: P-007 real flood date; review queue Q-01..Q-19 (Q-01, Q-06 first).
Next for the receiver, in order: 1. Phase 2 (block/2-core): data-scientist engine T-020..T-024 + frontend-engineer
shell T-026/T-027, then api-engineer T-028 and devops T-029 (max 2 agents at a time). 2. Do not calibrate on rain until
P-007 answers; SMAP not used (D-019). 3. Engine review: scientist-reviewer + one code review.
Do not touch: contracts without lead-architect; .env and api keys.txt (git-ignored, never read into reports).

## 2026-11-14 23:00 - Main session (Claude Code) to Tyson (turno de noche)
Estado: fase 1 casi completa en la rama block/1-foundations (commit d22c638). Sin enlace de la app todavía (domingo).
Para revisar esta noche, en orden:
1. `domain/tyson-review-queue.md` (19 preguntas, Q-01..Q-19). Las más urgentes: Q-01 (¿el daño empieza a los 2 días
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

## 2026-11-14 19:05 - Main session (Claude Code) to Roster
State: Phase 0 complete and pushed on block/0-skeleton; review (1 HIGH, 6 MEDIUM) fixed with regression tests.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: tree + READMEs, openapi.yaml, config stubs (all null/pending), app scaffold (build green),
ADR-001..005, provenance checker hardened (CSV, sidecars, refs, numeric strings, pending origins); SPEC diagrams
transcribed from the Claude Doc (P-001 resolved). Checks: pytest 148 passed; checker OK; contracts in sync; app build OK.
Waiting on Roster: P-002 (Telegram farm code), P-003 (nullable country/province/canton); open the PR to main;
claude-mem Gemini key; FreeLLMAPI installer; OmniRoute removal.
Next for the receiver, in order: 1. Phase 1 wave A (data-engineer + agronomist). 2. Wave B. 3. Checkpoint A.
Do not touch: contracts without lead-architect (CONTRACTS.md §9).

## 2026-11-14 18:40 - Main session (Claude Code) to Roster
State: FIX.md applied except the steps only Roster can finish; phase 0 resumes from 3a37c2b after the restart.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: Ponytail (lite) installed; claude-mem installed off-plan (gemini, chill, no telemetry); Node
22.23.5 + Bun 1.4.4 added; FreeLLMAPI installer downloaded and digest-verified (unsigned, not run). D-010..D-012 logged.
Waiting on Roster: claude-mem setup page http://127.0.0.1:37774/?setup=1 with a Gemini key (never "Anthropic plan");
run or skip the FreeLLMAPI installer; remove OmniRoute (`npm uninstall -g omniroute`) or keep; restart with scripts/start.ps1.
Next for the receiver, in order: 1. Confirm "lite" shows at startup. 2. Resume phase 0 (lead-architect). 3. Phase 1 wave A.
Do not touch: committed phase 0 files except to complete them.

## 2026-11-14 18:15 - Main session (Claude Code) to Tyson (plan change)
Resumen para Tyson: el límite de uso de Claude retrasó la fase 0 unas tres horas. Esta noche no habrá enlace de vista
previa de la app; pasa al domingo por la mañana. Para tu turno de noche tendrás, hacia las 23:30 (hora de España):
la cola de revisión `domain/tyson-review-queue.md` (en español), la lista de las 15 lluvias de 72 h más fuertes aguas
arriba para que marques cuáles inundaron, y las tres opciones de logo. El plazo de entrega no cambia (domingo 20:00).

## 2026-11-14 17:55 - Main session (Claude Code) to Roster
State: Applying FIX.md; phase 0 status: partial, checkpoint commit 3a37c2b on block/0-skeleton.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: SPEC.md exported from the Claude Doc; git initialised; kit pushed (8866698). Phase 0 partial
(lead-architect hit the Fable 5-hour limit twice): 31 JSON Schemas, pipeline/common/models.py, app/src/types/contracts.ts,
scripts/check_provenance.py + tests/test_provenance.py (94 passed), scripts/export_contracts.py, pyproject.toml + uv.lock,
.gitignore. Phase 0 still missing: folder READMEs, openapi.yaml, config stubs, ADR-001..004, app scaffold + build, TASKS.md phase 1.
Waiting on Roster: FIX.md steps 4-6 (Ponytail, Node upgrade + claude-mem key, FreeLLMAPI decision).
Waiting on Tyson: questionnaire 5.1-5.10; his doc Tasks 5-7.
Next for the receiver, in order: 1. Finish FIX.md. 2. Restart with scripts/start.ps1. 3. Resume phase 0 from 3a37c2b.
Do not touch: committed phase 0 files except to complete them.

## 2026-11-14 - Claude (claude.ai) to Roster
State: agent kit, spec and data policy ready; repository empty except the kit.
Live links: app (none yet) | backend (none yet) | repo https://github.com/Robxter/NASA-Space-Apps-Demenova
Done since last handoff: CLAUDE.md, 14 agents, AGENTS.md, WORKFLOW.md, DATA_POLICY.md, CONTRACTS.md draft, TASKS.md, launchers.
Waiting on Roster: Step 0 accounts; export SPEC.md from the Claude Doc.
Waiting on Tyson: questionnaire 5.1-5.10; his doc Tasks 5-7; costs and labour for strategies.
Next for the receiver, in order: 1. WORKFLOW Step 0 and Step 1. 2. Start orchestrator. 3. Phase 0 prompt.
Do not touch: nothing yet.
