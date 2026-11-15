---
name: shared-checkout-commits
description: In Demenova's shared checkout, committing a file another agent is also editing sweeps in their uncommitted lines; how to commit only your own hunks
metadata:
  type: feedback
---

Before `git commit -- <file>` on a file another agent may be editing (screens, App.tsx, nav.ts, i18n), run
`git diff -- <file>` and check that every hunk is yours. If not, commit through the index only: build the file as
"HEAD version + my lines" in a temp file, `git hash-object -w <tmp>`, `git update-index --cacheinfo 100644,<hash>,<path>`,
then `git commit` without a pathspec (after checking `git diff --cached --name-only` holds only that path).

**Why:** 2026-11-15, block 4: my `b99c9c3` committed frontend-engineer's unstaged Email/Telegram lines in `Other.tsx`,
referencing an untracked file, so the branch did not build from a clean checkout; fixed in `3cbe88e` via the index.

**How to apply:** any time the coordinator says another agent works "in parallel in the same checkout". Also: build to a
temp `--outDir` instead of `app/dist` when frontend-engineer or QA may be serving it.
Related: [[screenshot-tooling]]
