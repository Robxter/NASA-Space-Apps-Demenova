---
name: last-reports-read
description: Last agent reports and commit the technical-writer processed; start the next run from reports newer than these
metadata:
  type: project
---

Processed through 2026-11-15 14:30 Spain, block/2-core HEAD 886d9a9 (my commits after it: e93d5d4, 16088a2, f7f8fe1,
73226ac, 328e359), for block-2.md: data-scientist 0450/0510, data-engineer 0615, frontend 2355 (14 Nov)/0600,
api-engineer 0434, devops 0444, lead-architect 0536, agronomist 0730, instructor 1400, science 0356-t025-engine.
Decisions through D-030; PENDING open: P-016, P-017 (QA added P-018 later, not read).

**Why:** the agent file says read every new report since the last run.
**How to apply:** next run, `git log 328e359..HEAD` and read only newer reports (start with docs/reports/qa/).

Source gaps: no security-review file (use commits a46d5ae, f0635be); Kirpich/Saaty URLs not recorded; former
agronomist must never be named (D-027) — earlier SI log rows were anonymised. See [[si-log-conventions]].
