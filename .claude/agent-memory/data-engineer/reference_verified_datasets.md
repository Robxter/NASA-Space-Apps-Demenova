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
- Access (2026-11-14): Earthdata login OK from .env; GES DISC app approved by Roster (P-008 resolved), NSIDC needs nothing extra.
  If GES DISC ever returns 403 "EULA Acceptance Failure", the fix is the approve_app link in the JSON error body.
- GLDAS_NOAH025_3H 2.1 main stream covered Feb 2026 (latest granule 2026-07-31 on 2026-11-14); farm = cell lon i 400, lat j 226.
- IMERG catchment window = grid indices lon 1000-1004, lat 863-867; whole 2015-2026 run takes ~25 min with 6 workers.
- Cloud OPeNDAP: granule RelatedUrls "USE SERVICE API" -> `<url>.dmr.xml` (metadata, readable even when data 403) and
  `<url>.dap.csv?dap4.ce=/grp/var[r0:r1][c0:c1]` (lines `/grp/var[i], v...`). A 1-element-wide hyperslab returns empty rows.
- SMAP SPL3SMP_E: lat/lon arrays are -9999 where no retrieval; farm = EASE rows 859-860, cols 1072-1073. IMERG daily
  `precipitation` dims (time, lon, lat), lon 3600 / lat 1800 at 0.1 deg. See [[project-demo-aoi]].
