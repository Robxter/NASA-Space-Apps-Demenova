# Demenova

Demenova is a mobile-first Progressive Web App that turns open, global Earth observations into waterlogging and flood
alerts, field-condition history and soil-management strategies for banana farms in coastal El Oro, Ecuador. It was
built for the 2026 NASA Space Apps Challenge, challenge "Field Shift: Adapting Farms with NASA Data".

Built with NASA Earth observations. Demenova is an independent project; it is not endorsed by NASA.

- Live app: <app URL>
- Judge quick start (one page): [docs/guide/judge-quickstart.md](docs/guide/judge-quickstart.md)
- Guides: [farmer (es)](docs/guide/farmer-es.md), [farmer (en)](docs/guide/farmer-en.md),
  [agronomist (en)](docs/guide/agronomist-en.md), [agronomist (es)](docs/guide/agronomist-es.md)
- Sources: [docs/CITATIONS.md](docs/CITATIONS.md). How SI tools were used: [docs/SI_USE_LOG.md](docs/SI_USE_LOG.md)

## What it does
Each lot gets an alert index W (0 to 1) built from five factors: upstream rain over the river's catchment, soil
saturation, terrain wetness, local rain and the daily water balance. W maps to four levels, always shown as colour and
word: Normal, Watch, Warning, Severe. The demo replays 20 Jan to 5 Mar 2026 around the 22-23 Feb Buenavista river
flood (Pasaje, El Oro) on a synthetic demo farm, from committed snapshots, with no live download.

## Architecture
```
NASA + partner data (global only)
  -> pipeline/ingest   download, cache, harmonise to a 30 m grid (EPSG:32717)
  -> pipeline/engine   features, alert index W, state machine, verification, sensitivity
  -> Supabase          farms, lots, alerts, logs (row-level security)
  -> app/public/data   JSON snapshots for the replay and offline use
  -> app/              PWA: Home, Map, Lot, Strategies, Alerts, Learn, Setup
  -> backend/          FastAPI on Render: Severe email (Resend), protected re-runs
  -> .github/workflows CI and the hourly pipeline
```
Data: GPM IMERG Early daily (rain), NASA POWER (weather for FAO-56 evapotranspiration), SRTM (terrain), Sentinel-2
L2A (NDVI), NASA GIBS (map imagery), OpenStreetMap (river). GLDAS is in the replay stack but not in W; SMAP was
evaluated and not used (D-019).

## Run locally (PowerShell or any shell)
```
uv sync
uv run pytest -q
npm --prefix app ci
npm --prefix app run dev
uv run python -m pipeline.engine replay
```
Set `PYTHONUTF8=1` on Windows. Downloading new data needs an Earthdata login in `.env` (never committed); the demo
does not.

## Data and Rule zero
No invented data. Every value is downloaded with a provenance record, computed by a documented formula, entered by a
user, or labelled. The app shows each value's origin as a badge: Sourced, Calibrated, Provided, Observed, Estimated,
Design, Pending, and Demo for synthetic values. A missing value is shown as "No data", never guessed. Verification is
reported as counts only.

## Limits
- The demo farm and its 8 lots are synthetic.
- The weights and the Severe threshold (W ≥ 0.90) are design choices, not a calibration: "It is not fitted or
  validated; the 2026 floods were seen when choosing it" (D-029).
- In the farm's catchment in 2026: 1 hit, 0 misses, 4 false alarms. The demo lots were already Severe from earlier
  storms; Demenova gave no flood-specific lead time for the February 2026 flood.
- The weight check is not stable in 10 of 10 variants, although lots 1 and 2 are Severe on the flood days in every run.
- W uses whole-year percentiles, so wet-season days stay high for weeks.
- Agronomic guidance is general and not yet reviewed by a local agronomist; the app supports, never replaces, the
  agronomist's judgment.

## Licence
Pending (no LICENSE file yet). Data keep their providers' terms; see docs/CITATIONS.md.

## Credits
Roberto (product owner and builder). Code and documents produced with Claude Code (Anthropic), as logged in
docs/SI_USE_LOG.md. Data from NASA (GES DISC, LP DAAC, LaRC POWER, GIBS), Copernicus Sentinel-2 via Element 84 Earth
Search, OpenTopography, and OpenStreetMap contributors (ODbL).
