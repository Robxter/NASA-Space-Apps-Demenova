# Changelog

Owner: technical-writer (T-051). Newest first; one entry per merged build block.

## Unreleased
Branch `block/1-foundations` (HEAD f6c6edb); PR to `main` not opened yet. Report: `docs/reports/blocks/block-0-1.md`.

### Block 0: skeleton (06bdb03)
- Repository tree and READMEs; contracts v1 (31 JSON Schemas, Pydantic models, TypeScript types, OpenAPI sketch; D-013).
- Provenance checker hardened after code review (1 HIGH, 6 MEDIUM fixed with regression tests).
- Config stubs with every value null and origin pending; Vite + React + TypeScript + Tailwind PWA scaffold; ADR-001..005.

### Block 1: foundations (23660af..f6c6edb)
- Domain: thresholds, practices, strategies A/B/C, actions (es/en), glossary, Spanish review queue for Tyson.
- Design: brief, logo "Core" (D-015), severity palette and tokens, UI components, PWA icons.
- Data: datasets verified in `config/datasets.yaml`; SRTM catchment (253.8 km², OSM river burned); 8 synthetic demo
  lots; IMERG Early daily history 2015-01-01..2026-11-13 and top-15 72 h events; replay stack 2026-02-15..03-05.
- Changed after science review: single IMERG product (Early); SMAP shown only at recommended quality (D-019).
- Database: Supabase schema (6 migrations, 14 tables, RLS, 4 views), approved (D-018), not yet applied;
  79/79 RLS checks pass on local PostgreSQL 18.7.
- Checks: pytest 178 passed; provenance checker OK.
