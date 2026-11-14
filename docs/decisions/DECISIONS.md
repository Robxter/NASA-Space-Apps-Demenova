# Decisions log

Architecture decision records (ADR-nnn) by lead-architect and approved class A/B decisions. Newest first.

| ID | Date | Class | Decision | Reason | Approved by |
| --- | --- | --- | --- | --- | --- |
| D-009 | 2026-11-14 | A | Context diet (FIX.md §3): SPEC split into `docs/spec/` by `scripts/split_spec.py` (SPEC.md stays the full source); every agent's "Read first" names only its spec files per the FIX.md table, plus CONTRACTS/DATA_POLICY once per session, only touched sections; CLAUDE.md §11 token rules and §12 Ponytail precedence; settings.json env `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=2` and `PONYTAIL_DEFAULT_MODE=lite`. Note: the concurrency variable was not checked against Claude Code docs in this run; the §11 rule "at most 2 subagents" enforces the limit either way | Two Fable usage-limit stops; agents re-read the whole SPEC every run | Roster (FIX.md) |
| D-008 | 2026-11-14 | A | Supersedes D-000. Every agent `model: opus` (Opus 5.5); effort `xhigh` for lead-architect, data-scientist, scientist-reviewer, `high` for the rest; `maxTurns: 40` for scientist-reviewer, technical-writer, instructor, agent-ops-engineer. Launchers: `scripts/start.ps1` (normal) replaces `start-max.ps1`; `scripts/start-energy.ps1` forces Sonnet subagents. CLAUDE.md §10 and AGENTS.md §2 updated | Fable 5-hour limit hit twice during phase 0 | Roster (FIX.md) |
| D-000 | 2026-11-14 | A | (Superseded by D-008) All custom agents on Fable 5.2 at effort max; energy mode forces Opus 5.5 via environment variables | Roster: "every agent at max development"; Opus 5.5 as energy saving | Roster |
| D-001 | 2026-11-14 | A | AI-engineer changes go through lead-architect: low importance approved by lead, else Roster | Roster, questionnaire 4.4 | Roster |
| D-002 | 2026-11-14 | A | Units: metric default, imperial display toggle for judges; storage always SI | Roster, questionnaire 3.6 | Roster |
| D-003 | 2026-11-14 | A | No login in v0; device identity via Supabase anonymous sign-in; local-only fallback | Roster, questionnaire 2.7 | Roster |
| D-004 | 2026-11-14 | A | Farm data stored on device and in Supabase; Full and Data-saver storage modes | Roster, questionnaire 2.8 | Roster |
| D-005 | 2026-11-14 | A | Demo lots created by an agent as synthetic; Tyson redefines them later | Roster, questionnaire 3.9 | Roster |
| D-006 | 2026-11-14 | A | Tasks tracked in both GitHub Issues and TASKS.md | Roster, questionnaire 4.7 | Roster |
| D-007 | 2026-11-14 | A | Domain visionai.one available for email only if needed and approved | Roster, questionnaire 1.10 | Roster |
