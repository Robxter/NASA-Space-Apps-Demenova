---
name: project-demo-aoi
description: Demo AOI, catchment, lots (contract ids, kept in place after T-049) and replay window 2026-01-20..03-05 (D-029)
metadata:
  type: project
---

Farm AOI box (-79.875,-3.405,-79.805,-3.345). Catchment 253.8 km²: OSM Rio Buenavista (way 468343174) burned 10 m into the
routing DEM, outlet = OSM exit from the box snapped within 300 m.
Rain history = ONE product, IMERG Early daily GPM_3IMERGDE V07 (V07B to 2026-03-03, V07C after), 2015-01-01..2026-11-13.
**Why:** scientist-reviewer B1 (never mix runs) and M2 (plain D8 left the OSM channel in the flat reach).
Replay window = 2026-01-20..2026-03-05 (D-029, Roberto 2026-11-15) so the demo shows escalation; old dir
replay/2026-02-15_2026-03-05 kept only until the engine switches (T-048), it has the broken pre-T-049 NDVI.
Demo lots: ids `lot_demo-el-oro_<n>`, farm `farm_demo-el-oro`, to_be_redefined_by future-local-agronomist (D-022; Tyson left).
They were placed on the broken composite; kept in place on 2026-11-15 because engine/app key on them (7 of 528 cells < 0.6).
**How to apply:** never re-run `lots.run()` without telling the engine and frontend owners (it moves all 8 lots);
use `lots.relabel()` for property fixes. SMAP: recommended flags 0/8 only (D-019). Related: [[reference-verified-datasets]].
