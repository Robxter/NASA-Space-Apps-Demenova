---
name: si-log-conventions
description: How the main session wants SI_USE_LOG rows written (models per period, counts not percentages, owned files only)
metadata:
  type: feedback
---

SI log rows: time = commit/report time (Spain); model = Fable 5.2 only for the two phase 0 attempts that hit the usage
limit, Opus 5.5 for agents after D-008; verification as counts, never percentages. When lead-architect runs in
parallel, write only docs/reports/blocks/, docs/SI_USE_LOG.md and CHANGELOG.md, and do not commit.

**Why:** main session brief for T-030 (2026-11-14); Rule zero forbids unsourced numbers.
**How to apply:** every block report run; if a model or count has no file source, write "not recorded" and flag it.
