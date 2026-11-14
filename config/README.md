# config/

| File | Owner | Contract |
| --- | --- | --- |
| `datasets.yaml` | data-engineer | `docs/contracts/schemas/config/datasets.schema.json` |
| `alerts.yaml` | data-scientist | `docs/contracts/schemas/config/alerts.schema.json` |

Purpose: the verified dataset list and every weight, threshold and engine parameter, each with its origin.
Phase 0 stubs hold keys only: every value is `null` with `origin: pending` (Rule zero). Changing an alert weight or
threshold is class A (CLAUDE.md §6). `uv run pytest tests/test_contracts.py` validates both files.
