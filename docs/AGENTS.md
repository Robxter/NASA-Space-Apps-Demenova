# Demenova agent system

14 custom agents in `.claude/agents/`, plus ECC's reviewers, coordinated by the **main Claude Code session**
(the orchestrator) under Roberto's direction. Roberto is the only human on the team since 14 Nov 2026 (D-021,
D-022): product owner, builder, final approver and device tester. There is no human domain expert; nothing waits on
anyone but Roberto (CLAUDE.md §13).

## 1. Agent roster

| # | Agent | Folder | Owns | Writes code? | Memory |
| --- | --- | --- | --- | --- | --- |
| 1 | lead-architect | core | Skeleton, contracts, ADRs, class B approvals | Phase 0 only | project |
| 2 | data-engineer | backend | Downloads, cache, harmonized 30 m grid, AOIs, demo lot geometry | Yes | project |
| 3 | data-scientist | backend | Features, alert index, state machine, AHP, calibration, replay snapshots | Yes | project |
| 4 | database-engineer | backend | Supabase schema, RLS, anonymous identity, views | Yes | none |
| 5 | api-engineer | backend | FastAPI, Resend email, Telegram bot | Yes | none |
| 6 | devops-engineer | backend | CI, hourly pipeline, Render, secrets map, size budget | Yes | none |
| 7 | frontend-engineer | frontend | App logic, data layer, offline, data levels, units, i18n | Yes | none |
| 8 | product-designer | frontend | Identity, logo, tokens, UI components, motion | Yes (styles, ui) | project |
| 9 | scientist-reviewer | validation | Formula and claim verification | No (reports) | none |
| 10 | agronomist | validation | Domain tables, strategies, actions; sourced or labelled "not reviewed" (D-025) | Data files | project |
| 11 | qa-demo-engineer | validation | Playwright, replay acceptance, device checklist | Tests only | none |
| 12 | technical-writer | docs | Block reports, SI-use log, citations, project page | Docs | project |
| 13 | agent-ops-engineer | docs | Briefs from vague requests, audits, proposals | Briefs only | project |
| 14 | instructor | docs | User guides, judge quick start, Learn cards | Docs | none |

**ECC agents reused** (plugin, invoked by their ECC names or commands): planner (`/ecc:plan`), code-reviewer
(`/code-review`), security-reviewer (`/security-scan`), database-reviewer, python-reviewer (`/python-review`),
typescript-reviewer, build-error-resolver (`/build-fix`), and the `tdd-workflow` skill for the engine.
Custom names never reuse an ECC name.

## 2. Models and effort

- NORMAL mode (default, `scripts/start.ps1`): every custom agent has `model: opus` (Claude Opus 5.5); the main
  session runs on Opus 5.5. Effort: `xhigh` for lead-architect, data-scientist and scientist-reviewer; `high` for all
  others. scientist-reviewer, technical-writer, instructor and agent-ops-engineer also have `maxTurns: 40`.
- ENERGY mode (`scripts/start-energy.ps1`): sets `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` and
  `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`, so every subagent runs on Sonnet; main session on Opus 5.5.
  Agent files are never edited to switch modes. (D-008, replacing D-000)
- If Claude Code warns that an effort level is unavailable for a model, it falls back for that run; report it to
  agent-ops-engineer, who proposes a lower effort for that agent if the warning persists.
- `/tasks` shows which model and effort each running subagent uses.

## 3. Orchestration protocol (main session)

The main session is the only place that talks to Roberto. Delegation is flat
(`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`): main session → agent, never agent → agent.

For every block:
1. Read `TASKS.md`, `docs/HANDOFF.md`, `docs/decisions/PENDING.md`.
2. Run `/ecc:plan` for the block, aligned with `docs/WORKFLOW.md`. Show the plan to Roberto.
3. Launch agents as the plan says; agents with disjoint owned paths may run in parallel in the background.
4. When an agent finishes: read its report; turn blockers into TASKS.md items; route reviews
   (engine → scientist-reviewer + code-reviewer; schema → database-reviewer; backend → security-reviewer).
5. Read PENDING.md; ask Roberto every class A question in one batch, with the options and a recommendation.
6. Run technical-writer for the block report; update HANDOFF.md; commit.

## 4. Approval flow

| Class | What | Who approves | How |
| --- | --- | --- | --- |
| A | New/upgraded dependencies, DB schema, alert weights and thresholds, data-policy or Rule-zero changes, data-source substitutions, high-importance agent-file changes | Roberto | Agent writes PENDING.md entry and stops that branch; main session asks Roberto |
| B | Low-importance agent-file changes (wording, clarity, examples, formatting); backward-compatible contract additions | lead-architect | Lead applies and logs in DECISIONS.md |
| C | Everything inside an agent's own paths that is not A or B | Owning agent | Reported in its run report |

Agent-file change path (Roberto's rule): agent-ops-engineer writes a proposal → main session runs lead-architect →
low importance: lead approves and applies (class B) → high importance: PENDING.md → main session asks Roberto.
When in doubt it is class A.

## 5. Routing: who does what

| Request | Agent(s), in order |
| --- | --- |
| "Add a dataset" / "data looks wrong" | data-engineer → scientist-reviewer |
| "Change how risk is computed" | data-scientist → scientist-reviewer → agronomist (sense check) |
| "New screen / behaviour" | frontend-engineer (+ product-designer for look) → qa-demo-engineer |
| "Make it look less chunky / less AI" | agent-ops-engineer (brief) → product-designer → frontend-engineer → qa |
| "Email/Telegram broken" | api-engineer → security-reviewer |
| "Deploy / CI red" | devops-engineer (or `/build-fix`) |
| "Schema change" | database-engineer → database-reviewer → Roberto (class A) |
| "Agronomic text / strategies" | agronomist → scientist-reviewer (items stay `human_review: none`; open questions go to domain/review-queue.md for a future local agronomist) |
| "Write the report / project page" | technical-writer |
| "User guide" | instructor |
| "An agent keeps doing X wrong" | agent-ops-engineer (audit + proposal) → lead-architect |

## 6. Report template (every agent, every run)

File: `docs/reports/<agent>/<YYYY-MM-DD-HHmm>.md`

```markdown
# <agent> report <YYYY-MM-DD HH:mm Spain>
Model/effort: <opus xhigh | opus high | sonnet ...>   Task IDs: <T-...>   Branch: <...>
## Done
- <change> (<files>) (<commit>)
## Data and provenance
- New data files / values introduced, with origin (sourced | calibrated | estimated | synthetic | provided | pending)
## Tests and checks
- <command> → <result>
## Decisions
- Class C taken: ...   Class A/B raised: <PENDING.md / proposal id>
## Open issues and risks
- ...
## Next steps for <agent or Roberto>
- ...
```
Reports are in English only (D-026).

## 7. Handoff template (`docs/HANDOFF.md`, newest entry on top)

```markdown
## <YYYY-MM-DD HH:mm Spain> - <who is handing off> to <who>
State: <one sentence>
Live links: app <url> | backend <url> | repo <url>
Done since last handoff: ...
Waiting on Roberto: <PENDING ids>
Next for the receiver, in order: 1. ... 2. ...
Do not touch: ...
```

## 8. Agent memory

Agents with `memory: project` keep notes in `.claude/agent-memory/<agent>/MEMORY.md` (committed). Standing notes:
- agronomist: "The synthetic demo farm is final for v1. Questionnaire 5.1–5.10 is closed; its defaults are the v1
  values, tagged estimated (D-023)."
- lead-architect: conventions and ADR index.
- data-engineer: verified dataset identifiers.
- product-designer: what was tried and rejected.
