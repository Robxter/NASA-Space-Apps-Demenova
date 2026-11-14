---
name: project-demo-aoi
description: Demo AOI, catchment and lot decisions from wave A (2026-11-14) and the unconfirmed Feb 2026 flood date
metadata:
  type: project
---

Farm AOI box (-79.875,-3.405,-79.805,-3.345) on the Rio Buenavista reach Pasaje-Buenavista; catchment 252.7 km² from SRTM
(outlet = max-accumulation cell on the box edge). 8 synthetic lots in pipeline/data/processed/aoi/demo_lots.geojson.
**Why:** Rule zero + D-005; OSM channel and DEM channel diverge in the flat reach, so the outlet rule uses the DEM.
**How to apply:** reuse these constants in pipeline/ingest/aoi.py; the flood date 22-23 Feb 2026 was NOT found in news
searches (only 27-28 Feb 2025 and 9 Jun 2026), PENDING P-007 — check its status before building more on the replay window.
Related: [[reference-verified-datasets]].
