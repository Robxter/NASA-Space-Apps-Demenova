# Handoff log

Newest entry on top. Template in `docs/AGENTS.md` §7. Every person and agent ending a block or shift adds an entry.

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
