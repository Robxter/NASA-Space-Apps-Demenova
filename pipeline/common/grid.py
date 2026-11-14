"""The analysis grid (ADR-002): EPSG:32717 (UTM 17S), 30 m. Owner: data-engineer (T-019).

Alignment rule: every grid's edges sit on integer multiples of 30 m in EPSG:32717, so grids cut for different
areas (farm, catchment) nest cell-for-cell. The SRTM DEM is reprojected onto this lattice, so every layer shares
the DEM's cells ("aligned to the SRTM tile" in practice; a geographic 1-arc-second tile cannot be aligned exactly
to a UTM lattice).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from affine import Affine
from pyproj import Transformer

CRS = "EPSG:32717"
RES_M = 30.0


@dataclass(frozen=True)
class Grid:
    x_min: float
    y_max: float
    width: int
    height: int
    res: float = RES_M
    crs: str = CRS

    @property
    def transform(self) -> Affine:
        return Affine(self.res, 0.0, self.x_min, 0.0, -self.res, self.y_max)

    @property
    def bounds(self) -> tuple[float, float, float, float]:
        return (self.x_min, self.y_max - self.height * self.res, self.x_min + self.width * self.res, self.y_max)

    @property
    def shape(self) -> tuple[int, int]:
        return (self.height, self.width)

    def as_dict(self) -> dict:
        return {"crs": self.crs, "res_m": self.res, "x_min": self.x_min, "y_max": self.y_max, "width": self.width, "height": self.height}


def snap_bounds(x_min: float, y_min: float, x_max: float, y_max: float, res: float = RES_M) -> tuple[float, float, float, float]:
    """Expand projected bounds outward to the res-multiple lattice."""
    return (math.floor(x_min / res) * res, math.floor(y_min / res) * res, math.ceil(x_max / res) * res, math.ceil(y_max / res) * res)


def grid_from_projected(x_min: float, y_min: float, x_max: float, y_max: float, res: float = RES_M) -> Grid:
    x0, y0, x1, y1 = snap_bounds(x_min, y_min, x_max, y_max, res)
    return Grid(x_min=x0, y_max=y1, width=int(round((x1 - x0) / res)), height=int(round((y1 - y0) / res)), res=res)


def grid_from_lonlat(lon_min: float, lat_min: float, lon_max: float, lat_max: float, res: float = RES_M, pad_m: float = 0.0) -> Grid:
    """Smallest lattice-aligned grid covering a lon/lat box (EPSG:4326), optionally padded in metres."""
    to_utm = Transformer.from_crs("EPSG:4326", CRS, always_xy=True)
    x0, y0, x1, y1 = to_utm.transform_bounds(lon_min, lat_min, lon_max, lat_max, densify_pts=21)
    return grid_from_projected(x0 - pad_m, y0 - pad_m, x1 + pad_m, y1 + pad_m, res)


def to_lonlat(xs, ys):
    """Project EPSG:32717 coordinates to lon/lat (EPSG:4326)."""
    return Transformer.from_crs(CRS, "EPSG:4326", always_xy=True).transform(xs, ys)


def to_utm(lons, lats):
    return Transformer.from_crs("EPSG:4326", CRS, always_xy=True).transform(lons, lats)
