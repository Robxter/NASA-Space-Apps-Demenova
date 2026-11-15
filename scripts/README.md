# scripts/

Owner: devops-engineer, except where noted.

| Script | Owner | Purpose |
| --- | --- | --- |
| `check_provenance.py` | lead-architect | Rule-zero gate: every data file has provenance and every number an origin. Run before committing data |
| `export_contracts.py` | lead-architect | Generates JSON Schemas and `app/src/types/contracts.ts` from `pipeline/common/models.py` (ADR-005) |
| `split_spec.py` | main session | Splits `docs/SPEC.md` into `docs/spec/` |
| `start.ps1`, `start-energy.ps1` | main session | Normal and energy launchers (D-008) |
| `check_bundle_size.mjs` | devops-engineer | Size gate (T-029): initial JS gzip <= 150 kB after `npm --prefix app run build`; demo data <= 5 MB and CONTRACTS §4 per-file maxima (`--data` for data only). Node built-ins only |
