# domain/

Owner: agronomist; Tyson (domain authority) approves.

Purpose: agronomic tables the engine and the app read: `farm.json`, `practices.yaml`, `strategies.yaml`,
`actions.yaml`, `thresholds.yaml`, `flood_memories.yaml`, `glossary.yaml`, plus `tyson-answers.md` and
`tyson-review-queue.md` (T-017). Each file has a JSON Schema in `docs/contracts/schemas/domain/` and is validated by
`uv run pytest tests/test_contracts.py`. Every value carries its origin; Tyson's pending answers stay `estimated`
with `estimated_by`, `reason` and a TASKS.md item, or `null` + `pending`.
