---
name: parallel-agents-one-worktree
description: How to brief two Demenova agents running at once in the same git checkout (commit form, build/port ownership, ledger appends, unowned paths)
metadata:
  type: feedback
---

When two agents run in parallel on one branch and one working tree, each brief must say:
- commit with `git commit -m "..." -- <own paths>` so a commit never picks up the other agent's staged files;
- only one agent builds `app/dist` and runs e2e per phase (port 4173); the other looks at a dev server on its own port (5174/5175);
- shared append-only files (ledger, PENDING, HANDOFF): re-read and append again if a write fails.

**Why:** block 3 (2026-11-15, D-033) put product-designer and frontend-engineer in parallel; a shared `app/dist` and
plain `git commit` would mix their work and break the e2e run.

**How to apply:** in every plan with parallel phases, put these three lines in "Rules for every phase". Also check
each new path a brief creates (for example `app/public/about/`, `app/index.html`) against CLAUDE.md §7: unowned paths
need a recorded decision before the work starts, or a proposal (see [[block-3-frontend-upgrade-briefs]]).
QA's run can double as the last phase gate (the builder runs only tsc, Vitest and build) to save one full e2e run.
