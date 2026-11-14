"""SRTM GL1 (NASA SRTM v3, 1 arc second) tiles from the OpenTopography open bucket, mosaicked onto the 30 m grid.

Dataset identity verified in config/datasets.yaml (key `srtm`). Download is anonymous (no Earthdata login).
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject

from pipeline.common.grid import Grid
from pipeline.common.provenance import dataset_record
from pipeline.ingest.cache import cache_path, cached_download

TILE_URL = "https://opentopography.s3.sdsc.edu/raster/SRTM_GL1/SRTM_GL1_srtm/{name}.tif"
OT_PAGE = "https://portal.opentopography.org/raster?opentopoID=OTSRTM.082015.4326.1"
PRODUCT, VERSION = "srtm_gl1", "003"
RESAMPLING = "bilinear"


def tile_name(lat_floor: int, lon_floor: int) -> str:
    """SRTM tile name from its south-west corner, e.g. (-4, -80) -> 'S04W080'."""
    ns = "S" if lat_floor < 0 else "N"
    ew = "W" if lon_floor < 0 else "E"
    return f"{ns}{abs(lat_floor):02d}{ew}{abs(lon_floor):03d}"


def tiles_for_bounds(lon_min: float, lat_min: float, lon_max: float, lat_max: float) -> list[str]:
    names = []
    for lat in range(math.floor(lat_min), math.ceil(lat_max)):
        for lon in range(math.floor(lon_min), math.ceil(lon_max)):
            names.append(tile_name(lat, lon))
    return names


def download_tiles(lon_min: float, lat_min: float, lon_max: float, lat_max: float) -> list[Path]:
    paths = []
    for name in tiles_for_bounds(lon_min, lat_min, lon_max, lat_max):
        url = TILE_URL.format(name=name)
        prov = dataset_record(
            f"prov-srtm-gl1-{name.lower()}", "srtm", url=OT_PAGE, aoi=None, time_range=None,
            processing=[f"downloaded unchanged from {url}"],
            notes="Raw 1x1 degree tile, byte-identical to the OpenTopography copy of NASA SRTM GL1 v3 (voids filled).",
        )
        path, _ = cached_download(url, cache_path(PRODUCT, VERSION, f"{name}.tif"), prov)
        paths.append(path)
    return paths


def dem_on_grid(tile_paths: list[Path], grid: Grid) -> np.ndarray:
    """Mosaic tiles onto `grid` (bilinear; DEM is continuous and the source is ~30 m). Voids/no-data -> NaN."""
    out = np.full(grid.shape, np.nan, dtype="float32")
    for path in tile_paths:
        with rasterio.open(path) as src:
            dst = np.full(grid.shape, np.nan, dtype="float32")
            reproject(
                source=rasterio.band(src, 1), destination=dst, src_transform=src.transform, src_crs=src.crs,
                src_nodata=src.nodata, dst_transform=grid.transform, dst_crs=grid.crs, dst_nodata=np.nan,
                resampling=Resampling.bilinear,
            )
        fill = np.isnan(out) & ~np.isnan(dst)
        out[fill] = dst[fill]
    return out
