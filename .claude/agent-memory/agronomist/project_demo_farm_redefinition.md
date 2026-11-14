---
name: project-demo-farm-redefinition
description: Standing note - Tyson must redefine Finca Demo El Oro's imaginary lots; questionnaire 5.1-5.10 still on estimated defaults
metadata:
  type: project
---

Tyson must redefine the imaginary lot layout and attributes of Finca Demo El Oro; questionnaire answers 5.1–5.10
are pending and currently use defaults tagged estimated (`estimated_by: questionnaire-default`).

**Why:** standing note required by docs/AGENTS.md §8. Tyson's family farm keeps no records, so the demo farm is
synthetic (8 lots, 5–7 ha, Pasaje / Buenavista river). Task T-064 tracks the redefinition; T-060/T-061 the questionnaire.

**How to apply:** lot attributes in domain/farm.json stay `origin: synthetic`, `to_be_redefined_by: Tyson`, and null
unless a source backs a plausible El Oro value. When tyson-answers.md gains answers, replace the estimated defaults in
domain/thresholds.yaml and clear the matching items in domain/tyson-review-queue.md. See [[reference-source-verification]].
