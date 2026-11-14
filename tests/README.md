# tests/

| Path | Owner | Purpose |
| --- | --- | --- |
| `test_provenance.py` | lead-architect | Tests of `scripts/check_provenance.py` |
| `test_contracts.py` | lead-architect | Generated schemas and TS types match the models; committed data and config files validate |
| `e2e/` | qa-demo-engineer | Playwright end-to-end tests on phone viewports |

Unit tests of pipeline, engine and backend live next to their code. Run: `uv run pytest`.
