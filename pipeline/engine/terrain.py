"""T-020 terrain features: slope, topographic wetness index (TWI), ranks within the farm, terciles, zones,
and the D8 flow length used by the Kirpich travel-time estimate (T-021). Owner: data-scientist.

Methods (docs/spec/09, Prediction science table):
- Method 1, D8 flow routing: O'Callaghan & Mark 1984; Jenson & Domingue 1988. The upslope area raster comes from
  data-engineer (pipeline/data/processed/terrain/upslope_area_farm_30m.tif, D8 accumulation x 900 m2, the cell
  itself included).
- Method 2, TWI = ln(a / tan beta) (Beven & Kirkby 1979; Sorensen et al. 2006). `a` is the specific catchment
  area: upslope area per unit contour length; with D8 the contour length is one cell width (30 m). tan beta is the
  local slope from central differences on the SRTM DEM (numpy.gradient: second-order central differences inside,
  one-sided at the grid edge). Where tan beta is exactly 0 the TWI is undefined (infinite): the cell is left
  missing and counted, never given an invented minimum slope (Rule zero).
- TWI values depend on DEM resolution and method (Quinn et al. 1995, SPEC limit), so units are ranked within the
  farm instead of compared with absolute TWI thresholds.

All functions are pure and vectorised; no I/O here except where a function says so.
"""

from __future__ import annotations

from typing import Iterable, Sequence

import numpy as np
from affine import Affine
from rasterio import features

TERCILES = ("low", "mid", "high")


def slope_tan(dem: np.ndarray, res_m: float) -> np.ndarray:
    """tan(beta) = |grad z| from central differences (m/m). NaN where the DEM is NaN."""
    dz_dy, dz_dx = np.gradient(np.asarray(dem, dtype="float64"), res_m)
    return np.hypot(dz_dx, dz_dy)


def twi(upslope_area_m2: np.ndarray, tan_beta: np.ndarray, contour_width_m: float) -> np.ndarray:
    """TWI = ln(a / tan beta) with a = upslope area / contour width (m2/m). NaN where undefined (tan beta = 0)."""
    area = np.asarray(upslope_area_m2, dtype="float64")
    tb = np.asarray(tan_beta, dtype="float64")
    out = np.full(np.broadcast(area, tb).shape, np.nan)
    ok = np.isfinite(area) & np.isfinite(tb) & (tb > 0) & (area > 0)
    out[ok] = np.log((area[ok] / contour_width_m) / tb[ok])
    return out


def rasterize_units(geometries: Sequence[dict], shape: tuple[int, int], transform: Affine) -> np.ndarray:
    """Label raster: 0 outside every unit, k (1-based) inside geometry k. Cell-centre rule (rasterio default).

    Geometries must be in the raster CRS. Overlaps take the later geometry.
    """
    shapes = [(geom, index) for index, geom in enumerate(geometries, start=1)]
    if not shapes:
        return np.zeros(shape, dtype="int32")
    return features.rasterize(shapes, out_shape=shape, transform=transform, fill=0, dtype="int32")


def unit_stats(values: np.ndarray, labels: np.ndarray, n_units: int) -> list[dict]:
    """Per unit k = 1..n: mean and max of finite values, cell count and count of undefined (NaN) cells."""
    stats = []
    for k in range(1, n_units + 1):
        inside = labels == k
        vals = values[inside]
        finite = vals[np.isfinite(vals)]
        stats.append({
            "n_cells": int(inside.sum()),
            "n_undefined": int((~np.isfinite(vals)).sum()),
            "mean": float(finite.mean()) if finite.size else None,
            "max": float(finite.max()) if finite.size else None,
            "min": float(finite.min()) if finite.size else None,
        })
    return stats


def rank_within_farm(values: Sequence[float | None]) -> list[float | None]:
    """Rank of each unit within its farm as a 0..1 fraction: (r - 1) / (n - 1), r the ascending rank (ties share
    the average rank). The wettest unit gets 1, the driest 0. None stays None; a farm with a single ranked unit has
    no ranking (None)."""
    vals = [None if v is None or not np.isfinite(v) else float(v) for v in values]
    ranked = [v for v in vals if v is not None]
    n = len(ranked)
    if n < 2:
        return [None for _ in vals]
    order = sorted(ranked)
    out: list[float | None] = []
    for v in vals:
        if v is None:
            out.append(None)
            continue
        first = order.index(v) + 1
        last = n - order[::-1].index(v)
        out.append(((first + last) / 2 - 1) / (n - 1))
    return out


def tercile_breaks(values: np.ndarray) -> tuple[float, float]:
    """The 1/3 and 2/3 quantiles (numpy linear interpolation) of the finite values."""
    finite = np.asarray(values, dtype="float64")
    finite = finite[np.isfinite(finite)]
    if finite.size < 3:
        raise ValueError("at least 3 defined cells are needed for terciles")
    q1, q2 = np.quantile(finite, [1 / 3, 2 / 3])
    return float(q1), float(q2)


def tercile_of(value: float | None, breaks: tuple[float, float]) -> str | None:
    """'low' (<= q1), 'mid' (q1 < v <= q2) or 'high' (> q2); None for an undefined value."""
    if value is None or not np.isfinite(value):
        return None
    if value <= breaks[0]:
        return "low"
    return "mid" if value <= breaks[1] else "high"


def tercile_raster(values: np.ndarray, mask: np.ndarray, breaks: tuple[float, float]) -> np.ndarray:
    """0 outside the mask or undefined, 1 low, 2 mid, 3 high."""
    out = np.zeros(values.shape, dtype="uint8")
    ok = mask & np.isfinite(values)
    out[ok & (values <= breaks[0])] = 1
    out[ok & (values > breaks[0]) & (values <= breaks[1])] = 2
    out[ok & (values > breaks[1])] = 3
    return out


def polygons_of(code_raster: np.ndarray, code: int, transform: Affine) -> list[list[list[tuple[float, float]]]]:
    """Polygons (rings in the raster CRS) of the cells equal to `code`, 4-connected outlines of whole cells."""
    mask = code_raster == code
    polys = []
    for geom, value in features.shapes(code_raster.astype("uint8"), mask=mask, transform=transform, connectivity=4):
        if int(value) == code:
            polys.append([[(float(x), float(y)) for x, y in ring] for ring in geom["coordinates"]])
    return polys


# --- D8 flow length (Kirpich input, T-021) -----------------------------------------------------------------

# ESRI D8 codes used by pysheds and by pipeline/ingest/aoi.py: N, NE, E, SE, S, SW, W, NW.
D8_DIRMAP = (64, 128, 1, 2, 4, 8, 16, 32)
_OFFSETS = {64: (-1, 0), 128: (-1, 1), 1: (0, 1), 2: (1, 1), 4: (1, 0), 8: (1, -1), 16: (0, -1), 32: (-1, -1)}


def d8_flow_length(fdir: np.ndarray, mask: np.ndarray, outlet_rc: tuple[int, int], res_m: float) -> np.ndarray:
    """Length (m) of the D8 path from every masked cell to the outlet; NaN outside the mask.

    A step to a side neighbour is res_m long, a diagonal step res_m * sqrt(2). Computed by pointer jumping, so the
    cost is O(cells * log(path length)). A cell whose path leaves the mask or loops gets NaN.
    """
    rows, cols = fdir.shape
    n = rows * cols
    flat = np.arange(n).reshape(rows, cols)
    nxt = np.full(n, -1, dtype=np.int64)
    step = np.zeros(n, dtype="float64")
    rr, cc = np.nonzero(mask)
    codes = fdir[rr, cc]
    for code, (dr, dc) in _OFFSETS.items():
        sel = codes == code
        r2, c2 = rr[sel] + dr, cc[sel] + dc
        inside = (r2 >= 0) & (r2 < rows) & (c2 >= 0) & (c2 < cols)
        src = flat[rr[sel][inside], cc[sel][inside]]
        dst = flat[r2[inside], c2[inside]]
        keep = mask.ravel()[dst]
        nxt[src[keep]] = dst[keep]
        step[src[keep]] = res_m * (np.sqrt(2.0) if dr != 0 and dc != 0 else 1.0)
    outlet = flat[outlet_rc]
    nxt[outlet] = outlet
    step[outlet] = 0.0
    # cells that leave the mask point at themselves with an invalid marker
    dead = (nxt == -1) & mask.ravel()
    nxt[nxt == -1] = np.flatnonzero(nxt == -1)
    dist = step.copy()
    ptr = nxt.copy()
    for _ in range(64):
        if np.all((ptr == outlet) | dead[ptr] | ~mask.ravel()):
            break
        dist = dist + dist[ptr]
        ptr = ptr[ptr]
    reached = (ptr == outlet) & mask.ravel()
    out = np.where(reached, dist, np.nan)
    return out.reshape(rows, cols)


def longest_flow_path(lengths: np.ndarray) -> tuple[float, tuple[int, int]]:
    """(L in m, (row, col) of the most remote cell) from a flow-length raster."""
    if not np.isfinite(lengths).any():
        raise ValueError("no cell reaches the outlet")
    idx = int(np.nanargmax(lengths))
    r, c = np.unravel_index(idx, lengths.shape)
    return float(lengths[r, c]), (int(r), int(c))


def ring_to_lonlat(rings: Iterable[Iterable[tuple[float, float]]], to_lonlat, decimals: int = 6) -> list[list[list[float]]]:
    """Project rings from the analysis CRS to [lon, lat] lists (EPSG:4326), rounded."""
    out = []
    for ring in rings:
        pts = np.asarray(list(ring), dtype="float64")
        lon, lat = to_lonlat(pts[:, 0], pts[:, 1])
        out.append([[round(float(x), decimals), round(float(y), decimals)] for x, y in zip(lon, lat)])
    return out
