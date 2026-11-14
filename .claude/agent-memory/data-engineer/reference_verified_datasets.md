---
name: reference-verified-datasets
description: Dataset identifiers verified 2026-11-14 via NASA CMR / official pages (IMERG Final V07 ends 2025-09-30, open SRTM mirror, POWER API facts, S2 on Earth Search)
metadata:
  type: reference
---

Verified 2026-11-14 (details and URLs in config/datasets.yaml; re-check only if a run fails):
- GES DISC landing pages are JS-only (WebFetch returns "GES DISC"); use CMR UMM-C JSON
  `https://cmr.earthdata.nasa.gov/search/collections.umm_json?short_name=X&version=Y` (no login).
- IMERG V07: GPM_3IMERGHHE (Early HH, 4 h), GPM_3IMERGDL (Late daily, 14 h), GPM_3IMERGDF (Final daily, COMPLETE,
  ends 2025-09-30; no V08 in CMR on 2026-11-14). History = Final to 2025-09-30 + Late after.
- SPL3SMP_E 006 (9 km, NSIDC); GLDAS_NOAH025_3H 2.1 (0.25 deg, main stream 3-4 month latency); ECO_L2T_LSTE 003 has more
  AOI granules than 002; HLSL30 2.0; MOD13Q1 061; VNP13A1 002; GRACE mascon CRI RL06.3Mv04 (PO.DAAC).
- SRTM GL1 v3 open, no login: `https://opentopography.s3.sdsc.edu/raster/SRTM_GL1/SRTM_GL1_srtm/S04W080.tif`.
- NASA POWER daily API v2.10.3, sources MERRA2/SYN1DEG/POWER, LST days, fill -999; hourly radiation unit "MJ/hr".
  Farm AOI lies in one POWER cell (centre + corners identical).
- Sentinel-2 L2A: Earth Search v1 `sentinel-2-l2a`, anonymous; per-item raster:bands scale 0.0001 offset -0.1; AOI tile 17MPS.
- OSM: Rio Buenavista = way 468343174. pysheds 0.5 needs an np.in1d shim on numpy 2.4.
- Earthdata credentials were absent on 2026-11-14 (PENDING P-005) — see [[project-demo-aoi]].
