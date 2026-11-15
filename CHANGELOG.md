# Changelog

Owner: technical-writer (T-051). Newest first; one entry per merged build block.

## Unreleased
### Block 3: frontend upgrade (79e05f3..143fb1a, branch `block/3-polish`, not pushed, not live)
Report: `docs/reports/blocks/block-3.md`. QA GREEN on app code 2231e63 (D-033, D-034, D-035).
- Design tools: Emil Kowalski skills, Impeccable 4.9.1, Taste 2.5.1 plus four classics, Playwright MCP 0.0.85;
  Figma MCP excluded. No new npm dependency; no data, engine, contract or backend change.
- App: change list of 32 items plus review items R-01..R-11. Severe moment "Flood" on the map; Home leads with banner
  and status; map labels above their lots; reliability sheet as a native dialog; phone meta tags; two-column Home
  from 1024 px; onboarding and empty-state actions; farmer Home distilled.
- Design: PRODUCT.md and DESIGN.md; motion tokens; four design rules approved by Roberto (D-035).
- Tests: new csp, flood, a11y and last-pass specs; e2e 213 passed, 0 failed, 15 skipped; Vitest 84; initial JS
  96.4 kB of 150 kB; cold load 2.13-2.34 s on Fast 4G + CPU 4x.
- Cut: stretch About page (Taste gate OPEN 3 after three rounds), kept in history at fc3c12e.

### Block 2: core (2ea3983..886d9a9, branch `block/2-core`, not pushed)
Report: `docs/reports/blocks/block-2.md`.
- Engine: TWI, API, FAO-56 ETo/ETc, alert index W with factor shares, state machine, verification counts, ±0.10 weight
  sensitivity; replay snapshots 2026-01-20..03-05 (D-029: Severe at W ≥ 0.90, a design choice, not a calibration).
- Changed after science review T-025: per-episode counting in the farm's catchment (1 hit, 0 misses, 4 false alarms),
  updates at end of UTC day + 4 h latency, no cold-stress level, Severe confirmations only on new rain data.
- Data: Sentinel-2 NDVI offset fix; contract lot ids; 45-day replay stack.
- App: Home, Map, Lot, Alerts, Strategies, farm setup levels 0-2, reliability sheet, Learn, records with CSV export.
- Backend: FastAPI and Severe email via Resend; security review fixes. CI/CD: CI, pipeline workflow, Render blueprint.
- Contracts 1.2.0 (D-030); domain rewritten to the FIX2 mandate (D-025); guides; citations.

### Earlier (branch `block/1-foundations`, HEAD f6c6edb)
Branch `block/1-foundations` (HEAD f6c6edb); PR to `main` not opened yet. Report: `docs/reports/blocks/block-0-1.md`.

### Block 0: skeleton (06bdb03)
- Repository tree and READMEs; contracts v1 (31 JSON Schemas, Pydantic models, TypeScript types, OpenAPI sketch; D-013).
- Provenance checker hardened after code review (1 HIGH, 6 MEDIUM fixed with regression tests).
- Config stubs with every value null and origin pending; Vite + React + TypeScript + Tailwind PWA scaffold; ADR-001..005.

### Block 1: foundations (23660af..f6c6edb)
- Domain: thresholds, practices, strategies A/B/C, actions (es/en), glossary, Spanish review queue for the team agronomist.
- Design: brief, logo "Core" (D-015), severity palette and tokens, UI components, PWA icons.
- Data: datasets verified in `config/datasets.yaml`; SRTM catchment (253.8 km², OSM river burned); 8 synthetic demo
  lots; IMERG Early daily history 2015-01-01..2026-11-13 and top-15 72 h events; replay stack 2026-02-15..03-05.
- Changed after science review: single IMERG product (Early); SMAP shown only at recommended quality (D-019).
- Database: Supabase schema (6 migrations, 14 tables, RLS, 4 views), approved (D-018), not yet applied;
  79/79 RLS checks pass on local PostgreSQL 18.7.
- Checks: pytest 178 passed; provenance checker OK.
