---
name: project-domain-conventions
description: How domain/ items are tagged after T-040 (label placement, task id T-065, flood memories, biosecurity line)
metadata:
  type: project
---

Since T-040 (2026-11-15): every domain item has `reviewed_by: [agronomist-agent, scientist-reviewer]`,
`human_review: none`, `approved_by: null`. The label "General guidance — not reviewed by an agronomist" goes in
`reason` for DomainMeta items and at the end of `gaps` (es/en) for strategies (Strategy has no reason field).
All `estimated` items use task_id T-065 (agent sourcing task; T-060/T-061 are closed). FloodMemory has no review
fields (extra=forbid) and holds only 4 press-documented floods with farm_id farm_demo-el-oro. The only TR4 text is
glossary `fusarium_r4t` (one neutral Agrocalidad line).

**Why:** FIX2 §5 / D-025: no human agronomist; nothing may wait on a human.
**How to apply:** keep keys stable (frontend reads strategies/actions); add new items with the same tags. See
[[reference-source-verification]].
