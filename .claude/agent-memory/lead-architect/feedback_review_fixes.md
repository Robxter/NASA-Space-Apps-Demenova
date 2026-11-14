---
name: feedback-review-fixes
description: How the main session wants code-review findings handled - failing regression test first, report each finding with its test name
metadata:
  type: feedback
---

For code-review findings: write the failing regression test first (tests/test_provenance.py or
tests/test_contracts.py), show it red, then fix; reply per finding with fixed / not fixed + test name and the real
outcomes of `uv run pytest -q`, `python scripts/check_provenance.py`, `npm --prefix app run build`. Append a short
"Review fixes" section to the existing run report (60-line cap), do not commit.

**Why:** the 2026-11-14 phase 0 review asked for exactly this; the main session commits after reading the reply.
**How to apply:** if models.py changes, run `scripts/export_contracts.py --check` (regenerate only on drift).
Numbers in contracts are strict per field (Number/Count/Fraction aliases), not global strict mode: global strict
would break Python callers passing enum strings and ISO date strings. See [[project-adr-index]].
