# SI (AI) disclosure

Demenova was built for the 2026 NASA Space Apps Challenge with SI (artificial intelligence) assistance.

- Code: the pipeline, engine, backend, app, tests and scripts in this repository were generated with Claude Code
  (Anthropic), working as a team of specialised agents (definitions in `.claude/agents/`), and reviewed by AI review
  agents (scientific, security, code). Commits made by those agents are in the git history.
- Data: every processed data file and demo snapshot was produced by that SI-generated code. Each provenance record
  (`*.provenance.json`, and the `provenance` blocks inside the demo snapshots) names the producing agent in `agent` and
  the code in `code_commit` (docs/DATA_POLICY.md §3). Source datasets are NASA and partner data (docs/CITATIONS.md);
  no value was invented (docs/DATA_POLICY.md, Rule zero).
- Text and design: documentation, guides, the welcome page, Instructions.pdf and the design system were drafted with
  SI tools (Claude; design skills by Emil Kowalski, Impeccable and Taste, run by Claude Code).
- Human role: Roberto (Cristian Roberto Terán Paredes) chose the problem, area and scope, made every product and
  approval decision (docs/decisions/DECISIONS.md), created the accounts and deployed the app.
- Full log of what SI produced and what Roberto decided: `docs/SI_USE_LOG.md`.
