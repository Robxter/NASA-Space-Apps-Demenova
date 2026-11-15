---
name: last-reports-read
description: Last reports and commits the technical-writer processed; start the next run after these
metadata:
  type: project
---

Processed through block 3 (`block/3-polish`, head 143fb1a): product-designer 2026-11-15-0925/-0950/-1105, qa
2026-11-15-1005/-1020/-1110, frontend-engineer HANDOFF entries of 15 Nov, briefs 00-plan.md. Block report f501e3b,
SI log aa0b416.

**Why:** avoid re-reading old reports (token budget, CLAUDE.md §11).
**How to apply:** next run, read only reports and commits newer than 143fb1a. Note: frontend-engineer HANDOFF times
use the plan clock, not the machine clock; use git commit times for SI log rows.
