# Block 0 + Block 1 report (skeleton and foundations), 2026-11-14
Branch `block/1-foundations` at f6c6edb (block 0 on `block/0-skeleton`). Commits 8866698..f6c6edb. Writer: technical-writer, T-030 (part).

## 1. What was built, by whom
- **Kit and re-plan** (main session): kit + SPEC + data policy 8866698; phase 0 checkpoint 3a37c2b after lead-architect hit
  the Fable 5-hour limit twice; FIX.md applied (SPEC split into `docs/spec/`, token rules, tools) d2d6dac, ef5af41, 3c541b0.
- **Phase 0 skeleton** (lead-architect, [report](../lead-architect/2026-11-14-1844.md), 06bdb03): tree + READMEs, 31 JSON
  Schemas, Pydantic models, TS types (drift-tested), `openapi.yaml`, config stubs (all null/pending), hardened provenance
  checker, Vite/React/TS/Tailwind PWA scaffold, ADR-001..005. SPEC diagrams transcribed by the main session (P-001).
- **Domain** (agronomist, [report](../agronomist/2026-11-14-1930.md), 23660af): thresholds (22 keys), 4 practices, strategies
  A/B/C, 8 actions es/en, 14 glossary terms, Spanish review queue Q-01..Q-19 for the team agronomist.
- **Design** (product-designer, [report](../product-designer/2026-11-14-1932.md), 4295cf2): BRIEF, three logos, severity
  palette and tokens, presentational UI components, PWA icons.
- **Data** (data-engineer, [report](../data-engineer/2026-11-14-1932.md), a1c5b4e, 8ae88e9, d22c638, 0a28769): datasets.yaml
  (16 sourced, GAEZ pending/UNVERIFIED); AOI + SRTM catchment 253.8 km²; 8 synthetic demo lots; IMERG history and top-15
  72 h events; replay stack 2026-02-15..03-05 (POWER, S2 NDVI, DEM, IMERG Early, GLDAS, SMAP); `pipeline/common` (T-019).
- **Database** (database-engineer, [report](../database-engineer/2026-11-14-2238.md), d22c638, 19eb697, f6c6edb): 6
  migrations, 14 tables, RLS on every table, 4 security-invoker views, column grants, 79-check RLS test, local runner.

## 2. Decisions
- D-008 all agents on Opus 5.5 (Fable limit hit twice); D-009 context diet; D-010 Ponytail lite; D-011 claude-mem off-plan;
  D-012 FreeLLMAPI installer verified, not run; D-013 contracts v1 (class B). ADR-001..005 in DECISIONS.md.
- Roberto approvals (commit f471eb3): D-014 Sigatoka/heat-unit values stay `estimated`; D-015 logo option 1 "Core";
  D-016 country/province/canton nullable; D-017 random per-farm `telegram_code`; D-018 schema T-015 approved;
  D-019 no not-recommended SMAP in the replay. Class A still open: **P-007** demo flood date (the team agronomist/Roberto).

## 3. Data used (identifiers and access dates in `config/datasets.yaml`, all accessed 2026-11-14)
- Rain: GPM_3IMERGDE V07 (IMERG Early daily), 4,335 granules 2015-01-01..2026-11-13, none missing; V07B to 2026-03-03,
  V07C from 2026-03-04. GPM_3IMERGDF V07 kept as offline reference only (ends 2025-09-30).
- Soil: SPL3SMP_E v006 (0 recommended-quality days in the replay window); GLDAS_NOAH025_3H 2.1. Terrain: SRTMGL1 v003
  (OpenTopography open copy). Weather: POWER Daily API v2.10.3. NDVI: Sentinel-2 L2A (Earth Search STAC).
- Non-NASA: OpenStreetMap Rio Buenavista (way 468343174), burned 10 m into the routing DEM.
- `synthetic`: 8 demo lots (5.04-6.48 ha). `estimated`: 53 domain values (incl. Sigatoka thresholds, 14 °C base, D-014).
  Only 10 domain values are approved by the team agronomist (2 days tolerance, 70 cm roots, repeated in thresholds and practices).

## 4. Reviews and checks
- Phase 0 code review: 1 HIGH (CSV parsing) + 6 MEDIUM fixed, regression tests written first (37 red before the fix).
- Database review: 1 HIGH + 7 MEDIUM fixed in 19eb697 (telegram_code, RLS + revoke at creation, column grants,
  one-transaction apply, user farm-id suffix). Counts from the main session; the review text is not in the repo.
- Science review ([report](../science/2026-11-14-2252.md), 176680e): **B1** Final and Late IMERG mixed in one ranking ->
  history rebuilt on IMERG Early only (1,233 declustered events); **M1** all SMAP retrievals not-recommended -> recommended-only
  layer has 0 days, D-019; **M2** outlet off the river -> OSM river burned, outlet moved ~3.1 km south, area 252.7 -> 253.8 km².
  7 minors (m1..m7) fixed in 0a28769.
- `uv run pytest -q`: 178 passed. `check_provenance.py`: OK, 8,915 data files. RLS: 79/79 checks on local PostgreSQL 18.7,
  migrations re-run idempotently; 7 mutation breaks (6 caught, 1 blocked by a second layer by design).
- agronomist had no shell; its six domain files are validated by the contract tests added in 23660af.

## 5. Open items and risks for block 2
- P-007 flood date (the team agronomist): replay window 2026-02-15..03-05 rests on an unconfirmed date; 22-24 Feb 2026 is only rank 60.
- Supabase not applied: Roberto runs `supabase/README.md` steps 1-6; hosted auth/JWT path is unverified locally.
- PR `block/1-foundations` -> `main` not opened. T-015b contract addition (`telegram_code`) with lead-architect.
- Engine (block 2) must calibrate only on the IMERG Early series; saturation from API/GLDAS, SMAP shown as missing.
- the team agronomist's queue Q-01 (2 days vs more than 2) gates the engine's damage-day rule. Icons not precached by Workbox.

## 6. Resumen para the team agronomist
- Bloques 0 y 1 listos: estructura, archivos de dominio, diseño y logo "Core", datos NASA y base de datos.
- La lluvia histórica se recalculó con un solo producto (IMERG Early); las cifras anteriores no valen.
- SMAP no tiene ningún día de buena calidad en la ventana de la demo; no se usa (D-019).
- Solo tus 2 días de tolerancia y 70 cm de raíces están aprobados; lo demás es borrador o estimado.
- Te necesitamos para la fecha real de la inundación (P-007) y las preguntas Q-01..Q-19.
