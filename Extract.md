# Extract.md — Demenova as built

Extracted by Claude Code on 2026-11-15 09:35 Spain from commit 79e05f3 (branch block/2-core).

## 1. Snapshot

| Field | Value |
| --- | --- |
| Commit / branch / tag | `79e05f3` on `block/2-core`: the deployed branch and its remote head (`git ls-remote origin`, 15 Nov). No tags. `main` is still `515f782` "Initial commit" (README only); the pull request `block/2-core` → `main` is not merged. NOT in this extract: `block/3-polish`, a front-end upgrade in progress since 09:00 on 15 Nov (D-033, D-034; plan in `docs/briefs/2026-11-15-frontend-upgrade/00-plan.md`); it changes tokens, ui components and screens and is not deployed. |
| Extraction date (Spain) | 2026-11-15 09:35. Code facts, health checks and screenshots come from a clean worktree at `79e05f3`; decisions, pending items and block-3 notes come from the working checkout. |
| Owner | Roberto (Cristian Roberto Terán Paredes), solo since 14 Nov 2026 |
| Live app URL | https://demenova-app.onrender.com/ (`README.md:9`; live smoke test in `docs/HANDOFF.md`, entries "LIVE, waiting on Supabase" and "Supabase live and seeded") |
| Backend URL | https://demenova-api.onrender.com/ (`GET /health` returned `{"status":"ok"}` on 15 Nov, `docs/HANDOFF.md`). Render free plan: sleeps when idle (`render.yaml:79`). |
| Repo URL | https://github.com/Robxter/NASA-Space-Apps-Demenova (public) |
| Submission status on Space Apps | UNKNOWN: nothing in the repo records a submission. `docs/project-page/SUBMISSION.md` has only the Members-tab box ticked; the video link is still `<video URL>` (`docs/project-page/project-page.md:88`). Deadline: 15 Nov, submit by 20:00 Spain (`CLAUDE.md`). |
| Overall state in one paragraph | The PWA is live and shows a frozen replay (20 Jan to 5 Mar 2026) of a synthetic demo farm near Pasaje, El Oro, computed from real NASA data: 8 lots with an alert level per day, the factors behind it, history charts, a risk map over NASA GIBS imagery, three strategies per lot, a "How reliable is this?" sheet, farm setup at data levels 0 to 2, units and language toggles, and offline use after the first visit. It reads static JSON snapshots, so it does not depend on the backend or Supabase. Supabase holds the schema and the seeded demo farm; device sync works only after the user taps Connect and passes hCaptcha (the widget loads on the live site; a human sign-in has not been confirmed in the repo). The FastAPI backend is live with `/health`, protected `/run` and `/email/test`; no real Severe email has been observed. Not built: live hourly ingest and scoring (a marked TODO in `.github/workflows/pipeline.yml:72-80`), alerts for a user's own farm, Telegram, in-app email sign-up, data level 3. Checks at `79e05f3`: pytest 424 passed, Vitest 76, build and size gate green (§17). |

## 2. What Demenova is (as built)

- A mobile-first Progressive Web App for banana farms in coastal El Oro, Ecuador (NASA Space Apps 2026, challenge "Field Shift: Adapting Farms with NASA Data"). `README.md:3-5`
- Problem it addresses: waterlogging and river floods arrive at farms that keep no records; banana tolerates at most 2 days of waterlogging (`config/alerts.yaml:32`, sourced from the former team agronomist).
- Users: an agronomist scanning many lots, and a farmer with no staff glancing at a phone (`design/BRIEF.md:8`). The app has an Agronomist and a Farmer mode (`app/src/screens/Other.tsx:111-118`).
- Promise "zero data to full data": a farm can start as a pin (level 0), add an outline (level 1) and exact lots (level 2); a confidence badge follows the level. Level 3 (field notes) is not built (§11).
- Demo story: a replay of 20 Jan to 5 Mar 2026 around the documented overflow of the Buenavista river at Pasaje on 22 to 23 Feb 2026. The replay shows lots stepping Watch → Warning → Severe over weeks. It does NOT show a prediction of the flood: lots 1 and 2 were already Severe from earlier storms, and the flood-day rain reaches the index after the overflow was reported (`app/public/data/demo/verification.json` notes; `docs/reports/science/2026-11-15-0356-t025-engine.md`).
- What a user can do in the live app today: scrub or play the replay; see the worst lot and "What to check" (a check, not a prescription); open the map with lot colours and level words; open a lot (level, index W, top factors with shares, today's values, history charts, lot facts); read "How reliable is this?" (1 hit, 0 misses, 4 false alarms in 2026, read from the data file); see three strategies per lot, labelled "Not yet reviewed by a local agronomist"; read glossary cards; set up an own farm at levels 0 to 2 (stored on the device; no alerts are computed for it); switch English/Spanish, metric/imperial, light/dark, Full/Data saver; export the replay records as CSV; install to the home screen and reopen offline.
- Every number carries an origin badge (Sourced, Estimated, Demo, …) and missing values read "No data" (`app/src/components/DataValue.tsx`, `app/src/components/ui/MissingData.tsx`).
- Credit in words, no NASA logo: "Built with NASA Earth observations" (`app/src/i18n/en.ts:4`).

## 3. Repository map

Evidence: directory listing of the worktree at `79e05f3`; planned tree in `docs/contracts/CONTRACTS.md:12-36`.

| Path | Purpose |
| --- | --- |
| `CLAUDE.md` | Project rules for Claude Code (Rule zero, ownership, approvals, solo-build rules §13) |
| `README.md`, `CHANGELOG.md`, `TASKS.md` | Public readme with live link; changelog; task board (several statuses are stale, §18) |
| `FIX.md`, `FIX2.md` | Roberto's two mid-build instruction files (usage-limit recovery; solo build) |
| `.claude/agents/{core,backend,frontend,validation,docs}/*.md` | 14 custom agent definitions (§16); `.claude/agent-memory/<agent>/` their notes; `.claude/settings.json` |
| `.github/workflows/ci.yml`, `pipeline.yml` | CI on push/PR; hourly pipeline (live step is a TODO) |
| `render.yaml` | Render Blueprint: static site `demenova-app`, web service `demenova-api`, headers and CSP |
| `config/alerts.yaml`, `config/datasets.yaml` | Engine parameters with origins; verified dataset register |
| `domain/*.yaml` | thresholds, practices, strategies, actions, glossary, flood_memories; `agronomist-answers-archive.md`; `review-queue.md` (for a future local agronomist) |
| `pipeline/common/` | `models.py` (the one hand-written contract, ADR-005), `provenance.py`, `grid.py`, `io.py` |
| `pipeline/ingest/` | `aoi.py`, `srtm.py`, `lots.py`, `imerg.py`, `power.py`, `ndvi.py`, `smap.py`, `gldas.py`, `opendap.py`, `replay.py`, `auth.py`, `cache.py`, `__main__.py`, `test_ingest.py` |
| `pipeline/engine/` | `terrain.py`, `hydrology.py`, `index.py`, `state.py`, `side.py`, `verification.py`, `sensitivity.py`, `ahp.py` (unused), `catchment.py`, `config.py`, `run.py`, `__main__.py`, 7 test files |
| `pipeline/data/processed/` | committed outputs: `aoi/`, `terrain/`, `rain/`, `weather/`, `ndvi/`, `engine/`, `replay/2026-01-20_2026-03-05/`; `pipeline/data/raw/` is git-ignored |
| `backend/app/` | `main.py`, `alerts.py`, `email.py`, `supabase.py`, `settings.py`, `ids.py`; `backend/tests/` |
| `supabase/` | `migrations/` (6 files), `tests/rls_test.sql`, `tests/run_local.ps1`, `seed/seed_demo.py`, `README.md`; `policies/` is empty (policies live in migration 000500) |
| `app/` | Vite + React PWA: `index.html`, `vite.config.ts`, `package.json`, `scripts/build_domain_snapshots.py`, `public/{manifest.webmanifest,icons/,data/demo/}`, `src/` (§11) |
| `design/` | `BRIEF.md`, `logo/` (3 options, option 1 chosen), `components/`, `screens/` |
| `tests/` | `test_contracts.py`, `test_provenance.py`, `e2e/` (Playwright: 9 spec files, `serve.mjs`, own `package.json`) |
| `scripts/` | `check_provenance.py`, `export_contracts.py`, `check_bundle_size.mjs`, `split_spec.py`, `start.ps1`, `start-energy.ps1` |
| `docs/` | `SPEC.md` + `spec/` (split), `contracts/` (CONTRACTS.md, openapi.yaml, 31 schemas), `decisions/` (DECISIONS.md, PENDING.md), `reports/<agent>/`, `guide/` (5 guides), `project-page/` (page draft, video script, submission checklist), `DATA_POLICY.md`, `AGENTS.md`, `WORKFLOW.md`, `HANDOFF.md`, `SI_USE_LOG.md`, `CITATIONS.md`, `DEPLOY.md`, `briefs/`, `proposals/` |

Planned in `CONTRACTS.md:12-36` but not created: `domain/farm.json` (the demo farm lives in `app/public/data/demo/farm.json`), `pipeline/ingest/ecostress.py` and `grace.py`, engine files under the planned names (`runoff.py`, `travel_time.py`, `api_index.py`, `et.py`, `balance.py`, `state_machine.py`, `side_indicators.py`, `snapshots.py`: their functions are in `hydrology.py`, `state.py`, `side.py`, `run.py`), `backend/app/telegram.py`, `supabase/seed/demo_farm.sql` (replaced by `seed_demo.py`), `design/tokens.md`, `app/src/screens/Alerts/` (Alerts and Settings are in `app/src/screens/Other.tsx`).
Created but not in the planned tree: `pipeline/engine/sensitivity.py`, `catchment.py`, `config.py`; `pipeline/ingest/opendap.py`, `lots.py`, `replay.py`, `auth.py`, `cache.py`; `backend/app/alerts.py`, `ids.py`; `app/scripts/`; `docs/DEPLOY.md`; `tests/test_contracts.py`; `scripts/export_contracts.py`. On `block/3-polish` only: `docs/DESIGN_TOOLS.md`, `scripts/pw_mcp.mjs`, `docs/briefs/2026-11-15-frontend-upgrade/`, `design/upgrade/`, `docs/extract/`.

## 4. Architecture and data flow

```text
NASA + partner data
  GES DISC IMERG Early daily | NASA POWER API | SRTMGL1 (OpenTopography) | Sentinel-2 L2A (Earth Search STAC) | OSM river
      |  pipeline/ingest  (run by hand on Roberto's PC: uv run python -m pipeline.ingest <step>)
      v
  pipeline/data/processed/**  (+ *.provenance.json sidecars; raw downloads cached in pipeline/data/raw, git-ignored)
      |  pipeline/engine  (run by hand: uv run python -m pipeline.engine replay)   run.py:475 run_replay
      v
  app/public/data/demo/**  (65 files, 1,056,608 bytes: manifest, farm, zones, catchment, 45 replay days, 11 histories,
      |                      verification, strategies, glossary, actions)
      |-- npm --prefix app run build --> Render Static Site "demenova-app" (app/dist, CDN) --> browser PWA
      |       browser: fetch /data/demo/* -> Workbox NetworkFirst cache "demo-snapshots" -> IndexedDB copy (offline)
      |-- supabase/seed/seed_demo.py (run by hand once, 15 Nov) --> Supabase Postgres (demo farm rows)
  Supabase <-- service-role REST -- backend (Render Web Service "demenova-api", FastAPI) -- Resend REST --> email
  Browser --(only after "Connect this device" + hCaptcha)--> Supabase anonymous sign-in --> upsert own farm and lots
  GitHub Actions: ci.yml on every push/PR; pipeline.yml hourly + manual (runs only from main; live ingest step = TODO)
```

| Arrow | Module / function | Runs where |
| --- | --- | --- |
| Download + harmonise | `pipeline/ingest/__main__.py:23` steps `auth, aoi, ndvi, lots, power, imerg, replay` | Local (Roberto's PC) |
| Features, W, states, verification, snapshots | `pipeline/engine/__main__.py:15` steps `kirpich, farm-rain, replay`; `run.py:262 daily_series`, `:301 indicators`, `:335 run_units`, `:475 run_replay`, `:698 write_verification` | Local |
| Domain YAML → app JSON | `app/scripts/build_domain_snapshots.py` (strategies.json, glossary.json, actions.json) | Local |
| Snapshot → Supabase rows | `supabase/seed/seed_demo.py` (idempotent upsert; REST with the service role) | Local, by hand |
| App build + hosting | `render.yaml:9-14` (`npm --prefix app ci && npm --prefix app run build`, publish `app/dist`) | Render Static Site |
| App data loading | `app/src/data/demo.ts`, `app/src/data/snapshots.ts:124,132` (source `network`, then `cache`) | Browser |
| Device identity and farm sync | `app/src/data/identity.ts:92` (`signInAnonymously` with `captchaToken`), `app/src/data/farmStore.ts:42-63` | Browser → Supabase |
| Severe email | `backend/app/alerts.py` (`publish_severe_alerts`), `backend/app/email.py:205` | Render Web Service, or `python -m backend.app.alerts` in `pipeline.yml:91` |
| CI | `.github/workflows/ci.yml:38-68` | GitHub Actions |

Runtime read order in the app: (1) network fetch of `/data/demo/<file>` (static files on the same origin); (2) the device copy in IndexedDB when offline, with "Offline, showing data from <time>" (`app/src/data/snapshots.ts:17-23,124,132`; `app/src/data/idb.ts` falls back to memory when IndexedDB is unavailable); (3) in development only, a synthetic fixture labelled as such (`app/src/data/fixtures/demo-fixture.ts`). Supabase is NOT read for demo data: the app only writes and deletes the user's own farm and lots there (`app/src/data/farmStore.ts:42,45,50,63`). The four Supabase views exist for a future live mode but no app code reads them (grep `.from(` in `app/src`: farmStore only).

## 5. Datasets actually used

| Dataset | Exact product / version used | Provider & URL recorded | Variables | Spatial / temporal resolution | Time range downloaded | Used for | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GPM IMERG Early Run, daily | `GPM_3IMERGDE` V07 (granules V07B to 2026-03-03, V07C after); DOI 10.5067/GPM/IMERGDE/DAY/07 | NASA GES DISC | `precipitation` (mm/day) | 0.1°; UTC day | 2015-01-01 to 2026-11-13, 4,335 days, none missing | Upstream 72 h rain (catchment mean), local 24 h rain (farm cell), API, 7-day balance, event ranking | `config/datasets.yaml`; `pipeline/data/processed/rain/imerg_catchment_daily.csv` (4,335 rows); manifest provenance `prov-imerg-early-catchment-daily-2015-01-01-2026-11-13`, `prov-imerg-early-farm-cell-daily-2015-01-01-2026-11-13` |
| NASA POWER daily | POWER Daily API v2.10.3 (community AG) | NASA POWER, Langley; endpoint `https://power.larc.nasa.gov/api/temporal/daily/point` | T2M, T2M_MAX, T2M_MIN, RH2M, PRECTOTCORR, WS2M, ALLSKY_SFC_SW_DWN | Point (one source cell covers the AOI; grid spacing "not stated on the pages read"); local-solar-time day | 2015-01-01 to 2026-11-13 (4,335 rows; the last row is empty) | FAO-56 ETo, mean temperature, humidity, heat units | `config/datasets.yaml`; `pipeline/data/processed/weather/power_daily_farm.csv`; `prov-power-daily-farm` |
| NASA POWER hourly | POWER hourly API (the manifest record is labelled "POWER Daily API" v2.10.3; the claims review read v2.10.4 for the hourly API: open item for data-engineer) | NASA POWER | RH2M hourly | Point; hourly, UTC | 2026-01-20 to 2026-03-05 | Leaf-wetness hours for the Sigatoka side indicator | `pipeline/data/processed/weather/power_hourly_farm_2026-01-20_2026-03-05.csv`; `prov-power-hourly-farm-2026-01-20-2026-03-05`; `docs/reports/science/2026-11-15-0617-claims.md` |
| SRTM | `SRTMGL1` v003, DOI 10.5067/MEASURES/SRTM/SRTMGL1.003 | NASA LP DAAC (archive); downloaded from OpenTopography's open copy | elevation (m) | 1 arc second (~30 m); static | Tiles covering the catchment | DEM, slope, D8 accumulation, TWI, catchment, Kirpich length and drop | `config/datasets.yaml`; `pipeline/data/processed/terrain/dem_farm_30m.tif`, `upslope_area_farm_30m.tif`; `prov-srtm-dem-farm-30m`, `prov-catchment-buenavista-srtm` |
| Sentinel-2 L2A | `sentinel-2-l2a`, Earth Search STAC API v1 | Copernicus Sentinel-2 (ESA); COGs by Element 84 on AWS; `https://earth-search.aws.element84.com/v1` | red, nir, SCL → NDVI | 10 m (red, nir), 20 m (SCL); scene date | Composite 2025-11-01 to 2026-11-13 (lot placement); replay scenes 2026-02-14 and 2026-02-19 kept, 7 cloudy scenes listed but not written | NDVI history (2 points in the replay); placing the synthetic lots | `pipeline/ingest/ndvi.py`; `prov-s2-ndvi-s2b_17mps_20260214_1_l2a`, `prov-s2-ndvi-s2c_17mps_20260219_0_l2a`; `docs/reports/data-engineer/2026-11-15-0615.md` |
| NASA GIBS imagery | WMTS layers `ASTER_GDEM_Greyscale_Shaded_Relief` and `MODIS_Terra_CorrectedReflectance_TrueColor` | NASA GIBS, `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/...` | Map tiles | Level 12 and Level 9 tile matrix sets | Fetched by the browser at view time | Base map under the lots | `app/src/screens/Map/MapView.tsx:3,24-33` |
| OpenStreetMap | River way 468343174 (Rio Buenavista) | OpenStreetMap contributors | River line | Vector | One feature | Burned into the DEM so the outlet sits on the river | `pipeline/data/processed/aoi/catchment.geojson` properties |

Downloaded into the replay stack but NOT used by the engine or the app: SMAP `SPL3SMP_E` v006 (every retrieval in the window has a "not recommended" quality flag; the recommended-only layer is empty; D-019) and GLDAS-2.1 Noah `GLDAS_NOAH025_3H` (4 soil-moisture depths; "in the replay data, not used in the alert index", `docs/CITATIONS.md`). The app shows soil moisture as "No data".
Verified in `config/datasets.yaml` but not downloaded or not used: IMERG half-hourly Early (`GPM_3IMERGHHE`), IMERG Late and Final daily (dropped after science review B1: Final ends 2025-09-30; one product end to end), ECOSTRESS `ECO_L2T_LSTE` v003, HLS `HLSL30` v2.0, `MOD13Q1` v061, `VNP13A1` v002, GRACE/GRACE-FO mascons, ERA5 (ECMWF; "not used yet"), ISRIC SoilGrids ("REST API temporarily paused"; not used). FAO GAEZ: `origin: pending`, not verified, not used.
Non-NASA sources used: Sentinel-2 (ESA/Copernicus), OpenStreetMap, FAO-56 (ETo method and Kc table), and press articles for flood dates, tagged `observed`: El Universo 23 Feb 2026, Teleamazonas 12 Oct 2026, Extra 26 Oct 2026 (entries with URLs and access dates in `docs/CITATIONS.md`; flood events in `domain/flood_memories.yaml` and `app/public/data/demo/verification.json`).

## 6. Areas, farm and lots

| Item | As built | Evidence |
| --- | --- | --- |
| Farm AOI | `aoi_pasaje_buenavista`, a design box, bbox lon −79.875 to −79.805, lat −3.405 to −3.345 (canton Pasaje, province El Oro), `origin: design` | `pipeline/data/processed/aoi/farm_aoi.geojson` |
| Catchment | `catchment_buenavista_pasaje`, delineated from SRTM with pysheds on a DEM with the OSM river burned in; area 253.8 km²; bbox lon −79.87785 to −79.62873, lat −3.57916 to −3.34813 | `pipeline/data/processed/aoi/catchment.geojson`; `pipeline/ingest/aoi.py` |
| Outlet | (−79.87744, −3.37572); rule: "OSM river exit from the farm box, snapped to the highest accumulation within 300 m" | same file, `outlet_lonlat`, `outlet_rule` |
| Longest flow path | 47,995 m; drop 2,346.0 m (2,361.5 m at (−79.67526, −3.53583) minus 15.5 m at the outlet); slope 0.04888 m/m | `config/alerts.yaml:56-58` |
| Demo farm | `farm_demo-el-oro`, "Finca Demo El Oro", `is_demo: true`, data level 2, pin at (−79.823491, −3.362955), `origin: {"*": "synthetic"}` | `app/public/data/demo/farm.json` |
| Lots | 8 synthetic lots, `lot_demo-el-oro_1` … `_8`, named "Lote N (demo)"; areas 6.48, 5.04, 5.04, 6.48, 6.48, 5.76, 5.76, 5.76 ha; TWI terciles: lots 1, 2, 4, 7 high; 3, 5, 8 mid; 6 low; `twi_mean` 6.676 to 9.375 (`sourced`); plant age, drainage, cover crop, soil analysis all null ("No data"); `to_be_redefined_by: future-local-agronomist` | `app/public/data/demo/farm.json`; `pipeline/data/processed/aoi/demo_lots.geojson`; `pipeline/ingest/lots.py` |
| How lots were generated | By `pipeline/ingest/lots.py` on land with dense vegetation in a Sentinel-2 NDVI composite, spanning low and high terrain wetness. Caveat: placement used a composite that was later found wrong (NDVI offset applied twice); with the corrected composite 7 of 528 lot cells fall below the 0.6 NDVI rule; lots were not moved | `docs/reports/data-engineer/2026-11-15-0615.md` |
| Automatic zones (data level 1) | 3 zones by TWI tercile inside the farm: `zone_demo-el-oro_low`, `_mid`, `_high` (`sourced`); method `tercile_breaks` = quantiles 1/3 and 2/3 | `app/public/data/demo/zones.geojson`; `pipeline/engine/terrain.py:95-102` |
| Grid | EPSG:32717, 30 m, x_min 624960, y_max 9630210, 260 × 222 cells; storage EPSG:4326 | `pipeline/data/processed/replay/2026-01-20_2026-03-05/stack.json` (`grid`); ADR-002 |
| Resampling per layer | POWER: nearest (single source cell); IMERG: nearest (0.1° cell); GLDAS: daily mean of 8 instants, nearest (0.25°); SMAP: nearest (9 km EASE-Grid); SRTM: bilinear (DEM), D8 accumulation on the burned surface; Sentinel-2 NDVI: mean of clear 10 m pixels (at least 5 of 9) | `stack.json` layers (`resampling`, `day_definition`) |

## 7. Processing pipeline (ingest)

| Step | Module / command | Input | Output (path) | Notes (caching, gaps, masks) |
| --- | --- | --- | --- | --- |
| Earthdata login check | `uv run python -m pipeline.ingest auth` (`pipeline/ingest/auth.py`) | `EARTHDATA_USERNAME`, `EARTHDATA_PASSWORD` from the environment | none | Does not read `EARTHDATA_TOKEN` (`docs/reports/devops-engineer/2026-11-15-0444.md`) |
| AOI + catchment | `… ingest aoi` (`aoi.py`, `srtm.py`) | SRTMGL1 tiles (OpenTopography), OSM river | `processed/aoi/farm_aoi.geojson`, `catchment.geojson`; `processed/terrain/dem_farm_30m.tif`, `upslope_area_farm_30m.tif` | pysheds 0.5; river burned into the DEM; raw tiles cached, never re-downloaded (`cache.py`) |
| NDVI | `… ingest ndvi` (`ndvi.py`) | Sentinel-2 L2A via Earth Search STAC | `processed/ndvi/ndvi_composite_2025-11-01_2026-11-13.tif`; replay NDVI layers | Scale only (the BOA offset is already applied in flagged scenes); non-positive reflectance stays missing; raises if NDVI leaves −1..1 |
| Demo lots | `… ingest lots` (`lots.py`) | NDVI composite, TWI | `processed/aoi/demo_lots.geojson` | Geometry only, `origin: synthetic` |
| Weather | `… ingest power` (`power.py`) | POWER API (no login) | `processed/weather/power_daily_farm.csv`, `power_hourly_farm_2026-01-20_2026-03-05.csv` | Fill value −999.0 kept as missing |
| Rain history | `… ingest imerg` (`imerg.py`, `opendap.py`) | IMERG Early daily via NASA cloud OPeNDAP (needs Earthdata login and GES DISC approval) | `processed/rain/imerg_catchment_daily.csv`, `top15_72h_events.csv` | 1,233 72 h events ranked; top event 25 to 27 Oct 2026, 199.4 mm |
| Replay stack | `… ingest replay` (`replay.py`, `smap.py`, `gldas.py`) | All of the above for a window (default `2026-01-20:2026-03-05`, D-029) | `processed/replay/2026-01-20_2026-03-05/` (`stack.json` + layers) | `day_definition` and `native_resolution` per layer; SMAP recommended-only layers empty |
| Farm-cell rain | `uv run python -m pipeline.engine farm-rain` (`run.py:119`) | IMERG Early daily | `processed/engine/imerg_farm_cell_daily.csv` | Feeds local rain and API |

Whole pipeline locally, as documented (`pipeline/README.md:12-13`, `README.md:41-44`): `uv sync`, then the ingest steps above in that order, then `uv run python -m pipeline.engine replay`, then `uv run python app/scripts/build_domain_snapshots.py`; checks `uv run pytest -q` and `python scripts/check_provenance.py`. There is no single "run everything" command.

## 8. Engine: the science as implemented

| # | Method | Implemented? | Function (path) | Formula as coded | Parameters & values (origin) | Tests (path, pass/fail) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Depression filling and D8 flow direction | Yes | Catchment: `pipeline/ingest/aoi.py` (pysheds). Flow length: `pipeline/engine/terrain.py:141 d8_flow_length`, `:181 longest_flow_path` | D8 on the OSM-burned routing surface | Outlet rule above (sourced) | `pipeline/engine/test_terrain.py` (12), `pipeline/ingest/test_ingest.py`: pass |
| 2 | Topographic wetness index | Yes | `terrain.py:36 twi`, `:74 rank_within_farm`, `:95 tercile_breaks` | `np.log((area / contour_width_m) / tan_beta)` (`:42`); rank `((first + last) / 2 - 1) / (n - 1)` (`:91`); terciles `np.quantile(finite, [1/3, 2/3])` (`:101`) | 30 m cells | `test_terrain.py`: pass |
| 3 | Curve Number runoff | Function yes; NOT used in W | `hydrology.py:20 potential_retention_mm`, `:27 scs_cn_runoff_mm` | `S = 25400.0 / cn - 254.0`; `ia = 0.2 * s`; `q = excess**2 / (excess + s)` for `excess > 0` | `curve_number_by_cover_soil: null`, `origin: pending` (no land-cover or soil-group layer ingested) `config/alerts.yaml:35` | `test_hydrology.py` (26): pass |
| 4 | Kirpich time of concentration | Yes | `hydrology.py:44 kirpich_tc_minutes`; inputs `catchment.py:46 kirpich_inputs` | `0.0195 * length_m**0.77 * slope_m_per_m**-0.385` | L 47,995 m, S 0.04888 (sourced) → tc 250.7 min = 4.18 h (estimated; used beyond Kirpich's calibration range, per the science review) `alerts.yaml:36,55-59` | `test_hydrology.py`: pass |
| 5 | Antecedent precipitation index | Yes | `hydrology.py:82` | `prev = value + k * prev` (`:94`); first day starts from P_0; a missing day makes later days missing | `api_k: 0.90`, estimated `alerts.yaml:34` | `test_hydrology.py`: pass |
| 6 | FAO-56 Penman–Monteith and crop coefficient | Yes | `hydrology.py:142 eto_fao56`, `:176 ea_from_rh_mean`, `:183 crop_et` | `num = 0.408*delta*(rn-g) + gamma*900/(tmean+273)*u2*(es-ea)`; `den = delta + gamma*(1+0.34*u2)` (`:171-173`); `etc = kc * eto` | `kc_banana: 1.10`, estimated from FAO-56 Table 12 `alerts.yaml:52`; inputs POWER daily | `test_hydrology.py` (checked against FAO-56 Example 18): pass |
| 7 | Daily soil water balance | Yes, without drainage | `hydrology.py:195 daily_balance`, `:204 rolling_sum`, `:217 consecutive_positive_days`, `:231 floor_warning` | `p - etc - d`, with `d = 0.0` when drainage is None (`:200-201`) | `drainage_mm_per_day: null`, pending `alerts.yaml:53`; window 7 days `alerts.yaml:64` | `test_hydrology.py`: pass |
| 8 | Leaf wetness from humidity | Yes | `side.py:20 leaf_wetness_hours` | hours with RH ≥ threshold | `sigatoka.leaf_wet_rh: 0.90`, estimated `alerts.yaml:44` | `test_side_and_verification.py` (10): pass |
| 9 | Sigatoka favourability | Yes, shown as Experimental | `side.py:28 sigatoka_favourable`, `:38 sigatoka_level` | `"watch" if run >= days else "normal"` (`:48`) | t_mean 23 °C, rh_mean 0.75, rh_unfavourable 0.70, days 3: all estimated `alerts.yaml:39-43` | same file: pass |
| 10 | Banana heat units | Value only; no cold level | `side.py:52 heat_units`, `:57 cold_level` | `t_mean_c - base_c` | `cold.base_c: 14`, estimated; `weekly_threshold_rule: null`, pending `alerts.yaml:46-48`. The UI shows no cold indicator | same file: pass |
| 11 | NDVI | Yes (2 valid scenes) | `pipeline/ingest/ndvi.py`; guard `run.py:248 ndvi_scene_is_valid` | (nir − red) / (nir + red), rejected outside −1..1 | — | `test_ingest.py`, `test_sensitivity_and_run.py`: pass |
| 12 | NDWI, optional | No | — | — | — | — |
| 13 | Analytic hierarchy process | Implemented, unused | `ahp.py:33 ahp_weights` | Saaty eigenvector | Not run: no expert matrix (D-024); the random-index source is unverified (T-047) | `test_ahp.py` (4): pass |
| 14 | Forecast verification | Yes, counts only | `verification.py:48 scores`, `:115 verify_episodes`; sensitivity `sensitivity.py:16 perturbed_weights` | `pod = hits/(hits+misses)`, `far = false_alarms/(hits+false_alarms)`, `csi = hits/(hits+misses+false_alarms)` | Alert = Severe; window 1 day before, 1 day after `alerts.yaml:72-75` | `test_side_and_verification.py`, `test_sensitivity_and_run.py` (12): pass |

Engine tests: 84 test functions in 7 files (`pipeline/engine/test_*.py`); all pass inside the 424 (§17).

**Alert index W** (`pipeline/engine/index.py:49-61`, `run.py:301-309`): `W = sum w_i x_i`; NaN if any indicator is missing (weights are never re-normalised).

| Indicator | What it is (as coded) | Normalisation | Weight (origin) |
| --- | --- | --- | --- |
| upstream | Rolling 72 h sum of catchment-mean IMERG rain, shifted by `travel_lag_days` (0) `run.py:270-275` | Percentile against the unit's own strictly earlier days `index.py:18-37` | 0.35 (design) `alerts.yaml:14` |
| saturation | API of farm-cell rain `run.py:276` | same percentile | 0.25 (design) `alerts.yaml:15` |
| terrain | TWI rank within the farm, 0..1 `terrain.py:74-92` | rank fraction | 0.20 (design) `alerts.yaml:16` |
| local | Farm-cell IMERG rain of one UTC day `run.py:269` | same percentile | 0.10 (design) `alerts.yaml:17` |
| balance | 7-day sum of P − ETc `run.py:284-285` | same percentile | 0.10 (design) `alerts.yaml:18` |

Percentile method: "mid-rank against strictly earlier days: (count below + half the ties) / count", minimum history 365 days, state machine starts 2016-01-01 (`alerts.yaml:65-67`). Reason recorded for every weight: "engineering choice; no expert AHP matrix available (D-024)".

**State machine** (`pipeline/engine/state.py`; parameters `config/alerts.yaml:20-31`, all `origin: design`):

| Rule | Value | Where coded |
| --- | --- | --- |
| Escalate one level at a time | Watch at W ≥ 0.40, Warning at W ≥ 0.60, Severe at W ≥ 0.90 | `state.py:88-101 _w_step`; `alerts.yaml:21-23` |
| Severe confirmations | 2 consecutive updates, counted only when newer rain data arrives | `state.py:128-131`; `alerts.yaml:30` |
| De-escalate (hysteresis) | Watch → Normal below 0.30; Warning → Watch below 0.50; Severe → Warning below 0.80 | `state.py:94,98,100`; `alerts.yaml:26-28` |
| Stale | Newest rain data older than 12 h → Stale; never emails; fresh data recomputes the level directly | `state.py:104-107,119-123,134-135`; `alerts.yaml:31` |
| Missing W | The level is held | `state.py:125-126` |
| Email flag | Only on a transition into Severe | `state.py:143` |
| Update time | End of the UTC day of the newest IMERG value + 4 h latency | `alerts.yaml:68-69` |

The Severe threshold was 0.80 in the SPEC and is 0.90 by D-029: "design choice made after viewing the 2026 replay to make Severe rarer … not fitted or validated" (`alerts.yaml:23`).

**2-day waterlogging floor rule**: implemented. `floor_warning` is true for a high-TWI-tercile unit after 2 consecutive days of positive balance (`hydrology.py:231-236`; `waterlogging_days_floor_warning: 2`, sourced, `alerts.yaml:32`); the state machine then raises the level to at least Warning with reason "floor" (`state.py:138-139`). `root_depth_cm: 70` is recorded but "not used by the engine" (`alerts.yaml:33`).

**Side indicators**: Sigatoka weather is built and shown with a "Watch" level and an "Experimental" badge (`app/src/screens/Lot/Lot.tsx:241-244`; snapshot flag `side.experimental: true`). Cold stress: heat units are computed, no level is produced, nothing is shown (science review M4: the rule fired on 46 % of days).

**Confidence badge**: `confidence_for_data_level` returns the data level itself, 0 to 3 (`index.py:87-91`). The app shows "Confidence {n} of 3" on Lot detail (`Lot.tsx:169`) and a level/confidence badge in Setup (`app/src/screens/Setup/Setup.tsx:42`). The demo farm is level 2.

**Explanations**: share of factor i = `w_i * x_i / W` (`index.py:64-76`); the top two by share are stored (`index.py:79-84`). Home shows "Top factor: {factor}" (`Home.tsx:41`), Lot detail shows "Why" with each factor's "Share of W" and an origin badge (`Lot.tsx:202-211`).

## 9. Calibration, verification and sensitivity

All numbers below are read from `app/public/data/demo/verification.json` (generated 2026-11-15T04:07:26Z) unless another file is named.

| Item | Value |
| --- | --- |
| Travel lag | First estimate: Kirpich 250.7 min (4.18 h). Calibrated: 0 days on the 22 to 23 Feb 2026 Buenavista event (`config/alerts.yaml:36-37`, `origin: calibrated`; calibration note in `docs/reports/data-scientist/2026-11-15-0450.md`). The lag is in-sample: one event |
| Verification period | 2026-01-01 to 2026-11-13, farm's own catchment (Rio Buenavista) |
| Counting unit | The alert episode: consecutive UTC days with any demo lot at Severe (W ≥ 0.90); a flood with no episode within 1 day before to 1 day after is a miss |
| Counts | hits 1, misses 0, false alarms 4 |
| POD / FAR / CSI | 1.0 / 0.8 / 0.2 are in the file "only because the contract requires them" (sample: 1 documented flood, 5 episodes). The file's notes say to show counts only; the app never shows them (`app/src/data/reliability.ts`) |

| Event | Dates | Source | Flagged? Lots, level, lead time |
| --- | --- | --- | --- |
| `flood-2026-02-22-buenavista-pasaje` (documented flood) | 22 to 23 Feb 2026 | El Universo, 23 Feb 2026 (URL in `docs/CITATIONS.md`) | Hit: lots 1, 2 and 7 at Severe on the flood days. No flood-specific lead time: the Severe episode began on 5 Feb (39 days long); the rain of UTC 23 Feb reaches the index at 04:00 UTC on 24 Feb, after the overflow was reported at 09:54 local on 23 Feb (`docs/reports/data-scientist/2026-11-15-0510.md`) |
| `alert-episode-2026-01-26` | 26 to 30 Jan 2026 (5 d) | none | False alarm (no documented flood in its window): lot 2 |
| `alert-episode-2026-06-10` | 10 to 11 Jun 2026 (2 d) | none | False alarm: lot 2 |
| `alert-episode-2026-10-03` | 3 to 14 Oct 2026 (12 d) | none | False alarm: lots 1, 2, 7 |
| `alert-episode-2026-10-20` | 20 Oct to 8 Nov 2026 (20 d) | none | False alarm: lots 1, 2, 4, 7 |

Each false alarm is described in the file as "not proof that no flood happened". Regional context, not skill: three documented floods on other El Oro rivers (11 to 12 Oct Santa Rosa; 19 and 26 Oct Chaguana) fell inside Severe episodes (`docs/reports/data-scientist/2026-11-15-0510.md`).

**Sensitivity check** (`sensitivity` block; each of the 5 weights moved by ±0.10, the rest rescaled; 10 runs; flood days 21 to 24 Feb):
- `stable: false`. "Which lots are Severe on which days changes in 10 of 10 runs."
- Lots 1 and 2 are Severe on the flood days in every run (`flood_day_core_units`). Baseline set: lots 1, 2, 7. Across all runs lots 4, 5 and 8 also reach Severe in some variants (`flood_day_any_units`: 1, 2, 4, 5, 7, 8).
- `same_units` is true in 5 of 10 variants; `same_days` is false in all 10.
- Verdict to state: not stable on the strict test; the two wettest lots are robust.

**Honest limits stated in the app and docs**: no flood-specific lead time (`reliability.leadTitle` "Warning time", `ReliabilitySheet.tsx:101-102`); W uses whole-year percentiles, so wet-season days stay high for weeks (`reliability.limitTitle` "Known limit", `:106-107`; science review M3: the wettest lot is Severe on 13 % of days in 2016 to 2025 at 0.90); Severe at 0.90 is a design choice (`reliability.severeDesign`, `:111`); only El Oro was run (`docs/project-page/project-page.md`); the demo farm is synthetic (Demo label); agronomic text is "not yet reviewed by a local agronomist".

## 10. Database (Supabase)

Schema: 6 migrations in `supabase/migrations/` (`20261114000100_private_helpers` … `000600_views`); 14 tables, 4 views, 27 policies (all in `000500_rls_policies.sql`), 23 indexes. Access model from `supabase/README.md:34-47`.

| Table | Purpose | RLS summary (anon / signed-in anonymous user / service role) |
| --- | --- | --- |
| `farms` | Farm, owner, location, outline, data level, `telegram_code`, `alert_email` | read demo / read demo + own, write own except `is_demo`, `telegram_code`, `alert_email`, `catchment_id`, `owner_id` after insert / all |
| `lots` | Lot geometry and attributes | read demo / read demo + own farm, write own farm except `twi_*` / all |
| `zones` | TWI zones | read demo / read demo + own; no write / all |
| `daily_features` | Per unit and day: rain, API, ETc, balance, NDVI, … | same as zones |
| `alert_states`, `alert_events` | Current state per unit; every level change | same as zones |
| `field_notes`, `flood_memories` | Level-3 notes and flood memories (no UI yet) | read demo / read + write own farm / all |
| `practices`, `provenance` | Reference tables | read all / read all / all |
| `strategies` | Strategies | read regional + demo / + own farm / all |
| `user_prefs` | Preferences per user | none / own row only / all |
| `email_log`, `telegram_subscribers` | Service tables | none / none / all |

Views (`security_invoker`): `v_farm_status`, `v_lot_history_7d`, `v_lot_history_90d`, `v_alert_log`. Indexes include `farms_owner_id_idx`, `daily_features_farm_date_idx`, `alert_events_unit_at_idx`, `email_log_unit_episode_idx` (not unique: P-016 proposes a unique partial index, deferred).

- Design: SI units, `timestamptz` UTC, GeoJSON as `jsonb` (no PostGIS), every `<field>_origin` is a column, "a null value has origin `pending`" is enforced; user farm ids must end in a random suffix of 6+ characters; the demo farm is exempt (`supabase/README.md:26-32`).
- Identity: anonymous sign-in, on demand only. The app never signs in on load; "Connect this device for sync" loads hCaptcha and calls `signInAnonymously({ options: { captchaToken } })` (`app/src/data/identity.ts:92`, D-032). Fallback: device-only mode, stated in Settings and Setup. If `VITE_HCAPTCHA_SITEKEY` is unset the build has no hCaptcha code and says "Sync is not configured on this build".
- Key names: app `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the live key is a legacy JWT with role `anon`); backend, seed and pipeline `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Applied to the live project: yes, by Roberto in the SQL Editor on 15 Nov, one transaction; `supabase/tests/rls_test.sql` (79 checks) passed there and on local PostgreSQL 18.7 (`docs/HANDOFF.md` "Supabase live and seeded"; D-018). `supabase/README.md:4-6` still says "not yet applied" (stale).
- Seeded on 15 Nov by `supabase/seed/seed_demo.py`: provenance 13, farms 1, lots 8, zones 3, daily_features 495, alert_states 11, alert_events 18. Checked with the public key: views return 11 / 77 / 495 / 18 rows; an anonymous update of the demo farm is refused (42501).

## 11. Front end: architecture (most detailed)

**Stack and exact versions** (`app/package.json`; package `demenova-app` 0.0.0, engines node `^22.11.0`):

| Kind | Package | Version |
| --- | --- | --- |
| dependency | react, react-dom | 19.3.1 |
| dependency | leaflet | 1.9.4 |
| dependency | uplot | 1.6.32 |
| dependency | @supabase/supabase-js | 2.119.0 |
| devDependency | vite | 6.4.6 |
| devDependency | typescript | 5.9.3 |
| devDependency | tailwindcss, @tailwindcss/vite | 4.3.5 |
| devDependency | vite-plugin-pwa | 2.0.0 |
| devDependency | vitest | 4.1.12 |
| devDependency | @types/react, @types/react-dom | 19.3.0 |
| devDependency | @types/leaflet | 1.9.22 |

No router, no state library, no i18n library, no icon package, no animation library, no `@vitejs/plugin-react` (JSX is compiled by Vite's esbuild; ADR-001). e2e lives apart in `tests/e2e/package.json` with `@playwright/test` 1.65.1. Scripts: `dev` (vite), `build` (`tsc -p tsconfig.json && vite build`), `preview`, `typecheck`, `test` (`vitest run --passWithNoTests`).

**Entry points and navigation**
- `app/index.html` (viewport with `viewport-fit=cover`, `theme-color` `#0e2135`, manifest link, three icon links, `apple-touch-icon`; lines 5-14) → `src/main.tsx` (15 lines) → `src/App.tsx` (77 lines: preference and data providers, hash navigation, bottom tab bar; Map and Lot are lazy chunks).
- Hash routes, hand-rolled (`app/src/state/nav.ts:1`): `#home`, `#map`, `#alerts`, `#learn`, `#settings`, `#setup`, `#lot/<id>`, `#strategies/<id>`. An optional query sets the replay day for deep links: `#map?d=2026-02-22` (`nav.ts:2,22`).
- Tab bar (4 tabs): Home, Map, Alerts, Learn (`tab.*` keys; `app/src/components/shell.tsx:71`). Settings opens from the gear on Home; Setup opens from Settings; Strategies opens from a lot; the reliability sheet opens from a lot.
- State: React context only. `state/prefs.tsx` (UserPrefs in `localStorage`; sets `<html data-theme>`), `state/data.tsx` (demo data, replay clock with play/pause, identity, connectivity), `state/useSnapshot.ts` (one snapshot file per screen: loading, ready with source, or missing).
- Defaults (`app/src/state/prefs.tsx:23-27`): language from `navigator.language` (Spanish if the device is Spanish, otherwise English), mode `agronomist`, theme `system`, storage `full` unless the browser asks to save data.

**Folder structure of `app/src`** (lines of code; purpose from each file's header comment)

| File | Lines | Purpose |
| --- | --- | --- |
| `App.tsx` | 77 | Shell: providers, hash navigation, tab bar, lazy Map and Lot |
| `main.tsx` | 15 | React root |
| `time.ts` | 74 | Display time: instants stored UTC, shown in America/Guayaquil (ADR-002) |
| `units.ts` (+ `units.test.ts`) | 133 | Display-only unit conversion; storage stays SI |
| `types/contracts.ts` | 986 | Generated from `pipeline/common/models.py`; never edited by hand |
| `i18n/en.ts`, `i18n/es.ts`, `i18n/index.ts`, `i18n/i18n.test.ts` | 311, 311, 29, 58 | Dictionaries, `{name}` placeholders, parity test |
| `state/nav.ts`, `state/prefs.tsx`, `state/data.tsx`, `state/useSnapshot.ts`, `state/state.test.ts` | 59, 97, 160, 22, 71 | Navigation, preferences, data and replay context, snapshot hook |
| `data/demo.ts` | 87 | The demo snapshot set: manifest, farm and every replay day, fetched on first load |
| `data/snapshots.ts` | 169 | Network first, then the IndexedDB copy; every result says where it came from |
| `data/idb.ts` | 95 | Hand-rolled IndexedDB wrapper with a memory fallback |
| `data/origin.ts` | 28 | Origin resolution: `<key>_origin`, then `origin[key]`, then `origin["*"]` |
| `data/select.ts` | 62 | Display selectors (sort, count, pick); never compute a level or W |
| `data/records.ts` | 52 | Records by default: loaded replay days kept on the device; CSV export |
| `data/reliability.ts` | 72 | Reads `verification.json` for the sheet; counts only |
| `data/strategies.ts`, `data/actions.ts` | 22, 13 | Display helpers for `strategies.json` and `actions.json` |
| `data/farmSetup.ts` | 253 | Data levels 0 to 2: pin, outline, lots (drawn, imported, typed); ids that pass the database checks |
| `data/farmStore.ts` | 68 | The device's own farm: IndexedDB on every change, then Supabase when connected |
| `data/identity.ts`, `data/hcaptcha.ts` | 166, 74 | On-demand anonymous sign-in; lazy hCaptcha loader (D-032) |
| `data/fixtures/demo-fixture.ts` | 217 | Development and test fixture, all values `synthetic` |
| `data/*.test.ts` (6 files) | — | actions, data, farmSetup, identity, reliability (Vitest) |
| `components/DataValue.tsx` | 78 | The one way a number is rendered: value + origin badge + source/time |
| `components/LevelCheck.tsx` | 42 | "What to check" for the current level; farmer or agronomist wording; `NotReviewedBadge` |
| `components/ConnectDevice.tsx` | 79 | "Connect this device for sync" with hCaptcha |
| `components/shell.tsx` | 193 | `LevelBadge`, `Segmented`, `TabBar`, `ScreenHeader`, `StatusNotices`, `ReplayDock`, `LoadGate` |
| `components/ui/*` (12 files) | — | Presentational kit (product-designer): see §12 |
| `screens/Home/Home.tsx` | 145 | Home |
| `screens/Map/MapView.tsx` | 203 | Risk map (lazy, Leaflet) |
| `screens/Lot/Lot.tsx`, `HistoryChart.tsx`, `ReliabilitySheet.tsx` | 309, 76, 117 | Lot detail, uPlot chart (lazy), reliability sheet (lazy) |
| `screens/Strategies/Strategies.tsx` | 146 | Strategies |
| `screens/Learn/Learn.tsx` | 78 | Learn |
| `screens/Setup/Setup.tsx` | 482 | Farm setup, data levels 0 to 2 |
| `screens/Other.tsx` | 165 | Alerts and Settings |
| `styles/index.css`, `tokens.css`, `theme.css` | 129, 145, 97 | Entry stylesheet, tokens, Tailwind 4 theme |

**Offline / PWA** (`app/vite.config.ts`, `app/public/manifest.webmanifest`)
- `vite-plugin-pwa` with `registerType: 'autoUpdate'`, `injectRegister: 'auto'`, `manifest: false` (the committed manifest file is used).
- Precache: `globPatterns: ['**/*.{js,css,html,webmanifest,png,svg}']`, `globIgnores: ['data/**']`, `navigateFallback: 'index.html'`. Build result: 20 entries, 612.60 KiB.
- Runtime caching: `/data/demo/` → `NetworkFirst`, cache `demo-snapshots`, `networkTimeoutSeconds: 4`, `maxEntries: 200`; `gibs.earthdata.nasa.gov` → `CacheFirst`, cache `gibs-tiles`, 800 entries, 30 days.
- Snapshots are also copied to IndexedDB by the app (`data/snapshots.ts`), so the replay works offline after one visit (e2e `offline.spec.ts`).
- Manifest: name and short_name "Demenova", `start_url` and `scope` `/`, `display: standalone`, `theme_color` `#0e2135`, `background_color` `#eef2ef`, icons 192, 512 and maskable 512.
- Install behaviour: standard browser install from the manifest; no `beforeinstallprompt` or `appinstalled` handler in `app/src` (grep: none), so there is no in-app install prompt.

**i18n**: English and Spanish; `app/src/i18n/en.ts` and `es.ts`, 285 keys each, no key missing either way (parity enforced by `i18n.test.ts`). Largest groups: setup 58, lot 34, reliability 24, strategies 21, settings 18, map 13.

**Units**: `app/src/units.ts`: `mmToIn`, `cToF`, `mToFt`, `cmToIn`, `haToAcres`, `convert(kind, si, system)`, `decimalsFor`, `formatNumber`, `displayQuantity`, `toSI` (lines 25-115). Metric is the default; the imperial toggle is in Settings (`Other.tsx:100-107`). Applied wherever a number is shown, through `DataValue`. The CSV export keeps SI values (e2e `toggles.spec.ts`).

**Storage modes**: Full and Data saver exist as a preference (`Other.tsx:122-129`). Implemented behaviour found in code: Data saver deletes the `gibs-tiles` cache when selected and at start (`state/prefs.tsx:83-86`); the default follows `navigator.connection.saveData` (`prefs.tsx:13-16`). The "7 days versus 90 days of history" split of ADR-004 was not found in code: UNKNOWN (looked in `state/prefs.tsx`, `data/records.ts`, `data/snapshots.ts`).

**Data levels**
| Level | Works? | How (evidence) |
| --- | --- | --- |
| 0 pin | Yes | Tap the map or "Use my location"; "Save pin" (`Setup.tsx:349-364`) |
| 1 outline | Yes, without zones | "Draw outline" (`Setup.tsx:371-383`); zones appear only where the engine computed them (the demo); otherwise "zones pending" (`setup.zonesPending`, `:374`) |
| 2 exact lots | Yes | "Draw lot", "Add typed lot", "Import GeoJSON" (`Setup.tsx:392-419`); typed lots without a shape stay on the device. Import formats: GeoJSON only (no KML, no CSV) |
| 3 field notes | No | Not built; tables `field_notes` and `flood_memories` exist in the schema only |
The user's own farm gets no alerts: "Alerts for your own farm need an engine run for its location. Until then, Home shows the demo farm" (`setup.alertsLater`, `Setup.tsx:470`).

**Performance** (build at `79e05f3`, §17)

| Chunk | Size | Gzip | Loaded |
| --- | --- | --- | --- |
| `assets/index-*.js` | 297.69 kB | 94.31 kB | initial |
| `registerSW.js` | 0.13 kB | 0.1 kB | initial |
| `assets/leaflet-*.js` | 149.72 kB | 43.41 kB | lazy (Map, Setup) |
| `assets/HistoryChart-*.js` (uPlot) | 53.80 kB | 24.04 kB | lazy |
| `assets/Setup-*.js` | 17.39 kB | 6.17 kB | lazy |
| `assets/Lot-*.js` | 8.29 kB | 3.03 kB | lazy |
| `assets/MapView-*.js` | 5.41 kB | 2.46 kB | lazy |
| `assets/Strategies-*.js` | 4.38 kB | 1.52 kB | lazy |
| `assets/ReliabilitySheet-*.js` | 4.34 kB | 1.79 kB | lazy |
| `assets/Learn-*.js` | 2.15 kB | 0.91 kB | lazy |
| `assets/index-*.css` | 26.26 kB | 6.22 kB | initial |
| `assets/leaflet-*.css` | 15.61 kB | 6.46 kB | lazy |
| `assets/HistoryChart-*.css` | 1.65 kB | 0.71 kB | lazy |

Initial JS 94.3 kB gzip against a 150 kB budget; demo data 1,056.6 kB against 5,000 kB (`scripts/check_bundle_size.mjs`). Measured by QA on an emulated Android (360×780, CPU 4×): usable in 2.5 s on Fast 4G (budget 3 s) and 4.4 s on Slow 4G (`docs/reports/qa/2026-11-15-0607.md`). Home waits for all 45 replay files before it renders (noted by frontend-engineer on 15 Nov). Lighthouse: no score recorded anywhere (not run).

## 12. Front end: design system and screens (most detailed)

**Design tokens** (from `app/src/styles/` and `design/`):

| Token group | Values (exact) | File |
| --- | --- | --- |
| Colours light (name → hex) | bg `#eef2ef` (Mist), surface `#ffffff`, surface-2 `#e3e9e5`, line `#d2dbd6`, line-strong `#56677a`, ink `#0e2135` (Orbit), ink-2 `#44566a`, ink-3 `#56677a`, leaf `#2a6343`, focus `#1d5fc2`, primary `#0e2135`, on-primary `#ffffff`, alluvium `#5a4a36`, starlight `#f4df8e`, skeleton `#dfe6e2` | `app/src/styles/tokens.css:12-26` |
| Colours dark | bg `#0a1726`, surface `#12233a`, surface-2 `#1a2f4a`, line `#233853`, line-strong `#8e9dab`, ink `#e7edf2`, ink-2 `#b3c0cc`, ink-3 `#8e9dab`, leaf `#86cda2`, focus `#7fb2ff`, primary `#e7edf2`, on-primary `#0a1726`, alluvium `#d9c6aa`, skeleton `#1d3150` | `tokens.css:63-78` (forced) and `:99-115` (phone setting) |
| Severity light: fill / ink / tint | normal `#3591a0` / `#0f5258` / `#dceeee`; watch `#f0c63a` / `#5c4100` / `#faefc2`; warning `#d4560a` / `#7f2e00` / `#fbe0cb`; severe `#93154f` / `#7e1046` / `#f7dce8`; stale `#8a949c` / `#3f4a55` / `#e4e9ec`; severe-solid `#93154f` with white text (8.53:1) | `tokens.css:29-45` |
| Severity dark: fill / ink / tint | normal `#72ceda` / `#93dce0` / `#0f3238`; watch `#f9da62` / `#f6d87a` / `#36300f`; warning `#ee7a26` / `#ffb680` / `#3d2412`; severe `#e0336f` / `#ff9dbf` / `#461530`; stale `#7c8893` / `#b9c3cc` / `#1d2a39` | `tokens.css:79-93` |
| Level scope | `[data-level="…"]` sets `--lvl-fill`, `--lvl-ink`, `--lvl-tint`, `--lvl-ratio` (0.25, 0.5, 0.75, 1, 0 for stale); utilities `bg-lvl-tint`, `text-lvl-ink` | `tokens.css:141-145`; `theme.css:91-93` |
| Typography | Family: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` (no web font). Scale: display 2.75rem / 1.05 / −0.02em / weight 300; title 1.75rem / 1.2 / −0.01em / 600; headline 1.25rem / 1.3 / 600; body 1.0625rem / 1.47; callout 0.9375rem / 1.34; footnote 0.8125rem / 1.38; caption 0.75rem / 1.34. Base `font-size: 1.0625rem` | `app/src/styles/theme.css:10-31`; `index.css:19` |
| Spacing, radii, elevation | Spacing: Tailwind 4 default scale (no custom spacing tokens). Radii: glyph 3px, control 10px, group 14px, sheet 22px. Shadows light: sheet `0 -1px 0 rgb(14 33 53 / 0.06), 0 -8px 24px rgb(14 33 53 / 0.08)`; banner `0 1px 2px rgb(14 33 53 / 0.08), 0 6px 16px rgb(14 33 53 / 0.1)`. Dark: sheet `0 -1px 0 rgb(0 0 0 / 0.3), 0 -8px 24px rgb(0 0 0 / 0.35)`; banner `0 1px 2px rgb(0 0 0 / 0.3), 0 6px 16px rgb(0 0 0 / 0.35)`. Demo hatch: `repeating-linear-gradient(135deg, transparent 0 3px, rgb(90 74 54 / 0.12) 3px 4px)` | `theme.css:33-37`; `tokens.css:55-59,94-96` |
| Motion | Easing `cubic-bezier(0.2, 0, 0, 1)`. Durations: press 120 ms, state 200 ms, sheet 320 ms, onset 600 ms. One orchestrated moment: `dn-ripple` (scale 1 → 2.6, opacity 0.9 → 0, 1.1 s, twice) and `dn-lot-onset` (1.1 s, twice). Reduced motion: one global rule sets `animation-duration: 0.01ms !important` and one iteration | `tokens.css:48-52`; `theme.css:39-53`; `index.css:109-111,118-123` |
| Breakpoints | None in use: no `sm:`, `md:`, `lg:` or `xl:` utility anywhere in `app/src` (grep count 0). One centred column, `max-w-3xl`, at every width | `app/src/App.tsx:60`; `components/shell.tsx:71`; `screens/Lot/ReliabilitySheet.tsx:48` |

Colours are tokens everywhere: no hex colour appears in `.tsx` files outside `styles/` (grep). Inline `style` props exist in 4 places: `DemoChip.tsx:16`, `ReplayScrubber.tsx:110`, `SeverityGlyph.tsx:30,35,47`, `Lot.tsx:179`.

**Design brief in short** (`design/BRIEF.md`, product-designer, v1 of 14 Nov; the rules any polish has to respect)

| Topic | Rule in the brief |
| --- | --- |
| Subject | "Satellite water intelligence for banana farms in coastal El Oro: from orbit to the root zone." |
| Audience | An agronomist scanning many lots on a phone or laptop; a farmer with no staff, glancing at a phone in strong equatorial sun, often one-handed |
| Primary job | Answer "is anything wrong on my farm?" in one glance, then say where and why |
| Memorable moment | During the flood replay a lot turns from calm to Severe on the map. "All boldness goes there. Everything else stays quiet." |
| Signature | The soil core: the logo is a core in section; the severity glyph is a small core in which water rises with the level (Normal 25 %, Watch 50 %, Warning 75 %, Severe full; "Out of date" is a dashed, empty core); the level can be read without colour |
| Named colours | Orbit `#0E2135` (ink, primary buttons), Mist `#EEF2EF` (page background, "not cream"), Leaf `#2A6343` (brand, links, selected tab; never severity), Starlight `#F4DF8E` (the nova in the logo only), Alluvium `#5A4A36` (the Demo chip and synthetic data), Severe `#93154F` ("the one loud colour") |
| Type | System fonts only: zero font bytes, works offline. Personality comes from large, light (300) tabular figures with a small unit. "Never below 12 px." |
| Spacing | 8-point steps 4, 8, 12, 16, 24, 32, 48, 64; touch targets at least 48 px; list rows at least 56 px; page gutter 16 px at 360 px, 24 px from 600 px |
| Radii | Sheet 22, group 14, control 10, glyph 3, chip full; nested radii shrink inwards |
| Elevation | Flat by default; hairlines separate. Only two shadows exist: `sheet` and `banner` |
| Motion | Every motion answers a touch (press 120 ms, state 200 ms, sheet 320 ms), except the one orchestrated moment (Severe onset: fill change 600 ms + ripple 1.1 s twice). With reduced motion every change is instant. "The level never depends on motion." |
| Focus | Ring `#1D5FC2` / `#7FB2FF`, 3 px with 2 px offset |

The brief's own list of "AI-default tells" it removed: (1) the four-point sparkle (replaced by a six-spike star); (2) near-black with an acid accent (the dark theme is orbit blue `#0A1726`); (3) identical rounded SaaS cards with shadows (replaced by inset grouped lists with a sentence-case header and a source line); (4) all-caps eyebrows and middle-dot meta (meta is a plain phrase); (5) monospace data labels; (6) traffic-light green/amber/red (Normal is blue-teal; each level has three cues: water height, colour, word); (7) fade-up on every section and "→" on buttons (buttons are verbs; chevrons only on rows that navigate); (8) numbered markers except for real sequences.

Measured contrast of the level ink on its tint (`design/BRIEF.md`, severity palette): light: Normal 7.39:1, Watch 8.23:1, Warning 7.25:1, Severe 7.98:1, Out of date 7.39:1; dark: 8.84, 9.47, 8.40, 7.68, 8.14. Severe banner: white on `#93154F`, 8.53:1. The light Watch fill is only 1.64:1 on white, so the fill is never the only boundary: map polygons get a level-ink stroke and a fill opacity that rises with the level (0.25, 0.40, 0.55, 0.75). Colour-blind check (Machado 2009 simulation): the weakest pair is Watch versus Warning for deutans, so the water height and the word carry the difference.

**Key copy, EN / ES** (`app/src/i18n/en.ts`, `es.ts`; the words the e2e suite and the data policy fix are marked)

| Key | EN | ES |
| --- | --- | --- |
| `level.normal` … `level.stale` (fixed) | Normal, Watch, Warning, Severe, Out of date | Normal, Vigilancia, Aviso, Severo, Desactualizado |
| `app.credit` (fixed) | Built with NASA Earth observations | Hecho con observaciones de la Tierra de la NASA |
| `common.noData` (fixed) | No data | Sin datos |
| `origin.sourced`, `origin.estimated`, `origin.synthetic` | Sourced, Estimated, Demo | De fuente, Estimado, Demo |
| `common.experimental` | Experimental | Experimental |
| `learn.notReviewed` (fixed, D-026) | General guidance — not yet reviewed by a local agronomist | Orientación general — aún no revisada por un agrónomo local |
| `strategies.disclaimer` (fixed) | Demenova supports the agronomist's judgment; it never replaces it. | Demenova apoya el criterio del agrónomo; nunca lo reemplaza. |
| `tab.*` | Home, Map, Alerts, Learn | Inicio, Mapa, Alertas, Aprender |
| `common.updated`, `common.source` | Updated {time}; Source: {source} | Actualizado {time}; Fuente: {source} |
| `w.label`, `home.highestW` | Index W; Highest W | Índice W; W más alto |
| `home.statusCard`, `home.lotsPerLevel`, `home.lots` | Status today; Lots per level; Lots by risk | Estado de hoy; Lotes por nivel; Lotes por riesgo |
| `home.topFactor`, `home.allNormal` | Top factor: {factor}; All lots are Normal | Factor principal: {factor}; Todos los lotes están en Normal |
| `check.title` | What to check | Qué revisar |
| `home.replay` | Replay | Reproducción |
| `map.layer.*` | Alert level; Wetness; Rain 24 h | Nivel de alerta; Humedad; Lluvia 24 h |
| `map.base.*`, `map.openLot` | Relief; True colour; Open lot | Relieve; Color real; Abrir lote |
| `lot.confidence` | Confidence {n} of 3 | Confianza {n} de 3 |
| `lot.why`, `lot.share` | Why; Share of W | Por qué; Parte de W |
| `lot.today`, `lot.side`, `lot.history`, `lot.facts` | Today; Side indicators; History; Lot facts | Hoy; Indicadores complementarios; Historial; Datos del lote |
| `lot.priorYears` | Comparison with prior years is not in the snapshot yet. | La comparación con años anteriores aún no está en la instantánea. |
| `lot.strategies` | See strategies for this lot | Ver estrategias para este lote |
| `reliability.open` | How reliable is this? | ¿Qué tan confiable es esto? |
| `reliability.leadTitle`, `reliability.limitTitle` | Warning time; Known limit | Tiempo de aviso; Límite conocido |
| `strategies.option`, `strategies.notEstimated` | Option {label}; Not estimated | Opción {label}; Sin estimar |
| `strategies.details`, `strategies.evidence` | Why, evidence, gaps and risks; Evidence | Por qué, evidencia, vacíos y riesgos; Evidencia |
| `alerts.log`, `alerts.empty` | Level changes; No alerts yet | Cambios de nivel; Aún no hay alertas |
| `alerts.channels` | Email and Telegram settings arrive with the backend work. | Los ajustes de correo y Telegram llegan con el trabajo del backend. |
| `learn.datasets` | Where the data comes from | De dónde vienen los datos |
| `setup.step.pin`, `.outline`, `.lots` | Drop a pin; Trace the farm outline (optional); Add exact lots (optional) | Ubica un pin; Dibuja el contorno de la finca (opcional); Agrega lotes exactos (opcional) |
| `setup.savePin`, `setup.useGps` | Save pin; Use my location | Guardar pin; Usar mi ubicación |
| `setup.drawOutline`, `setup.drawLot`, `setup.typeLot`, `setup.importLots` | Draw outline; Draw lot; Add typed lot; Import GeoJSON | Dibujar contorno; Dibujar lote; Agregar lote escrito; Importar GeoJSON |
| `setup.reset` | Delete my farm and show only the demo farm | Borrar mi finca y mostrar solo la finca demo |
| `settings.*` | Farm setup; Language; Units; Mode; Storage; Theme | Configurar finca; Idioma; Unidades; Modo; Almacenamiento; Tema |
| `records.export` | Export records (CSV) | Exportar registros (CSV) |
| `connect.button` | Connect this device for sync | Conectar este dispositivo para sincronizar |
| `connect.unconfigured` | Sync is not configured on this build. Your data stays on this device. | La sincronización no está configurada en esta versión. Tus datos quedan en este dispositivo. |

**Tests that constrain a redesign** (`tests/e2e/specs/`, Playwright on four viewports: 360×780, 393×852, 820×1180, 1440×900; `app/src/**/*.test.ts`)

| Spec | What it asserts (a visual change that breaks it needs a test update by qa-demo-engineer) |
| --- | --- |
| `replay.spec.ts` | The replay opens on 23 Feb 2026; scrubbing from 20 Jan matches the committed snapshots on every day a level changes; each level shows its colour and its word in en and es |
| `screens.spec.ts` | Every number on a screen carries an origin badge and a timestamp; Strategies shows three options, the not-reviewed badge and the footer |
| `reliability.spec.ts` | The sheet's counts equal `verification.json`; no POD/FAR/CSI and no percentages |
| `sweep.spec.ts` | All screens in en and es: no raw keys, no "NaN"/"undefined"/"null", no NASA logo, the credit in words, the former team member never named |
| `toggles.spec.ts` | Language, units (CSV stays SI), farmer/agronomist mode (farmer hides W numbers), data saver |
| `offline.spec.ts` | After one visit the replay, scrubbing and Lot detail work offline with the offline notice |
| `setup.spec.ts` | Pin, outline, typed lot, GeoJSON import, confidence badge steps up, reset (a helper hard-codes the " · " badge separator, `:9`) |
| `performance.spec.ts` | Usable under 3 s on Fast 4G + CPU 4× (run alone with `--workers=1`) |
| `build.spec.ts` | `app/dist` matches the committed snapshots |
| `i18n.test.ts`, `actions.test.ts`, `reliability.test.ts` (Vitest) | en/es key parity; the D-026 wording; the sheet's explanations contain no digits |

**Logo**: option 1 "Core" was chosen (D-015): `design/logo/option-1-core.svg`, with `icon-core.svg` and `icon-core-maskable.svg`; the other two options (`option-2-torn-leaf.svg`, `option-3-nova-d.svg`) remain in `design/logo/`. Icons: `app/public/icons/icon.svg`, `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`, linked in `app/index.html:12-14` and the manifest. Inside the app no logo or wordmark is rendered: the Home header is the farm name with a gear (`Home.tsx:20,47`), and the brand shows only as the "soil core" severity glyph (`components/ui/SeverityGlyph.tsx`).

**Component inventory** (`app/src/components/` and `ui/`):

| Component | Purpose | Props (key ones) | States handled | Used in screens | File |
| --- | --- | --- | --- | --- | --- |
| `DataValue`, `OriginBadge` | A number with its origin badge, source and time | kind, si, origin, source, at, label, size, decimals, showMeta, missingReason, hideBadge | missing ("No data" + reason), demo (Demo chip), unknown origin shown as missing | Home, Lot, Map, Alerts/Settings, Reliability, Setup, Strategies | `components/DataValue.tsx` |
| `LevelCheck`, `NotReviewedBadge` | "What to check" for the current level; the not-reviewed badge | — | farmer / agronomist wording; no check for stale or uncovered levels | Home, Lot; badge also Strategies | `components/LevelCheck.tsx` |
| `ConnectDevice` | On-demand sign-in with hCaptcha | — | unconfigured, offline, captcha load/failed/expired/closed, Supabase refused, done (`connect.*` keys) | Settings, Setup | `components/ConnectDevice.tsx` |
| `LevelBadge` | Severity badge with dictionary words | — | 5 levels incl. "Out of date" | Home, Lot, Map, Alerts | `components/shell.tsx` |
| `Segmented` | Segmented control | — | — | Lot (1W/1M/3M), Map (layer, base), Settings | `components/shell.tsx` |
| `TabBar` | Bottom tab bar, 4 tabs | — | active tab | App | `components/shell.tsx:71` |
| `ScreenHeader` | Title, back link, trailing action | — | — | Home, Learn, Lot, Alerts/Settings, Setup, Strategies | `components/shell.tsx` |
| `StatusNotices` | Development-fixture notice; "Offline, showing data from {time}" | — | fixture, offline, cached copy | Home, Lot, Map, Alerts | `components/shell.tsx` |
| `ReplayDock` | Wraps the scrubber | — | — | Home, Map, Alerts | `components/shell.tsx` |
| `LoadGate` | Loading / missing snapshot / load error with Retry | — | loading, missing ("snapshot not available"), error | Home, Lot, Map, Alerts | `components/shell.tsx` |
| `AlertBanner` | Home banner, only for Warning or Severe; Severe is the one solid fill | level, title, reason, meta, lang, label, onOpen, onset | warning, severe; onset ripple | Home | `components/ui/AlertBanner.tsx` |
| `Button` | Verb buttons, 48 px minimum height | variant | — | 7 files | `components/ui/Button.tsx` |
| `Card` | Inset group: header above, surface, source line below | title, headingLevel, action, footer, padded | — | 8 files | `components/ui/Card.tsx` |
| `DemoChip` | Hatched "Demo" label for synthetic content | lang | demo | Home, DataValue | `components/ui/DemoChip.tsx` |
| `EmptyState` | Empty, offline, error and missing blocks with a next action | tone, title, body, action | empty, offline, missing, error | 10 files | `components/ui/EmptyState.tsx` |
| `List`, `ListRow` | Rows of an inset group, 56 px minimum, chevron when they navigate | leading, title, subtitle, trailing, onPress | title and subtitle truncate on one line (`ListRow.tsx:37-38`) | Home, Lot, Alerts, Reliability, Setup | `components/ui/ListRow.tsx` |
| `MissingData` | The words "No data" and a reason; never a dash or zero | lang, reason, variant | missing | Lot, Strategies | `components/ui/MissingData.tsx` |
| `ReplayScrubber` | Day bars coloured by worst level, play button, date, native range input | days, index, dateLabel, onIndexChange, playing, onTogglePlay, loading, demo, lang | loading, demo, playing | via `ReplayDock` | `components/ui/ReplayScrubber.tsx` |
| `SeverityBadge` | Soil core + level word on the level tint | level, lang, label, size, variant, glyph, onset | 5 levels | via `LevelBadge` | `components/ui/SeverityBadge.tsx` |
| `SeverityGlyph` | The soil core: water rises with the level; decorative | level, size, inverse, onset | 5 levels; onset ripple | via badge and banner | `components/ui/SeverityGlyph.tsx` |
| `Value` | Light tabular figures with a small unit | value, unit, label, size, meta, missingReason, lang | missing | via `DataValue` | `components/ui/Value.tsx` |

**Screens** (line numbers are where each element's text key is first used)

```text
Screen: Home
Route: #home
File(s): app/src/screens/Home/Home.tsx
Layout top to bottom: gear link to Settings (:20) · title = the farm name, "Finca Demo El Oro" (fallback "Farm
  status", :47), with Demo chip and "Updated {time}" (:50) · status notices (fixture / offline) · AlertBanner for the worst lot when Warning or
  Severe: level word, lot name, "Top factor: {factor}", time (:41) · "What to check" card (LevelCheck, not-reviewed
  badge + origin badge + source line) · "Status today" card (:75): "Highest W" as a display number with origin badge
  (:86), "Lots per level" badges with counts (:90) · source line · "Lots by risk" list (:109): level badge, lot name,
  top factor, W with origin badge, chevron · "Replay" dock (:138): play button, date, day bars, "Jan 20 … Mar 5",
  Demo chip · fixed tab bar.
Interactions: banner and rows open the lot; play/pause and drag on the scrubber; gear opens Settings.
States implemented: loading, missing snapshot (Retry), load error, offline with cache time, all Normal
  ("All lots are Normal", :106), no units (:111); farmer mode hides W numbers (isAgronomist, :43).
Copy (EN / ES): "Status today" / "Estado de hoy"; "Highest W" / "W más alto"; "Lots per level" / "Lotes por nivel";
  "Lots by risk" / "Lotes por riesgo"; "What to check" / "Qué revisar"; "Replay" / "Reproducción".
Known issues / rough edges: at 360 and 393 px the row subtitle truncates ("Top factor: Upstream…") because the
  level badge and the trailing W + badge take the width (CL-01, CL-02); "What to check" sits above "Status today",
  so "Highest W" is not in the first view (CL-03); the "What to check" source line is cut with "…"; on desktop the
  check paragraph runs about 95 characters per line (CL-22); "Lots per level" wraps (CL-13); Home renders only
  after all 45 replay files load.
Screenshot files: home-{light,dark}-{393,360,1440}.png
```

```text
Screen: Risk map
Route: #map (deep link #map?d=YYYY-MM-DD)
File(s): app/src/screens/Map/MapView.tsx (lazy chunk; Leaflet)
Layout top to bottom: title "Risk map" (:135) · "Layer" segmented: Alert level / Wetness / Rain 24 h (:137-143) ·
  base segmented: Relief / True colour (:147-152) · "Data from {date} · Source: …" (:156-157, 2 lines clamp) ·
  imagery attribution "Imagery: NASA GIBS ({layer}). Built with NASA Earth observations." (:159) · Leaflet map with
  lot polygons coloured by level and a label with the level word on each lot · selected-lot panel: name, level
  badge, "Index W" value, "Open lot" button, Close (:170-194) · replay dock over the map · tab bar.
Interactions: tap a lot to select; "Open lot"; switch layer and base; zoom; scrub or play the replay.
States implemented: loading, missing, error, no units (:162), offline notice.
Copy (EN / ES): "Risk map" / "Mapa de riesgo"; "Alert level" / "Nivel de alerta"; "Wetness" / "Humedad";
  "Rain 24 h" / "Lluvia 24 h"; "Relief" / "Relieve"; "True colour" / "Color real"; "Open lot" / "Abrir lote".
Known issues / rough edges: at 360 px two segmented controls and two text lines sit above the map, which squeezes
  it (CL-04); each label box covers its lot (CL-05); the relief base map is a coarse grey texture at this zoom; the
  Wetness and Rain layers have neutral outlines with labels, no colour scale (frontend report 14 Nov); no month
  view / risk calendar (SPEC 18).
Screenshot files: map-{light,dark}-{393,360,1440}.png
```

```text
Screen: Lot detail
Route: #lot/<id> (e.g. #lot/lot_demo-el-oro_1)
File(s): app/src/screens/Lot/Lot.tsx, HistoryChart.tsx (lazy, uPlot)
Layout top to bottom: "Back" · lot name · level badge + "Confidence {n} of 3" (:169) · card "Index W" (:176):
  display number, source + updated line, origin badge, a bar filled to W (:179), "Level since {time} · Newest rain
  data: {time}" (:184-186) · source line again under the card · "What to check" card (LevelCheck) · button "How
  reliable is this?" (:194) · "Why" (:202): the two top factors with "Share of W" in % and origin badges (:211) ·
  "Today, {date}" (:222): Local rain, Upstream rain 24 h, Soil moisture ("No data"), Water balance 7 days · "Side
  indicators" (:241): "Sigatoka weather" with a level badge and an "Experimental" badge (:243-244) · "History"
  (:83): segmented 1W / 1M / 3M, charts Rain, Soil moisture ("No data"), Mean temperature, NDVI, each with an
  origin badge; "Comparison with prior years is not in the snapshot yet." (:110) · "Lot facts" (:254): Area (Demo),
  Plant age, Drainage, Drainage works, Cover crop, Last soil analysis (all "No data") · button "See strategies for
  this lot" (:293).
Interactions: range switch; open the reliability sheet; open strategies; back.
States implemented: lot not found (:156), loading, no history (:77), missing values, offline; farmer mode hides the
  agronomist detail (isAgronomist, :140).
Copy (EN / ES): "Why" / "Por qué"; "Share of W" / "Parte de W"; "Today" / "Hoy"; "Side indicators" /
  "Indicadores complementarios"; "History" / "Historial"; "Lot facts" / "Datos del lote"; "See strategies for this
  lot" / "Ver estrategias para este lote"; "How reliable is this?" / "¿Qué tan confiable es esto?".
Known issues / rough edges: the same source line appears inside the W card and again below it (CL-15); "Today"
  labels wrap to three lines at 360 to 393 px ("Upstream rain, 24 h", "Water balance, 7 days") (CL-14); the NDVI
  chart holds one or two points; soil moisture is always "No data"; six of seven lot facts are "No data" (synthetic
  farm); no comparison with prior years.
Screenshot files: lot-{light,dark}-{393,360,1440}.png
```

```text
Screen: "How reliable is this?" sheet
Route: opened from Lot detail (no route of its own)
File(s): app/src/screens/Lot/ReliabilitySheet.tsx (lazy), app/src/data/reliability.ts
Layout top to bottom: title (:51) and "Close" (:54) · intro (:63) · "Checked against documented floods in the
  farm's catchment" with the period (:66-68): floods with an alert, floods without, alerts without a flood, each a
  DataValue read from verification.json · counts-only and false-alarm notes (:77) · events list (:81) · "Do small
  changes in the weights change the result?" (:96-97) · "Warning time" (:101-102) · "Known limit" (:106-107) ·
  Severe-is-a-design-choice line (:111).
Interactions: Close button, Escape. A div dialog with manual focus handling, not a native <dialog>; no drag.
States implemented: loading (:58), verification file missing (:59), a count not in the file (:17).
Copy (EN / ES): "Warning time" / "Tiempo de aviso"; "Known limit" / "Límite conocido"; "Do small changes in the
  weights change the result?" / "¿Cambia el resultado con pequeños cambios en los pesos?"; "Close" / "Cerrar".
Known issues / rough edges: long text sheet; the explanations contain no numbers by design (a unit test forbids
  digits in them), so the numbers are quoted from the file's notes.
Screenshot files: lot-reliability-{light,dark}-{393,360,1440}.png (viewport, sheet open)
```

```text
Screen: Strategies
Route: #strategies/<lot id>
File(s): app/src/screens/Strategies/Strategies.tsx (lazy), app/src/data/strategies.ts
Layout top to bottom: title "Strategies" (:124) · one card per option (A current management, B improved drainage,
  C drainage + living cover + bio-inputs): "Option {label}" (:61), scores "{n} of 5" with origin badge (:35), cost
  and labour "Not estimated" (:31), "Why, evidence, gaps and risks" (:82), "Evidence" with sources and access dates
  (:86-98), "Not yet reviewed by a local agronomist" badge · source line (:135) · fixed footer "Demenova supports
  the agronomist's judgment; it never replaces it." (:142).
Interactions: open the details block of a card; back.
States implemented: loading (:128), none for this lot (:130), missing values.
Copy (EN / ES): "Strategies" / "Estrategias"; "Option {label}" / "Opción {label}"; "Not estimated" / "Sin
  estimar"; "Why, evidence, gaps and risks" / "Por qué, evidencia, vacíos y riesgos".
Known issues / rough edges: lettered A/B/C discs read as a ranking that is not one (CL-17); scores are Claude
  drafts tagged estimated; no priority sliders and no ranking by score (SPEC 17, 18); cost and labour never shown.
Screenshot files: strategies-{light,dark}-{393,360,1440}.png
```

```text
Screen: Alerts
Route: #alerts
File(s): app/src/screens/Other.tsx (:29-59)
Layout top to bottom: title "Alerts" (:29) · "Level changes" list (:35): one row per level change in the replay up
  to the current day (:46) · note "Email and Telegram settings arrive with the backend
  work." (:59) · replay dock.
Interactions: scrub the replay; rows are not links.
States implemented: "No alerts yet" with a body (:37), loading, offline.
Copy (EN / ES): "Alerts" / "Alertas"; "Level changes" / "Cambios de nivel"; "No alerts yet" / "Aún no hay alertas".
Known issues / rough edges: no email or Telegram settings here although SPEC 17 and 18 place them on this screen;
  the note above is the only trace.
Screenshot files: alerts-{light,dark}-{393,360,1440}.png
```

```text
Screen: Learn
Route: #learn
File(s): app/src/screens/Learn/Learn.tsx (lazy)
Layout top to bottom: title "Learn" (:21) · "General guidance — not yet reviewed by a local agronomist. …" (:23) ·
  one card per glossary term from glossary.json with the not-reviewed line (:38), its source (:44-47) and an origin
  badge · "Where the data comes from" (:57): dataset list with links (:66) · "Built with NASA Earth observations"
  (:74).
Interactions: links to dataset pages.
States implemented: loading (:24), glossary missing (:25).
Copy (EN / ES): "Learn" / "Aprender"; "Where the data comes from" / "De dónde vienen los datos".
Known issues / rough edges: the same caveat repeats on every card (CL-23); the single Fusarium TR4 line points to
  Agrocalidad and nothing else by rule (D-025); no long-form Learn cards.
Screenshot files: learn-{light,dark}-{393,360,1440}.png
```

```text
Screen: Farm setup (onboarding, data levels 0 to 2)
Route: #setup (opened from Settings)
File(s): app/src/screens/Setup/Setup.tsx (lazy, 482 lines), app/src/data/farmSetup.ts, farmStore.ts
Layout top to bottom: title "Farm setup" (:331) with a level and confidence badge (:42) · intro "Add what you know;
  every step can be skipped and revisited…" (:339) · step "Drop a pin" (:349): farm name input (:352), map, "Use my
  location" (:364), "Save pin" (:309) · step "Trace the farm outline (optional)" (:371): "Draw outline" / redraw /
  remove (:379-383), zones shown or pending (:374) · step "Add exact lots (optional)" (:392): lot name, area, age
  inputs (:396-405), "Draw lot" (:413), "Add typed lot" (:416), "Import GeoJSON" (:419), list of lots with remove
  (:439-449) · "Sync" card with ConnectDevice (:462-463) · "your data" and "alerts later" notes (:469-470) ·
  "Delete my farm and show only the demo farm" (:473) · privacy note (:478).
Interactions: map taps to place the pin and draw shapes (Finish, Undo, Cancel, :314-322); GPS; file import; reset
  with confirmation (:286).
States implemented: GPS unavailable (:219), name needed (:237), fewer than three points (:246), import too big
  (:276), sync states syncing / failed / synced / pending / device only (:297-300), reset done / remote failed (:292).
Copy (EN / ES): "Farm setup" / "Configurar finca"; "Drop a pin" / "Ubica un pin"; "Trace the farm outline
  (optional)" / "Dibuja el contorno de la finca (opcional)"; "Add exact lots (optional)" / "Agrega lotes exactos
  (opcional)"; "Save pin" / "Guardar pin"; "Use my location" / "Usar mi ubicación"; "Import GeoJSON" / "Importar
  GeoJSON"; "Sync" / "Sincronización".
Known issues / rough edges: the longest screen and the largest key group (58); the app computes nothing for an own
  farm (no area from a drawn shape, no zones, no alerts); the badge separator " · " is asserted by an e2e helper
  (tests/e2e/specs/setup.spec.ts:9), so changing it needs a test update.
Screenshot files: setup-{light,dark}-{393,360,1440}.png
```

```text
Screen: Settings
Route: #settings (gear on Home)
File(s): app/src/screens/Other.tsx (:82-161)
Layout top to bottom: title "Settings" (:89) · "Farm setup" row with a body (:91-92) · Language (:97) · Units:
  Metric / Imperial (:100-107) · Mode: Farmer / Agronomist (:111-118) · Storage: Full / Data saver (:122-129) ·
  Theme: System / Light / Dark (:133-141) · "Records" card: body, saved count, "Export records (CSV)", note
  (:145-153) · "Device" (:155): identity status + ConnectDevice · "Built with NASA Earth observations" (:161).
Interactions: segmented controls; CSV export; Connect (loads hCaptcha only on tap).
States implemented: identity pending, signed in, local only, unconfigured (:82-85).
Copy (EN / ES): "Settings" / "Ajustes"; "Language" / "Idioma"; "Units" / "Unidades"; "Mode" / "Modo"; "Storage" /
  "Almacenamiento"; "Theme" / "Tema"; "Records" / "Registros"; "Export records (CSV)" / "Exportar registros (CSV)";
  "Connect this device for sync" / "Conectar este dispositivo para sincronizar".
Known issues / rough edges: Settings is not in the tab bar (reachable only from the Home gear); the CSV covers the
  demo replay days only.
Screenshot files: settings-{light,dark}-{393,360,1440}.png
```

## 13. Front-end polish context

**Screenshots** (captured with Playwright from a production build of `79e05f3`, English, device scale 1): 54 PNG files, 6.22 MB, in `docs/extract/screenshots/<screen>-<theme>-<width>.png`, plus `index.json` (file list, sizes, 0 failures, 0 console errors).
- Screens: `home`, `map`, `lot` (lot 1), `lot-reliability` (sheet open), `strategies` (lot 1), `alerts`, `learn`, `setup`, `settings`.
- Themes: `light`, `dark`. Widths: `393` (393×852, iPhone 14 Pro), `360` (360×780, Android), `1440` (1440×900).
- All are full-page captures except `lot-reliability` (viewport). Capture artefact: the fixed tab bar is drawn where the first viewport ends, so it appears as a band across the middle of long pages; it is not a layout bug.
- Not captured: Spanish, farmer mode, the selected-lot panel on the map, empty and offline states.

**Visual problems found in code or screenshots**

| # | Problem | Where |
| --- | --- | --- |
| 1 | List rows truncate both title and subtitle on one line; at 360 and 393 px the Home subtitle reads "Top factor: Upstream…" | `app/src/components/ui/ListRow.tsx:37-38`; `home-light-393.png` |
| 2 | Reduced motion is one global kill (`animation-duration: 0.01ms !important`), which also removes helpful fades | `app/src/styles/index.css:118-123` |
| 3 | The Severe ripple replays on every scrubbed day and on every open of an already-Severe lot (keyed by date; `onset` is only `level === 'severe'`) | `AlertBanner` use in `Home.tsx`; `components/ui/SeverityGlyph.tsx:34` |
| 4 | `SeverityGlyph` animates SVG `y` and `height` with an inline transition (paint-tier, off the motion tokens) | `components/ui/SeverityGlyph.tsx:47` |
| 5 | Map labels are boxes that cover the small lots; with many lots they pile up | `screens/Map/MapView.tsx`; `map-light-360.png` |
| 6 | At 360 px the map gets the lower part of the screen only: two segmented controls and two caption lines sit above it | `MapView.tsx:137-159` |
| 7 | "Today" grid labels wrap to three lines at phone widths | `screens/Lot/Lot.tsx:222-240`; `lot-dark-393.png` |
| 8 | The source line is shown twice around the W card | `Lot.tsx:176-190` |
| 9 | Desktop: a single 768 px column on a 1440 px screen, no breakpoints; the tab bar is a full-width band whose items align to the column | `App.tsx:60`; `components/shell.tsx:71`; `home-light-1440.png` |
| 10 | Desktop: the "What to check" paragraph runs about 95 characters per line (Impeccable detector) | `components/LevelCheck.tsx` |
| 11 | Long source lines are cut with "…" in the middle of a sentence (the "What to check" footer; the map caption) | `components/LevelCheck.tsx`; `MapView.tsx:155` (`line-clamp-2`) |
| 12 | 12 px text (`text-caption`) is used 8 times and 13 px (`text-footnote`) 42 times; both are small outdoors | grep in `app/src` |
| 13 | Text joined with " · " and em dashes in ten places | `design/upgrade/copy-proposals.md` (CL-07) |
| 14 | Strategy cards carry lettered discs A/B/C | `screens/Strategies/Strategies.tsx:61` |

Not found: off-token colours (none), kit controls under 44 px (`Button` 48 px minimum, `ListRow` 56 px minimum, per their header comments; sizes on the rendered screens were not measured), missing reduced-motion handling (present but blunt, row 2), contrast failures (every status pair is listed at 7:1 or better in `design/BRIEF.md`; the detector's one contrast warning measured 8.9:1). Layout shift was not measured.

**Still generic or "AI-default"** (from the designer's Impeccable critique and Taste pass, `design/upgrade/critique-a3.md`: Nielsen score 26/40, technical audit 14/20): the same inset card on eight screens; middle-dot joins and em dashes in copy; lettered option markers on Strategies; a caveat repeated on every Learn card; the check text placed above the status number on Home; no desktop layout beyond the phone column. The system font stack is a deliberate `design/BRIEF.md` choice, not an oversight.

**Change list already being applied on `block/3-polish`** (`design/upgrade/CHANGE_LIST.md`; PD = product-designer, FE = frontend-engineer; do not repeat these in new polish advice)

| ID | P | Owner | Change (short) |
| --- | --- | --- | --- |
| CL-01 | P1 | FE | Home and Alerts rows: level word and core via `ListRow` props; the lot name shows in full |
| CL-02 | P1 | FE | Trailing column: W on top, origin badge under it, at most 64 px wide at 360 |
| CL-03 | P1 | FE | Home order as SPEC 18: header, banner, status today, lots by risk, replay; "What to check" moves below the lots |
| CL-04 | P1 | FE | Map at 360: base switch and imagery credit move onto the map; the map gets at least 55 % of the viewport |
| CL-05 | P1 | FE | Map labels as a top tooltip (glyph + level word) that no longer covers the lot |
| CL-06 | P1 | FE | Severe moment implemented as picked ("Flood") |
| CL-07 | P1 | FE | Copy proposals applied in en and es; middle-dot joins replaced |
| CL-08 | P1 | PD | Reduced motion: token-level fallbacks replace the global 0.01 ms rule (movement to 0, colour and opacity fades stay) |
| CL-09 | P1 | PD | `SeverityGlyph`: water rise on motion tokens; no square ripple ring |
| CL-10 | P1 | PD | `ListRow`: optional `level` and `levelLabel` props |
| CL-11 | P1 | PD | `.dn-map-label` CSS (surface background, level-ink text and border) |
| CL-12 | P2 | PD | `Card` footer accepts several lines |
| CL-13 | P2 | FE | Home "Lots per level": four equal columns, no wrapping at 360 |
| CL-14 | P2 | FE | Lot "Today": label left, value right, one row per measure |
| CL-15 | P2 | FE | Lot: one source line for the W card |
| CL-16 | P2 | FE | Desktop: tab bar content aligned to the content column |
| CL-17 | P2 | FE | Strategies: drop the A/B/C discs; "Current" as a neutral tag |
| CL-18 | P2 | PD | Dark shadows softened (orbit-tinted, 1 px top highlight) |
| CL-19 | P2 | PD | Motion tokens as Tailwind utilities (durations, three easings) |
| CL-20 | P2 | PD | Phone baseline in `index.css`: `touch-action: manipulation`, no text selection on buttons, inputs at least 16 px |
| CL-21 | P2 | PD | Press states: `Button` scale 0.97, `AlertBanner` scale 0.985 |
| CL-22 | P2 | FE | Prose capped at 65ch on desktop |
| CL-23 | P3 | FE | Learn: drop the repeated per-card caveat if no test asserts it |
| CL-24 | P3 | PD | Replay scrubber edge bars |
| CL-25 | P1 | FE | Severe ripple only on a real transition (not on every scrubbed day or lot open) |
| CL-26 | P2 | PD | Move paint-tier animations (`stroke-width`, SVG `y`/`height`) to transforms |
| CL-27 | P2 | FE | Map lot sheet enters from the bottom edge |
| CL-28 | P2 | PD | Map legend when labels collide |
| CL-29 | P1 | FE | Flood on the map, only when a lot becomes Severe on a forward one-day step |
| CL-30 | P1 | PD | Tokens and CSS for the Flood (`--dn-dur-flood` 700 ms, `--dn-dur-spill` 900 ms, `--dn-delay-spill` 560 ms) |

Also done on `block/3-polish` in phase A (frontend-engineer, commits `377df53`, `6210e77`, `adabfac`): phone fixes (`theme-color` per colour scheme, safe-area insets, tap feel, overscroll), a development-only worst-case data toggle (`?data=worst|empty|one|offline`), map labels that de-clutter at 40 lots, error and empty states that say what happened, and 10 of 12 copy proposals.

**Open UI tasks**
- `design/upgrade/CHANGE_LIST.md` on `block/3-polish`: 30 items (P1 14, P2 14, P3 2; frontend-engineer 18, product-designer 12). By 09:30 on 15 Nov the designer reported ten of its items done (commits `2e5b1d1` and `750d4b6`: motion tokens, reduced-motion fallbacks, map label CSS, ui components). The rest are in progress, with QA planned after.
- Severe moment: the designer picked "Flood" (water rises inside the lot on the map for 700 ms, one ring at 560 ms fading over 900 ms; only on a forward day step). Prototype: `design/prototypes/severe-moment.html`. Roberto may override before 15:00.
- Not planned in block 3: map month view, prior-year comparison, priority sliders, KML/CSV import, data level 3, email and Telegram settings UI.
- `TASKS.md`: T-044 still needs Roberto's device checklist on the iPhone 14 Pro and iPad Air M2 (`docs/reports/qa/DEVICE_CHECKLIST.md`) and one Lighthouse run.

**Roberto's notes about the UI**: none found in `docs/HANDOFF.md` or the reports. His only recorded UI instruction is D-033: upgrade the frontend with Emil Kowalski's skills, Impeccable, the Taste skill and the Playwright MCP, "USE THEM FULLY except for Figma". Two items wait for him: confirm the inferred users and principles in `PRODUCT.md`, and choose between "Flood" and "Ripple" (`docs/reports/product-designer/2026-11-15-0925.md`).

## 14. Deviations from the SPEC

| SPEC item | As built | Why (decision id or report) |
| --- | --- | --- |
| Severe at W ≥ 0.80 (`docs/spec/12`, `16`) | Severe at W ≥ 0.90; leaves Severe below 0.80 | D-029 (design choice after viewing the replay; 7 of 8 lots sat at Severe the whole window at 0.80) |
| Alert weights from the agronomist's AHP matrix (method 13) | Fixed SPEC starting weights 0.35 / 0.25 / 0.20 / 0.10 / 0.10 tagged `design`; `ahp.py` unused; a ±0.10 sensitivity check instead | D-024 (no expert) |
| Replay 15 Feb to 5 Mar 2026 | Replay 20 Jan to 5 Mar 2026 | D-029 (so the demo shows escalation) |
| "Caught the February 2026 flood in replay" (`docs/spec/09` intro) | No flood-specific lead time; verification shown as counts (1 hit, 0 misses, 4 false alarms) | `docs/reports/science/2026-11-15-0356-t025-engine.md` (M1, M2) |
| Upstream signal = Curve Number runoff (method 3) | Percentile of the 72 h catchment rain sum; the CN function exists but no curve number is available | `config/alerts.yaml:35` (pending) |
| Soil saturation from SMAP, API fills gaps (method 5) | API only; SMAP not used; soil moisture shown as "No data" | D-019 |
| Water balance P − ETc − D (method 7) | P − ETc; drainage D is pending | `config/alerts.yaml:53` |
| IMERG products mixed by period | One product end to end: IMERG Early daily V07 | `docs/reports/science/2026-11-14-2252.md` (B1) |
| Cold-stress indicator (method 10) | Heat units computed; no level; nothing shown | Science review M4; D-024 |
| Sigatoka Watch | Built, labelled "Experimental" | D-024 |
| NDWI (method 12, optional) | Not built | Scope (D-028) |
| Thresholds calibrated on flood memory (method 14) | Not calibrated; counts against one documented flood on the farm's river; lag 0 days calibrated on that event | D-024; four events are too few |
| ECOSTRESS, Landsat/HLS, MODIS/VIIRS, GRACE, ERA5, GAEZ, SoilGrids in the data architecture | Verified in `config/datasets.yaml`, not used; GAEZ unverified | `docs/reports/data-engineer/2026-11-14-1932.md` |
| Kc about 1.05 (SPEC, FAO-56 Table 17) | `kc_banana` 1.10 (FAO-56 Table 12) | `docs/reports/instructor/2026-11-15-1400.md`; `config/alerts.yaml:52` |
| Data levels 0 to 3 | Levels 0 to 2; level 3 (field notes, past floods) not built | D-028 |
| Import GeoJSON, KML, CSV | GeoJSON only | `docs/reports/instructor/2026-11-15-1400.md` |
| Strategies with priority sliders, ranking by score, costs and labour | Three fixed cards per lot; scores are drafts tagged estimated; cost and labour "Not estimated"; badge "Not yet reviewed by a local agronomist" | D-023, D-025, D-028 |
| Farmer mode shows "one recommended action" | A "What to check" card in both modes (wording by mode); checks only, never products or doses | D-025; commit `3ccd75c` |
| Alerts screen with email and Telegram settings | Log of level changes only; no in-app email sign-up; Severe emails go to the operator address `ALERT_EMAIL_TO` | `app/src/screens/Other.tsx:59`; `backend/README.md` |
| Telegram bot | Not built; `/telegram/webhook` returns 501 | D-028 (nice-to-have) |
| Map month view (risk calendar); prior-year comparison in History | Not built; the screen says so | `app/src/screens/Lot/Lot.tsx:110` |
| Anonymous sign-in on first launch (ADR-003) | Sign-in only on demand, behind hCaptcha | D-032 |
| Hourly pipeline in GitHub Actions feeding live alerts | Workflow exists; the live ingest and scoring step is a marked TODO; the app shows a frozen replay | `.github/workflows/pipeline.yml:72-80` |
| App reads Supabase or static snapshots | Static snapshots only for the demo; Supabase holds a seeded copy and the user's own farm | `app/src/data/farmStore.ts` |
| Data saver keeps 7 days of history (ADR-004) | Only the map-tile cache rule was found in code | `app/src/state/prefs.tsx:83-86` |
| Spanish as the field default language | Device language: Spanish if the phone is Spanish, otherwise English | `app/src/state/prefs.tsx:23` |
| Human agronomist approves domain content | No human review: every item `human_review: none`, shown as "not yet reviewed"; open questions in `domain/review-queue.md` | FIX2.md; D-022, D-025 |
| Flood memories from the farm | Four press-documented floods only (`observed`) | D-024; `domain/flood_memories.yaml` |
| Demo lots to be redefined by the agronomist | Synthetic lots are final for v1 | D-022 |
| Contracts v1 | Contract 1.2.0: added `telegram_code`, `sensitivity`, `side.experimental`, `reviewed_by`, `human_review` | D-020, D-030 |
| Engine file names in `CONTRACTS.md:22-23` | Different module names (§3) | — |
| Device test on the agronomist's Android phone | Android by emulation (360×780, CPU 4×, Slow 4G); iPhone and iPad checklist still open | D-026 |

## 15. Backend, alerts and deployment

**FastAPI endpoints** (`backend/app/main.py`)

| Method | Path | Auth | What it does |
| --- | --- | --- | --- |
| GET | `/health` (`:131`) | none | `{"status":"ok"}` |
| POST | `/run` (`:149`) | header `X-Admin-Token`, constant-time compare; a token shorter than 32 characters counts as unset, so the endpoint stays closed | 202; sends pending Severe emails in the background. It does not start an engine run. 503 when the database is missing or unreachable |
| POST | `/email/test` (`:179`) | `X-Admin-Token` | Sends one test email built from the demo farm's latest real Severe event; at most one call per 60 s (429); never writes `email_log` |
| POST | `/telegram/webhook` (`:208`) | — | 501 Not Implemented |

`/docs`, `/redoc` and `openapi.json` are disabled (`docs_url=None, redoc_url=None, openapi_url=None`, `backend/app/main.py:54`); no CORS middleware is configured (grep `CORS` in `backend/app/main.py`: none).

**Email**: provider Resend (REST, `backend/app/email.py:205`). Sender: Resend's test sender `onboarding@resend.dev` under the name "Demenova Alerts" (`backend/app/settings.py:14,46`); it reaches only the Resend account owner's inbox (`backend/README.md:24`). Trigger: a unit moves into Severe and is still Severe in the same episode; never when Stale or when the rain data is older than `stale_after_hours`. Dedupe: one email per unit (lot or zone) per Severe episode through `email_log`, plus a stable Idempotency-Key for Resend; a failed send is retried on the next run. Content: Spanish then English, level word and colour, W, top two factors, Ecuador time, lot link, DEMO label, credit in words. Tests: 49 backend tests pass with fakes. Real delivery: UNKNOWN: nothing in the repo records a real email arriving (`/email/test` has not been reported as called). After the seed, 4 Severe transitions (lot 1, lot 2, zone high, lot 7) would be mailed once each the first time `python -m backend.app.alerts` runs with its secrets (`supabase/README.md:109-111`).

**Telegram**: not built (D-028; `telegram_subscribers` table and `telegram_code` exist in the schema only).

**GitHub Actions**

| Workflow | Triggers | What it runs | Last known result |
| --- | --- | --- | --- |
| `ci` (`.github/workflows/ci.yml`) | push, pull_request | python job: `uv sync --locked`, `uv run pytest -q`, `python scripts/check_provenance.py`, `uv run python scripts/export_contracts.py --check`; app job: `npm ci --prefix app`, typecheck, Vitest, build, `node scripts/check_bundle_size.mjs` | success on `79e05f3` (2026-11-15T06:58:44Z) and on the three runs before it (GitHub API, 15 Nov) |
| `pipeline` (`.github/workflows/pipeline.yml`) | `cron: "17 * * * *"`, `workflow_dispatch`; environment `production` | secret-name check, Earthdata login check, a TODO step that never runs (`:72-80`), `uv run python -m backend.app.alerts` (`:91`) | Never ran: schedules and the Run button work only from `main`, and `main` has no workflow file yet (`docs/reports/devops-engineer/2026-11-15-0444.md`) |

**Render** (`render.yaml`)

| Service | Type | Build / start | Notes |
| --- | --- | --- | --- |
| `demenova-app` | static site | `npm --prefix app ci && npm --prefix app run build`; publish `app/dist` (`:9-14`) | `autoDeployTrigger: checksPass`; headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, seven `Cache-Control` rules (`:27-61`). `VITE_*` values are read at build time, so a changed value needs a rebuild |
| `demenova-api` | web service, Python, plan free | build `uv sync --locked --no-default-groups --group backend`; start `uv run --no-sync uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`; health check `/health` (`:76-84`) | Free plan sleeps when idle: the first call after sleep is slow. The app never waits on it |

Caveat seen on 15 Nov: new commits were not auto-deployed (no new build 20 minutes after CI passed); Roberto deployed by hand with "Clear build cache & deploy" (`docs/HANDOFF.md`, entry "Extract.md filled; live state"). The live site CSP is `default-src 'self'; script-src 'self' …hcaptcha; style-src 'self' …hcaptcha; img-src 'self' data: blob: https://gibs.earthdata.nasa.gov; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://gibs.earthdata.nasa.gov …hcaptcha; frame-src …hcaptcha; font-src 'self'; object-src 'none'; frame-ancestors 'none'`: no inline scripts or styles, no external fonts.

**Environment variable NAMES** (no values)

| Used by | Names |
| --- | --- |
| App (build time) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_HCAPTCHA_SITEKEY` (`app/src/data/identity.ts:18-19`, `app/src/data/hcaptcha.ts:72`) |
| Backend | `ADMIN_TOKEN`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`, `ALERT_EMAIL_FROM_NAME`, `APP_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (`backend/app/settings.py`) |
| Pipeline (ingest) | `EARTHDATA_USERNAME`, `EARTHDATA_PASSWORD` (`pipeline/ingest/auth.py`) |
| Seed and local tests | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PSQL` (optional path), `LOCAL_PG_PASSWORD` (`supabase/tests/run_local.ps1`) |
| Render | `NODE_VERSION`, `PYTHON_VERSION`, `PYTHONUTF8` (`render.yaml:64,94,96`) |
| GitHub `production` environment | `EARTHDATA_USERNAME`, `EARTHDATA_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`; variable `APP_BASE_URL` (`docs/DEPLOY.md`) |
| Listed in `.env.example`, unused by code | `SUPABASE_ANON_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` |

## 16. Agents, decisions and SI use

**Agent roster** (`.claude/agents/`, 14 agents, all `model: opus` = Claude Opus 5.5 since D-008):

| Effort | Agents |
| --- | --- |
| xhigh | lead-architect, data-scientist, scientist-reviewer (maxTurns 40) |
| high | data-engineer, database-engineer, api-engineer, devops-engineer, frontend-engineer, product-designer, agronomist, qa-demo-engineer, technical-writer (maxTurns 40), instructor (maxTurns 40), agent-ops-engineer (maxTurns 40) |

Changes during the build: D-000 (all agents on Fable 5.2 at effort max) was superseded by D-008 after two usage-limit stops; the agronomist's mandate was rewritten for a team with no human agronomist (D-025); technical-writer, qa-demo-engineer, instructor and data-engineer were adapted to the solo build (D-026). No agent was added or removed. Modes: normal mode (`scripts/start.ps1`); `scripts/start-energy.ps1` (Sonnet subagents) exists; whether it was ever used is UNKNOWN (not recorded). ECC reviewers used on the work: code-reviewer, security-reviewer, database-reviewer (`docs/reports/blocks/block-0-1.md`, `block-2.md`).

**Tools and plugins**: ECC plugin (reviews, session save); Ponytail in lite mode (D-010); claude-mem installed with provider `gemini`, setup left to Roberto (D-011); FreeLLMAPI installer downloaded, not run, lane off (D-012); Graphify: no record of use in the repo. Playwright 1.65.1 for e2e (P-018). Block 3 only: Emil Kowalski skills, Impeccable 4.9.1 with its signed engine, Taste skill 2.5.1 plus four classics, Playwright MCP 0.0.85; Figma MCP excluded (D-033; `docs/DESIGN_TOOLS.md` on `block/3-polish`).

**DECISIONS.md** (`docs/decisions/DECISIONS.md`; D-033 and D-034 exist on `block/3-polish` only)

| ID | One line |
| --- | --- |
| D-000 | Superseded: all agents on Fable 5.2 at effort max |
| D-001 | Agent-file changes go through lead-architect; important ones to Roberto |
| D-002 | Metric by default, imperial display toggle; storage always SI |
| D-003 | No login in v0; device identity by Supabase anonymous sign-in; local-only fallback |
| D-004 | Farm data on the device and in Supabase; Full and Data-saver modes |
| D-005 | Demo lots created by an agent as synthetic |
| D-006 | Tasks tracked in GitHub Issues and `TASKS.md` |
| D-007 | Domain visionai.one available for email only if needed |
| D-008 | Every agent on Opus 5.5; xhigh for three, high for the rest; normal and energy launchers |
| D-009 | Context diet: SPEC split into `docs/spec/`; token rules; at most 2 subagents |
| D-010 | Ponytail installed, lite mode only |
| D-011 | claude-mem installed off-plan (gemini), telemetry off |
| D-012 | FreeLLMAPI installer not run (unsigned); OmniRoute found, inactive |
| D-013 | Contracts v1 formalised (ADR-005) |
| D-014 | Sigatoka thresholds and the 14 °C base stay `estimated` |
| D-015 | Logo option 1 "Core" |
| D-016 | Farm country, province and canton nullable |
| D-017 | Telegram onboarding uses a random per-farm `telegram_code` |
| D-018 | Supabase schema approved (14 tables, RLS, 4 views, 79-check test) |
| D-019 | SMAP values with "not recommended" flags are not used |
| D-020 | Contract 1.1.0 adds `telegram_code` |
| D-021 | Owner's name is Roberto; "Roster" renamed everywhere |
| D-022 | All tasks owned by the former team agronomist closed; no task may wait on a domain expert |
| D-023 | The former agronomist's answers archived; questionnaire defaults become v1 values tagged estimated |
| D-024 | Engine without an expert: design weights, sensitivity check instead of AHP, calibration on press-documented floods only |
| D-025 | Agronomist agent: sourced or labelled "not reviewed"; actions are checks; one cited biosecurity line at most |
| D-026 | Agents adapted to the solo build; English-only reports; Android by emulation |
| D-027 | The former agronomist is not named or shown in public materials |
| D-028 | Solo-build scope: must-haves and nice-to-haves |
| D-029 | Severe at 0.90 as a design choice; replay from 20 Jan 2026 |
| D-030 | Contract 1.2.0: `sensitivity`, `experimental`, review tags; `verification.json` budget 20 kB |
| D-031 | The former agronomist's name removed from every current file |
| D-032 | hCaptcha-protected, on-demand anonymous sign-in |
| D-033 | Block 3: frontend upgrade with third-party design tools; guardrails |
| D-034 | Block 3 working rules: tool ledger, About-page ownership, `index.html` meta tags, Taste kit subset |
| ADR-001 | Stack (exact versions; no router, state or i18n library) |
| ADR-002 | Coordinates EPSG:4326, grid EPSG:32717 30 m, UTC time, SI units |
| ADR-003 | Identity: anonymous sign-in plus device id (amended by D-032) |
| ADR-004 | Offline storage and data-saver mode |
| ADR-005 | One Pydantic contract source; generated JSON Schema and TypeScript |

**PENDING.md, still open**: P-016 (class A: unique partial index on `email_log(unit_id, episode_start)`; recommended default: after submission); P-017 (class A, after the hackathon: seasonal percentiles for W, task T-048). Proposal AP-001 (`docs/proposals/`, block 3): permanent owner for `app/public/about/`. Everything else is resolved or approved (P-001 to P-015, P-018).

**SI-use log** (`docs/SI_USE_LOG.md`, 28 dated rows; block-3 rows not yet added): Claude (claude.ai) helped with the specification and research; Claude Code's main session orchestrated 14 custom agents that wrote the pipeline, engine, database schema, backend, app, tests, guides and reports, and ran the reviews. Roberto decided: the problem, location and scope; the logo; the schema approval; the Telegram code design; nullable farm fields; excluding low-quality SMAP; the solo-build rules after the team change (FIX.md, FIX2.md); the Severe threshold 0.90 and the replay window; removing the former member's name; hCaptcha; the design tools for block 3. Roberto also did every account, secret and deploy step. The submission text should add a line for any AI video tool used (`docs/project-page/SUBMISSION.md`).

## 17. Health checks (run and record real results)

Run on 15 Nov, 09:11 to 09:16 Spain, in a clean worktree at `79e05f3` (fresh `uv sync --locked` and `npm ci`), at low CPU priority so the block-3 agents were not slowed.

| Command | Result (summarised) |
| --- | --- |
| `git status` and `git log --oneline -20` | Worktree at `79e05f3`: clean. Last 20 commits, newest first: `79e05f3` handoff (Supabase applied and seeded), `666cb6a` D-032, `6f63177` on-demand sign-in with hCaptcha, `87476df` CSP for hCaptcha, `22b9be7` live smoke, `e5c766a` demo seed, `4ab7fcb` live URLs + video script + checklist, `582a695` feature-complete handoff, `b176218` name removal + domain claims fixes, `89dcdc9` guide fixes, `f85b2eb` README/project-page fixes, `ab8c185` tasks, `41f1b34` size gate 20 kB, `3ccd75c` level checks, `be4ba60` score timestamps, `8358689` and `328e359` reports, `b7b9316` e2e suite, `73226ac` project page, `f7f8fe1` README. Working checkout: branch `block/3-polish`, with two agents' uncommitted edits in `app/src` and this file untracked |
| `uv run pytest -q` | 424 passed, 4 warnings, 177.87 s |
| `python scripts/check_provenance.py` | `OK - 96 data file(s), 28 sidecar(s)` (committed data only; the working checkout, which also holds the git-ignored raw cache, reported 9,220 data files and OK earlier on 15 Nov) |
| `uv run python scripts/export_contracts.py --check` | `OK, 31 schemas and contracts.ts match the models` |
| `npm --prefix app run build` (sizes) | Passed, built in 3.38 s; initial `index-*.js` 297.69 kB (94.31 kB gzip); full table in §11; precache 20 entries, 612.60 KiB |
| `npm --prefix app run typecheck` | Passed |
| `npm --prefix app run test -- --run` | 8 test files, 76 tests passed |
| `npx --prefix app playwright test` (if present) | The suite is in `tests/e2e`, not under `app`. Not re-run in the extraction worktree, on purpose (its speed tests are CPU-sensitive and the block-3 gates were running). Last recorded runs on identical app code (`git diff 79e05f3 e1cafb2 -- app tests/e2e` is empty): frontend-engineer's baseline at `e1cafb2`: 150 passed, 9 skipped, 1 failed when the two speed tests ran in parallel with the rest (a known load effect); the speed tests alone (`--grep @perf --workers=1`): 2 passed (`docs/briefs/2026-11-15-frontend-upgrade/TOOL_LEDGER.md`). Main-session run at `b176218`: 149 passed + 2 speed tests (`docs/HANDOFF.md`) |
| Bundle size gate script (`node scripts/check_bundle_size.mjs`) | `Initial JS: 94.3 kB gzip of 150.0 kB budget: ok`; `Demo data: 1056.6 kB of 5000.0 kB budget: ok`; `Size gate passed.` |
| Search for invented-data risks | Provenance checker OK (every data file has an origin). "TODO" in 6 files, of which code: `.github/workflows/pipeline.yml:72,78` only; "FIXME" 0; "lorem" 0. Hex colours outside `app/src/styles/`: 0. Numbers in the UI go through `DataValue` (origin badge + time); the e2e sweep fails on any figure without both. The only synthetic app data outside the demo farm is the development fixture (`app/src/data/fixtures/demo-fixture.ts`), which is not in the production bundle (`docs/reports/frontend-engineer/2026-11-14-2355.md`) |

Live checks on 15 Nov (`docs/HANDOFF.md`): app loads in about 1.6 s at 360 px with all security headers; every screen renders with 0 console errors; the replay works offline after one visit; `/health` ok; Supabase tables present and seeded; tapping "Connect this device for sync" loads the hCaptcha widget with 0 CSP violations.

## 18. Known issues and risks before judging

Ordered by severity.

1. **Overclaim risk.** The engine gave no flood-specific warning for 22 to 23 Feb 2026: the lots were already Severe from earlier storms. Any text or voice-over saying "predicted", "caught" or "validated" would be false. `docs/spec/09` still contains the old sentence; the README, project page, guides and video script do not (`docs/reports/science/2026-11-15-0617-claims.md`).
2. **High alarm rate and unstable weights.** In 2026: 1 hit, 4 false alarms on the farm's river; the wettest lot is Severe on 13 % of days in 2016 to 2025; the ±0.10 weight check changes the result in 10 of 10 runs. W follows the wet season more than unusual rain (P-017, after the hackathon).
3. **Frozen replay, no live mode.** No hourly ingest or scoring exists; "Updated" times are from February 2026; a user's own farm gets no zones, area or alerts. A judge who sets up a farm sees it stored and nothing computed.
4. **Email not proven end to end.** No real Severe email has been recorded. The sender is Resend's test address, which reaches only the account owner. Once `main` holds the workflow and its secrets, the first hourly run sends up to 4 demo emails.
5. **Sync not proven with a human.** hCaptcha loads on the live site, but no completed sign-in is recorded, and farm sync has only been tested against a stand-in client (`docs/reports/frontend-engineer/2026-11-15-0600.md`).
6. **Release state.** `main` is not merged, there is no tag, auto-deploy did not fire, and the frontend upgrade (`block/3-polish`) is not QA-green yet. If it is not green by the 15:00 freeze, the live site stays at `79e05f3`.
7. **Thin demo data.** Synthetic farm; six of seven lot facts are "No data"; soil moisture is always "No data"; NDVI has two valid scenes; lot placement used a faulty NDVI composite (7 of 528 cells below the rule); the Sigatoka thresholds are estimates.
8. **Sleep behaviour.** Safe by design: the app is static files and JSON, so it works when the API and Supabase sleep (live smoke and e2e `offline.spec.ts`). Only the first API call after sleep is slow.
9. **Accessibility and devices.** Reduced motion is a blunt global rule (being replaced in block 3); 12 and 13 px text is common; rows truncate at 360 px; e2e runs in Chromium only, so Safari on the iPhone and iPad is unchecked until Roberto fills `docs/reports/qa/DEVICE_CHECKLIST.md`; no Lighthouse run; the cold-load margin is thin (2.5 s of 3 s).
10. **Spanish and English.** 285 keys each with a parity test; the screenshots here are English only; Spanish copy has not been read by a native-speaking reviewer other than through the agents; agronomic text is labelled as not reviewed.
11. **Stale documents.** `TASKS.md` shows T-029, T-044, T-015 and others as open although their work is done; `supabase/README.md:4-6` says the schema is "not yet applied"; `docs/SPEC.md` still describes SMAP, AHP weights and the 0.80 threshold as the plan.
12. **Open security item.** P-016: two concurrent runs could both send one email (narrowed in code; Resend's idempotency key covers 24 h).
13. **Submission items.** The video, the project page fields, the SI-use description and the device checklist are still open (`docs/project-page/SUBMISSION.md`).

## 19. Questions for claude.ai

1. Which build should the polish advice target: the live `79e05f3` described here, or `block/3-polish`, where a 30-item change list (`design/upgrade/CHANGE_LIST.md`) is already being applied? Advice that repeats those items is wasted; advice that conflicts with them needs a decision by Roberto.
2. The Severe moment: keep the designer's pick "Flood" (water rises inside the lot on the map) or the earlier "Ripple"?
3. Desktop: keep the single phone-width column at 1440 px, or add a real wide layout (for example map beside the lot list)? No breakpoints exist today.
4. Typography: stay with the system font stack, or self-host one font? The CSP allows only `font-src 'self'`, and the initial JS budget has 55 kB of room.
5. Navigation: are four tabs right, with Settings behind a gear on Home and Strategies behind a lot?
6. Home's first view: status number first (SPEC 18) or the "What to check" text first (as live)?
7. How should the 30-second video and the project page present reliability (1 hit, 0 misses, 4 false alarms; weights not stable) so that it reads as honesty, not weakness?
8. Empty facts on the demo farm: keep six rows of "No data" on Lot detail, or collapse them into one line? The data policy forbids filling them.
9. Is the stretch "About Demenova" page (`app/public/about/`, Taste 2.5.1 flow) wanted at all, given the 15:00 freeze?
10. `PRODUCT.md` (Impeccable) lists users and principles inferred from repo files: Roberto has to confirm or correct them.
11. Spanish wording: who reviews the D-026 badge text ("aún no revisada por un agrónomo local") and the check texts in `domain/actions.yaml` as a native speaker?
12. Could not be determined from the repo: whether a real email has ever arrived, whether a human has completed the hCaptcha sign-in, whether energy mode was used, the Space Apps submission status, and Lighthouse scores.
