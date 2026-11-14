# Handoff log

Newest entry on top. Template in `docs/AGENTS.md` §7. Every person and agent ending a block or shift adds an entry.

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
