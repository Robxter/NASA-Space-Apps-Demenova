---
name: project-demo-aoi
description: Demo AOI, catchment, lots and rain-history decisions after the 2026-11-14 science review (single IMERG product, OSM-burned routing)
metadata:
  type: project
---

Farm AOI box (-79.875,-3.405,-79.805,-3.345). Catchment 253.8 km²: OSM Rio Buenavista (way 468343174) burned 10 m into the
routing DEM, outlet = OSM exit from the box snapped within 300 m. 8 synthetic lots unchanged (rules still hold).
Rain history = ONE product, IMERG Early daily GPM_3IMERGDE V07 (V07B to 2026-03-03, V07C after), 2015-01-01..2026-11-13.
**Why:** scientist-reviewer B1 (Final and Late are not comparable; never mix runs in a ranking) and M2 (plain D8 left the
OSM channel by up to 2.7 km in the flat reach). SMAP over the farm in the replay had no recommended-quality retrieval (M1).
**How to apply:** never mix IMERG runs in one series; keep flags 0/8 as the SMAP quality rule; the replay window stays
2026-02-15..03-05 until Roberto decides P-007; SMAP use pending P-010. Related: [[reference-verified-datasets]].
