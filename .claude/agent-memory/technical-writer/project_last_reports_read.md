---
name: last-reports-read
description: Last agent reports and commit the technical-writer processed; start the next run from reports newer than these
metadata:
  type: project
---

Processed through 2026-11-14 23:24 Spain, HEAD f6c6edb (block/1-foundations), for block-0-1.md:
lead-architect/2026-11-14-1844, agronomist/2026-11-14-1930, product-designer/2026-11-14-1932,
data-engineer/2026-11-14-1932 (updated after science review), database-engineer/2026-11-14-2238, science/2026-11-14-2252.
Decisions through D-019; PENDING: only P-007 open.

**Why:** the agent file says read every new report since the last run.
**How to apply:** next run, `git log f6c6edb..HEAD` and read only reports newer than these.

Source gaps noted: database-review counts (1 HIGH + 7 MEDIUM) came only from the main session's brief (no review file
in repo); main-session model is not recorded anywhere, so SI log says "model not recorded". See [[si-log-conventions]].
