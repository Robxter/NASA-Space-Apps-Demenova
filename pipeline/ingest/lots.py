"""T-012: synthetic demo lot geometry (D-005). Geometry only; the agronomist writes lot attributes.

Placement rules (design choices by data-engineer, not science):
- lots are whole 30 m grid cells (8 x 8, 9 x 8 or 8 x 7 cells = 5.76, 6.48, 5.04 ha) so zonal statistics are exact;
- every cell of a lot has composite NDVI >= NDVI_MIN (dense vegetation; crop type is NOT verified from NDVI);
- no lot cell lies on a channel (upslope area > CHANNEL_M2), lots are >= GAP_CELLS apart, within MAX_RIVER_M of the
  main DEM channel (the river reach the demo is about);
- 4 lots from the lowest and 4 from the highest third of a placement-only wetness index ln(a / tan b)
  (a = upslope area / 30 m, tan b from the DEM gradient, floor 0.001). It is used only to spread the lots;
  the delivered TWI belongs to data-scientist (T-020).
"""

from __future__ import annotations

import numpy as np
import rasterio
from scipy import ndimage

from pipeline.common.grid import Grid, to_lonlat
from pipeline.common.io import write_json
from pipeline.common.provenance import dataset_record, record, utc_now
from pipeline.ingest.aoi import AOI_DIR, AOI_ID, PROCESSED, TERRAIN_DIR

FARM_ID = "farm_demo_el_oro"
SIZES = [(8, 8), (9, 8), (8, 7), (8, 8), (9, 8), (8, 7), (8, 8), (9, 8)]
NDVI_MIN = 0.6
CHANNEL_M2 = 1.0e6
MAIN_CHANNEL_M2 = 100.0e6
MAX_RIVER_M = 1500.0
GAP_CELLS = 3
BLOCK_M = 3000.0


def _read(path):
    with rasterio.open(path) as src:
        return src.read(1).astype("float64"), src.transform


def placement_wetness(dem: np.ndarray, upslope_m2: np.ndarray, res: float = 30.0) -> np.ndarray:
    gy, gx = np.gradient(dem, res)
    tan_b = np.maximum(np.hypot(gx, gy), 0.001)
    return np.log((upslope_m2 / res) / tan_b)


def select_lots(ndvi, wet, upslope, sizes=SIZES, res=30.0):
    """Return a list of (row, col, h, w, wetness_class) for the chosen lots."""
    ok = (ndvi >= NDVI_MIN) & (upslope <= CHANNEL_M2) & np.isfinite(wet)
    dist_river = ndimage.distance_transform_edt(upslope < MAIN_CHANNEL_M2) * res
    near = dist_river <= MAX_RIVER_M
    cand = []
    for h, w in sorted(set(sizes)):
        for r in range(0, ok.shape[0] - h, 2):
            for c in range(0, ok.shape[1] - w, 2):
                win = (slice(r, r + h), slice(c, c + w))
                if ok[win].all() and near[win].all():
                    cand.append((r, c, h, w, float(np.mean(wet[win]))))
    if len(cand) < len(sizes):
        raise RuntimeError(f"only {len(cand)} candidate windows; relax placement rules")
    values = np.array([x[4] for x in cand])
    lo_cut, hi_cut = np.quantile(values, [1 / 3, 2 / 3])
    # Compact farm: the BLOCK_M square with the most low and high candidates (maximise the smaller count).
    block = int(BLOCK_M / res)
    best, best_score = None, -1
    for br in range(0, ok.shape[0], 10):
        for bc in range(0, ok.shape[1], 10):
            inside = [x for x in cand if br <= x[0] and x[0] + x[2] <= br + block and bc <= x[1] and x[1] + x[3] <= bc + block]
            score = min(sum(x[4] <= lo_cut for x in inside), sum(x[4] >= hi_cut for x in inside))
            if score > best_score:
                best, best_score = inside, score
    taken = np.zeros(ok.shape, dtype=bool)
    chosen = []

    def place(pool, label, n, size_iter):
        for x in pool:
            if n == 0:
                return 0
            r, c, h, w, _ = x
            if (h, w) != size_iter[0]:
                continue
            r0, c0 = max(r - GAP_CELLS, 0), max(c - GAP_CELLS, 0)
            if taken[r0 : r + h + GAP_CELLS, c0 : c + w + GAP_CELLS].any():
                continue
            taken[r : r + h, c : c + w] = True
            chosen.append((r, c, h, w, label))
            size_iter.pop(0)
            n -= 1
        return n

    half = len(sizes) // 2
    low_pool = sorted((x for x in best if x[4] <= lo_cut), key=lambda x: x[4])
    high_pool = sorted((x for x in best if x[4] >= hi_cut), key=lambda x: -x[4])
    low_sizes, high_sizes = list(sizes[:half]), list(sizes[half:])
    while low_sizes and place(low_pool, "low", 1, low_sizes) == 0:
        pass
    while high_sizes and place(high_pool, "high", 1, high_sizes) == 0:
        pass
    if low_sizes or high_sizes:
        raise RuntimeError("could not place all lots without overlap")
    return chosen


def lot_feature(index: int, r: int, c: int, h: int, w: int, label: str, transform) -> dict:
    corners = [(c, r), (c + w, r), (c + w, r + h), (c, r + h), (c, r)]
    xs, ys = zip(*[transform * pt for pt in corners])
    lons, lats = to_lonlat(np.array(xs), np.array(ys))
    ring = [[round(float(x), 6), round(float(y), 6)] for x, y in zip(lons, lats)]
    ring = ring[::-1]  # counter-clockwise exterior ring (RFC 7946)
    return {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": [ring]},
        "properties": {
            "id": f"lot_demo_el_oro_{index}", "farm_id": FARM_ID, "name": f"Lote {index} (demo)",
            "area_ha": round(h * w * 900 / 10000, 2), "area_ha_origin": "synthetic",
            "placement_wetness_class": label,
            "defined_by": "data-engineer", "to_be_redefined_by": "Tyson", "origin": "synthetic",
        },
    }


def run() -> list[dict]:
    ndvi_path = PROCESSED / "ndvi" / "ndvi_composite_2025-11-01_2026-11-13.tif"
    ndvi, transform = _read(ndvi_path)
    dem, _ = _read(TERRAIN_DIR / "dem_farm_30m.tif")
    upslope, _ = _read(TERRAIN_DIR / "upslope_area_farm_30m.tif")
    wet = placement_wetness(dem, upslope)
    chosen = sorted(select_lots(ndvi, wet, upslope), key=lambda x: (x[0], x[1]))
    feats = [lot_feature(i + 1, *x, transform) for i, x in enumerate(chosen)]
    prov = [
        record("prov-demo-lots-synthetic", aoi=AOI_ID, time_range=None,
               processing=["8 rectangular lots on whole 30 m cells (EPSG:32717 lattice), corners projected to EPSG:4326 at 6 decimals",
                           f"rules: NDVI >= {NDVI_MIN} in every cell, no channel cell (upslope > 1 km2), within {MAX_RIVER_M:.0f} m of the main DEM channel, "
                           f">= {GAP_CELLS} cells apart, inside the {BLOCK_M:.0f} m block with most low/high wetness candidates",
                           "4 lots from the lowest and 4 from the highest third of placement wetness ln(a/tan b); area_ha = cells x 900 m2"],
               notes="Synthetic demo lots (D-005): imaginary lot layout drawn by data-engineer on real terrain and imagery; Tyson redefines them (T-064). "
                     "Not real farm boundaries; crop type not verified."),
        dataset_record("prov-demo-lots-ndvi-input", "sentinel2", aoi=AOI_ID, time_range=("2025-11-01", "2026-11-13"), accessed=utc_now(),
                       processing=["input: pipeline/data/processed/ndvi/ndvi_composite_2025-11-01_2026-11-13.tif"], notes="Vegetation screen for lot placement."),
        dataset_record("prov-demo-lots-srtm-input", "srtm", aoi=AOI_ID, time_range=None, accessed=utc_now(),
                       processing=["inputs: pipeline/data/processed/terrain/dem_farm_30m.tif, upslope_area_farm_30m.tif"], notes="Terrain screen for lot placement."),
    ]
    write_json(AOI_DIR / "demo_lots.geojson", {"type": "FeatureCollection", "features": feats}, prov)
    return feats
