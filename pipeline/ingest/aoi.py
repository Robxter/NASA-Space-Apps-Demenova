"""T-011: farm AOI (Pasaje / Rio Buenavista) and its upstream catchment delineated from SRTM with pysheds.

Method (SPEC prediction-science table, row 1): pits and depressions filled, flats resolved, D8 flow direction
(O'Callaghan & Mark 1984; Jenson & Domingue 1988), flow accumulation, catchment of a pour point.

The AOI placement is a design choice (origin `design`) anchored on OpenStreetMap: the OSM way 468343174
"Rio Buenavista" and the place nodes Pasaje (4930639815) and Buenavista (249421920), read via the Overpass API.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio import features

from pipeline.common.grid import Grid, grid_from_lonlat, to_lonlat, to_utm
from pipeline.common.io import write_geotiff, write_json
from pipeline.common.provenance import REPO_ROOT, dataset_record, record, utc_now
from pipeline.ingest import srtm

PROCESSED = REPO_ROOT / "pipeline" / "data" / "processed"
AOI_DIR = PROCESSED / "aoi"
TERRAIN_DIR = PROCESSED / "terrain"
DERIVED = REPO_ROOT / "pipeline" / "data" / "raw" / "_derived"

AOI_ID = "aoi_pasaje_buenavista"
CATCHMENT_ID = "catchment_buenavista_pasaje"
# Farm AOI box (lon_min, lat_min, lon_max, lat_max), EPSG:4326: the Rio Buenavista reach between Pasaje town and
# Buenavista town (OSM), inside Pasaje canton. Design choice by data-engineer.
FARM_BOX = (-79.875, -3.405, -79.805, -3.345)
# Search box for the catchment DEM; the run fails loudly if the catchment touches its edge.
CATCHMENT_SEARCH_BOX = (-80.0, -3.95, -78.85, -2.85)
# Pour point: where the OSM Rio Buenavista leaves the farm box on its west side (OSM vertex near -79.8711, -3.3778).
POUR_POINT = (-79.8711, -3.3778)
SNAP_RADIUS_M = 300.0
OSM_REF = (
    "OpenStreetMap contributors (ODbL), Overpass API https://overpass-api.de/api/interpreter, read 2026-11-14: "
    "way 468343174 'Rio Buenavista' (waterway=river), node 4930639815 'Pasaje' (place=town), node 249421920 'Buenavista' (place=town)"
)
D8_DIRMAP = (64, 128, 1, 2, 4, 8, 16, 32)  # pysheds default ESRI D8 codes (N, NE, E, SE, S, SW, W, NW)


def _box_polygon(box: tuple[float, float, float, float]) -> dict:
    x0, y0, x1, y1 = box
    return {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}


def rdp(points: np.ndarray, tolerance: float) -> np.ndarray:
    """Ramer-Douglas-Peucker simplification of an open polyline (N, 2), iterative."""
    if len(points) < 3:
        return points
    keep = np.zeros(len(points), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        start, end = stack.pop()
        if end <= start + 1:
            continue
        a, b = points[start], points[end]
        seg = points[start + 1 : end]
        ab = b - a
        norm = np.hypot(*ab)
        if norm == 0:
            dist = np.hypot(*(seg - a).T)
        else:
            dist = np.abs(ab[0] * (seg[:, 1] - a[1]) - ab[1] * (seg[:, 0] - a[0])) / norm
        index = int(np.argmax(dist))
        if dist[index] > tolerance:
            mid = start + 1 + index
            keep[mid] = True
            stack.extend([(start, mid), (mid, end)])
    return points[keep]


def simplify_ring(ring: np.ndarray, tolerance: float) -> np.ndarray:
    """Simplify a closed ring by splitting it at its farthest vertex from the start."""
    ring = ring[:-1] if np.allclose(ring[0], ring[-1]) else ring
    far = int(np.argmax(np.hypot(*(ring - ring[0]).T)))
    first = rdp(ring[: far + 1], tolerance)
    second = rdp(np.vstack([ring[far:], ring[:1]]), tolerance)
    out = np.vstack([first[:-1], second])
    return out if len(out) >= 4 else np.vstack([ring, ring[:1]])


def boundary_outlet(acc: np.ndarray, rows: slice, cols: slice) -> tuple[int, int]:
    """(row, col) of the highest-accumulation cell on the boundary ring of the window (the window's outlet)."""
    window = np.full(acc.shape, -1.0)
    sub = acc[rows, cols]
    ring = np.full(sub.shape, -1.0)
    ring[0, :], ring[-1, :], ring[:, 0], ring[:, -1] = sub[0, :], sub[-1, :], sub[:, 0], sub[:, -1]
    window[rows, cols] = ring
    r, c = np.unravel_index(int(np.argmax(window)), window.shape)
    return int(r), int(c)


def delineate(dem_path: Path, pour_lonlat: tuple[float, float] | None, snap_radius_m: float = SNAP_RADIUS_M,
              outlet_window: tuple[slice, slice] | None = None):
    """Return (catchment mask, accumulation in cells, outlet (x, y) in grid CRS, grid transform).

    The outlet is either the highest-accumulation cell on the boundary of `outlet_window`, or the pour point snapped
    to the highest accumulation within `snap_radius_m`.
    """
    from pysheds.grid import Grid as PyshedsGrid

    if not hasattr(np, "in1d"):  # pysheds 0.5 calls np.in1d, removed in numpy 2.4; same semantics as isin on 1-D
        np.in1d = lambda ar1, ar2, assume_unique=False, invert=False: np.isin(np.ravel(ar1), ar2, assume_unique=assume_unique, invert=invert)
    nodata = np.float32(np.nan)
    pg = PyshedsGrid.from_raster(str(dem_path), nodata=nodata)
    dem = pg.read_raster(str(dem_path), nodata=nodata)
    pit_filled = pg.fill_pits(dem)
    flooded = pg.fill_depressions(pit_filled)
    inflated = pg.resolve_flats(flooded)
    fdir = pg.flowdir(inflated, dirmap=D8_DIRMAP)
    acc = pg.accumulation(fdir, dirmap=D8_DIRMAP)
    acc_np = np.asarray(acc, dtype="float64")
    transform = pg.affine
    if outlet_window is not None:
        srow, scol = boundary_outlet(acc_np, *outlet_window)
    else:  # snap: highest accumulation within the radius of the pour point
        px, py = to_utm(*pour_lonlat)
        rows, cols = acc_np.shape
        col0, row0 = ~transform * (px, py)
        r = int(np.ceil(snap_radius_m / transform.a))
        r0, r1 = max(int(row0) - r, 0), min(int(row0) + r + 1, rows)
        c0, c1 = max(int(col0) - r, 0), min(int(col0) + r + 1, cols)
        yy, xx = np.mgrid[r0:r1, c0:c1]
        within = np.hypot((yy + 0.5 - row0) * transform.a, (xx + 0.5 - col0) * transform.a) <= snap_radius_m
        window = np.where(within, acc_np[r0:r1, c0:c1], -1)
        wr, wc = np.unravel_index(int(np.argmax(window)), window.shape)
        srow, scol = r0 + wr, c0 + wc
    sx, sy = transform * (scol + 0.5, srow + 0.5)
    catch = pg.catchment(x=sx, y=sy, fdir=fdir, dirmap=D8_DIRMAP, xytype="coordinate")
    return np.asarray(catch).astype(bool), acc_np, (sx, sy), transform


def catchment_polygon(mask: np.ndarray, transform, tolerance_m: float = 90.0) -> tuple[dict, float]:
    """Largest connected outline of the mask, simplified (RDP, tolerance in m), to EPSG:4326. Returns (geometry, area_km2)."""
    shapes = [geom for geom, value in features.shapes(mask.astype("uint8"), mask=mask, transform=transform, connectivity=8) if value == 1]
    largest = max(shapes, key=lambda g: len(g["coordinates"][0]))
    ring = np.asarray(largest["coordinates"][0], dtype="float64")
    simple = simplify_ring(ring, tolerance_m)
    lons, lats = to_lonlat(simple[:, 0], simple[:, 1])
    coords = [[round(float(x), 5), round(float(y), 5)] for x, y in zip(lons, lats)]
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    area_km2 = float(mask.sum()) * abs(transform.a * transform.e) / 1e6
    return {"type": "Polygon", "coordinates": [coords]}, area_km2


def run() -> dict:
    """Build the farm AOI, the catchment and farm-scale terrain slices. Idempotent (downloads are cached)."""
    tiles = srtm.download_tiles(*CATCHMENT_SEARCH_BOX)
    grid = grid_from_lonlat(*CATCHMENT_SEARCH_BOX)
    dem = srtm.dem_on_grid(tiles, grid)
    accessed = utc_now()
    srtm_processing = [
        "SRTM GL1 tiles " + ", ".join(p.stem for p in tiles) + " mosaicked",
        f"reprojected to EPSG:32717 30 m lattice (multiples of 30 m), method: {srtm.RESAMPLING}",
    ]
    dem_path = DERIVED / "srtm_dem_catchment_search_30m.tif"
    write_geotiff(
        dem_path, dem, grid,
        dataset_record("prov-srtm-dem-catchment-search-30m", "srtm", url=srtm.OT_PAGE, aoi="catchment_search_box",
                       time_range=None, processing=srtm_processing, accessed=accessed,
                       notes="Intermediate DEM for catchment delineation; git-ignored, rebuilt by `python -m pipeline.ingest aoi`."),
        band_names=["elevation_m"],
    )
    farm_grid = grid_from_lonlat(*FARM_BOX)
    r0 = int(round((grid.y_max - farm_grid.y_max) / grid.res))
    c0 = int(round((farm_grid.x_min - grid.x_min) / grid.res))
    sl = (slice(r0, r0 + farm_grid.height), slice(c0, c0 + farm_grid.width))
    mask, acc, snapped, transform = delineate(dem_path, None, outlet_window=sl)
    edge = mask[0, :].any() or mask[-1, :].any() or mask[:, 0].any() or mask[:, -1].any()
    if edge:
        raise RuntimeError("catchment touches the DEM search box edge: enlarge CATCHMENT_SEARCH_BOX")
    geometry, area_km2 = catchment_polygon(mask, transform)
    snapped_lon, snapped_lat = to_lonlat(*snapped)
    method = [
        *srtm_processing,
        "pysheds 0.5: fill_pits, fill_depressions, resolve_flats (numpy 2.4 shim: np.in1d -> np.isin)",
        "D8 flow direction (O'Callaghan & Mark 1984; Jenson & Domingue 1988), flow accumulation",
        "outlet = cell with the highest flow accumulation on the boundary of the farm AOI grid",
        "catchment raster polygonized (8-connectivity), largest outline kept, Ramer-Douglas-Peucker 90 m, coordinates to EPSG:4326 at 5 decimals",
    ]
    prov_catch = dataset_record("prov-catchment-buenavista-srtm", "srtm", url=srtm.OT_PAGE, aoi=CATCHMENT_ID, time_range=None,
                                processing=method, accessed=accessed,
                                notes=("Upstream catchment of the farm AOI outlet, computed from SRTM. The DEM channel follows the OSM Rio Buenavista "
                                       "from where it enters the box (-79.807, -3.400) past Buenavista town and leaves the box to the north-west, "
                                       "where D8 on flat lowland departs from the OSM course. " + OSM_REF))
    AOI_DIR.mkdir(parents=True, exist_ok=True)
    write_json(AOI_DIR / "catchment.geojson", {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature", "geometry": geometry,
            "properties": {
                "catchment_id": CATCHMENT_ID, "river": "Rio Buenavista (OSM name at the pour point)",
                "area_km2": round(area_km2, 1), "pour_point_lonlat": [round(float(snapped_lon), 5), round(float(snapped_lat), 5)],
                "origin": {"*": "sourced", "pour_point_lonlat": "design"},
            },
        }],
    }, prov_catch)
    prov_aoi = record("prov-aoi-pasaje-buenavista", aoi=AOI_ID, time_range=None,
                      processing=["box drawn around the OSM Rio Buenavista reach between Pasaje and Buenavista towns"],
                      notes="Farm area of interest: a design choice by data-engineer, not a dataset. Anchored on " + OSM_REF)
    write_json(AOI_DIR / "farm_aoi.geojson", {
        "type": "FeatureCollection",
        "features": [{"type": "Feature", "geometry": _box_polygon(FARM_BOX),
                      "properties": {"aoi_id": AOI_ID, "canton": "Pasaje", "province": "El Oro", "origin": "design"}}],
    }, prov_aoi)
    # Farm-scale terrain slices on the shared lattice (committed): DEM and upslope area from the full catchment.
    TERRAIN_DIR.mkdir(parents=True, exist_ok=True)
    write_geotiff(TERRAIN_DIR / "dem_farm_30m.tif", dem[sl], farm_grid,
                  dataset_record("prov-srtm-dem-farm-30m", "srtm", url=srtm.OT_PAGE, aoi=AOI_ID, time_range=None,
                                 processing=srtm_processing + ["clipped to the farm AOI grid"], accessed=accessed,
                                 notes="Elevation (m) on the farm grid."), band_names=["elevation_m"])
    upslope = (acc[sl] * grid.res * grid.res).astype("float64")
    write_geotiff(TERRAIN_DIR / "upslope_area_farm_30m.tif", upslope, farm_grid,
                  dataset_record("prov-srtm-upslope-area-farm-30m", "srtm", url=srtm.OT_PAGE, aoi=AOI_ID, time_range=None,
                                 processing=method[:4] + ["upslope area = accumulated cells x 900 m2, computed on the whole search box, clipped to the farm grid"],
                                 accessed=accessed, notes="D8 upslope contributing area (m2) per cell, input for TWI (data-scientist, T-020)."),
                  band_names=["upslope_area_m2"])
    in_farm = mask[sl]
    return {
        "area_km2": area_km2, "snapped": [float(snapped_lon), float(snapped_lat)], "farm_grid": farm_grid.as_dict(),
        "search_grid": grid.as_dict(), "farm_cells_in_catchment": int(in_farm.sum()), "farm_cells": int(in_farm.size),
        "catchment_bounds_lonlat": [min(c[0] for c in geometry["coordinates"][0]), min(c[1] for c in geometry["coordinates"][0]),
                                    max(c[0] for c in geometry["coordinates"][0]), max(c[1] for c in geometry["coordinates"][0])],
        "polygon_vertices": len(geometry["coordinates"][0]),
    }
