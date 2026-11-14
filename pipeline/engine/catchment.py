"""T-021 Kirpich inputs from SRTM: longest D8 flow path L (m) and its slope S = H / L (m/m). Owner: data-scientist.

Reads the git-ignored DEMs that `python -m pipeline.ingest aoi` writes to pipeline/data/raw/_derived/ (the routing
surface with the OSM river burned in, and the unburned SRTM DEM on the same 30 m lattice). The catchment is
re-delineated on a crop around processed/aoi/catchment.geojson with the same pysheds steps as data-engineer
(fill_pits, fill_depressions, resolve_flats, D8), from the published outlet. L is the longest D8 path to the outlet
on the routing surface; H is the drop on the UNBURNED DEM between the most remote cell and the outlet (the burned
surface lowers the river by 10 m, which is not real elevation).

Result goes to config/alerts.yaml (`kirpich`, `travel_lag_hours`) with the numbers needed to reproduce it.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import numpy as np
import rasterio
from rasterio.windows import Window

from pipeline.common.grid import to_lonlat, to_utm
from pipeline.common.provenance import REPO_ROOT
from pipeline.engine.hydrology import kirpich_tc_minutes
from pipeline.engine.terrain import D8_DIRMAP, d8_flow_length, longest_flow_path

DERIVED = REPO_ROOT / "pipeline" / "data" / "raw" / "_derived"
BURNED = DERIVED / "srtm_dem_burned_osm_buenavista_30m.tif"
DEM = DERIVED / "srtm_dem_catchment_search_30m.tif"
CATCHMENT = REPO_ROOT / "pipeline" / "data" / "processed" / "aoi" / "catchment.geojson"
MARGIN_M = 3000.0


def _crop_window(src: rasterio.io.DatasetReader, ring_lonlat: np.ndarray) -> Window:
    xs, ys = to_utm(ring_lonlat[:, 0], ring_lonlat[:, 1])
    x0, x1 = float(np.min(xs)) - MARGIN_M, float(np.max(xs)) + MARGIN_M
    y0, y1 = float(np.min(ys)) - MARGIN_M, float(np.max(ys)) + MARGIN_M
    c0, r0 = ~src.transform * (x0, y1)
    c1, r1 = ~src.transform * (x1, y0)
    c0, r0 = max(int(np.floor(c0)), 0), max(int(np.floor(r0)), 0)
    c1, r1 = min(int(np.ceil(c1)), src.width), min(int(np.ceil(r1)), src.height)
    return Window(c0, r0, c1 - c0, r1 - r0)


def kirpich_inputs() -> dict:
    from pysheds.grid import Grid as PyshedsGrid

    if not hasattr(np, "in1d"):  # same numpy 2.4 shim as pipeline/ingest/aoi.py
        np.in1d = lambda ar1, ar2, assume_unique=False, invert=False: np.isin(np.ravel(ar1), ar2, assume_unique=assume_unique, invert=invert)
    feature = json.loads(CATCHMENT.read_text(encoding="utf-8"))["features"][0]
    ring = np.asarray(feature["geometry"]["coordinates"][0], dtype="float64")
    outlet_lonlat = feature["properties"]["outlet_lonlat"]
    with rasterio.open(BURNED) as src:
        win = _crop_window(src, ring)
        burned = src.read(1, window=win)
        transform = src.window_transform(win)
        profile = src.profile.copy()
    with rasterio.open(DEM) as src:
        dem = src.read(1, window=win).astype("float64")
    profile.update(width=burned.shape[1], height=burned.shape[0], transform=transform, tiled=False)
    profile.pop("blockxsize", None)
    profile.pop("blockysize", None)
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "burned_crop.tif"
        with rasterio.open(path, "w", **profile) as dst:
            dst.write(burned, 1)
        nodata = np.float32(np.nan)
        pg = PyshedsGrid.from_raster(str(path), nodata=nodata)
        surface = pg.read_raster(str(path), nodata=nodata)
        inflated = pg.resolve_flats(pg.fill_depressions(pg.fill_pits(surface)))
        fdir = pg.flowdir(inflated, dirmap=D8_DIRMAP)
        acc = np.asarray(pg.accumulation(fdir, dirmap=D8_DIRMAP), dtype="float64")
        ox, oy = to_utm(outlet_lonlat[0], outlet_lonlat[1])
        col0, row0 = ~transform * (ox, oy)
        r, c = int(row0), int(col0)
        sub = acc[r - 3 : r + 4, c - 3 : c + 4]  # the published outlet is rounded to 5 decimals: re-snap within 90 m
        dr, dc = np.unravel_index(int(np.argmax(sub)), sub.shape)
        orow, ocol = r - 3 + int(dr), c - 3 + int(dc)
        sx, sy = transform * (ocol + 0.5, orow + 0.5)
        mask = np.asarray(pg.catchment(x=sx, y=sy, fdir=fdir, dirmap=D8_DIRMAP, xytype="coordinate", snap="center")).astype(bool)
        fdir_np = np.asarray(fdir)
    res = float(transform.a)
    lengths = d8_flow_length(fdir_np, mask, (orow, ocol), res)
    length_m, (fr, fc) = longest_flow_path(lengths)
    drop_m = float(dem[fr, fc] - dem[orow, ocol])
    slope = drop_m / length_m
    tc = kirpich_tc_minutes(length_m, slope)
    far_lon, far_lat = to_lonlat(*(transform * (fc + 0.5, fr + 0.5)))
    out_lon, out_lat = to_lonlat(sx, sy)
    return {
        "catchment_area_km2": float(mask.sum()) * res * res / 1e6,
        "published_area_km2": feature["properties"].get("area_km2"),
        "cells_reaching_outlet": int(np.isfinite(lengths).sum()),
        "outlet_lonlat": [round(float(out_lon), 5), round(float(out_lat), 5)],
        "remote_cell_lonlat": [round(float(far_lon), 5), round(float(far_lat), 5)],
        "length_m": round(length_m, 0),
        "remote_elevation_m": round(float(dem[fr, fc]), 1),
        "outlet_elevation_m": round(float(dem[orow, ocol]), 1),
        "drop_m": round(drop_m, 1),
        "slope_m_per_m": round(slope, 5),
        "tc_minutes": round(tc, 1),
        "tc_hours": round(tc / 60, 2),
    }
