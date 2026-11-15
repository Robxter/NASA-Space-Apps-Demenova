---
name: project-demo-farm-redefinition
description: Standing note - the synthetic demo farm Finca Demo El Oro is final for v1; questionnaire 5.1-5.10 closed with estimated defaults
metadata:
  type: project
---

The synthetic demo farm is final for v1. Questionnaire 5.1–5.10 is closed: its defaults are the v1 values, tagged
`estimated` with reason "team agronomist left; default retained" (D-023).

**Why:** the team agronomist left on 14 Nov 2026 (FIX2.md, D-022); nobody will redefine the lots. Tasks T-060..T-064
are closed. The demo farm stays synthetic (8 lots, 5–7 ha, Pasaje / Buenavista river).

**How to apply:** lot attributes (farm.json; no domain/farm.json existed on 2026-11-15, the demo copy is
app/public/data/demo/farm.json) stay `origin: synthetic`, `to_be_redefined_by:
future-local-agronomist`, and null unless a source backs a plausible El Oro value. Open questions go to
domain/review-queue.md (for a future local agronomist); no task waits on them. See [[reference-source-verification]].
