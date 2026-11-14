# pipeline/

| Path | Owner | Purpose |
| --- | --- | --- |
| `common/models.py` | lead-architect | Contract source of truth (ADR-005); JSON Schemas and TS types are generated from it |
| `common/` (provenance, grid, io helpers) | data-engineer, with data-scientist | Shared helpers named in CONTRACTS.md §1 |
| `ingest/` | data-engineer | Download, cache, harmonize to the 30 m EPSG:32717 grid; AOI and catchment |
| `engine/` | data-scientist | Features, alert index W, state machine, AHP, verification, replay snapshots |
| `data/raw/` | data-engineer | Downloads; git-ignored, never committed |
| `data/processed/` | data-engineer, data-scientist | Committed outputs; each needs provenance (`scripts/check_provenance.py`) |

Python 3.11 with uv. Run from the repository root: `uv run python -m pipeline.ingest`, `uv run python -m pipeline.engine`,
`uv run pytest`. Engine tests are mandatory (CLAUDE.md §7b). Storage is SI, UTC and EPSG:4326 (ADR-002).
