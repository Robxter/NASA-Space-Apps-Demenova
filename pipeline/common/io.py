"""Writers whose output passes scripts/check_provenance.py. Owner: data-engineer (T-019).

- GeoTIFF: float32, NaN as nodata (missing stays missing), DEFLATE, plus `<file>.provenance.json`.
- GeoJSON / JSON: top-level `provenance` member; every number gets an origin through `origin` in properties.
- CSV: sidecar with provenance and an origin map.
"""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path
from typing import Any, Sequence

import numpy as np
import rasterio

from pipeline.common.grid import Grid
from pipeline.common.provenance import write_sidecar


def _clean(value: Any) -> Any:
    """Recursively replace non-finite floats with None (JSON has no NaN; missing is null)."""
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {k: _clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_clean(v) for v in value]
    if isinstance(value, np.generic):
        return _clean(value.item())
    return value


def write_json(path: Path, content: dict[str, Any], provenance: Any) -> Path:
    """Write JSON/GeoJSON with a top-level provenance member."""
    path.parent.mkdir(parents=True, exist_ok=True)
    body = dict(content)
    body["provenance"] = provenance
    path.write_text(json.dumps(_clean(body), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return path


def write_geotiff(
    path: Path,
    bands: np.ndarray,
    grid: Grid,
    provenance: Any,
    *,
    band_names: Sequence[str] | None = None,
    tags: dict[str, str] | None = None,
    origin: str = "sourced",
) -> Path:
    """Write a (bands, rows, cols) or (rows, cols) float32 GeoTIFF on `grid` with NaN nodata and a sidecar."""
    data = np.asarray(bands, dtype="float32")
    if data.ndim == 2:
        data = data[np.newaxis]
    if data.shape[1:] != grid.shape:
        raise ValueError(f"array shape {data.shape[1:]} does not match grid {grid.shape}")
    path.parent.mkdir(parents=True, exist_ok=True)
    profile = {
        "driver": "GTiff", "dtype": "float32", "count": data.shape[0], "height": grid.height, "width": grid.width,
        "crs": grid.crs, "transform": grid.transform, "nodata": float("nan"), "compress": "deflate", "predictor": 3,
        "tiled": True, "blockxsize": 256, "blockysize": 256,
    }
    if grid.width < 256 or grid.height < 256:
        profile.update(tiled=False)
        profile.pop("blockxsize")
        profile.pop("blockysize")
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(data)
        if band_names:
            for index, name in enumerate(band_names, start=1):
                dst.set_band_description(index, name)
        if tags:
            dst.update_tags(**tags)
    write_sidecar(path, provenance, origin=origin)
    return path


def write_csv(path: Path, header: Sequence[str], rows: Sequence[Sequence[Any]], provenance: Any, origin: Any) -> Path:
    """Write a CSV (missing values as empty cells) and its sidecar with provenance and an origin spec."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        for row in rows:
            writer.writerow(["" if (isinstance(v, float) and not math.isfinite(v)) or v is None else v for v in row])
    write_sidecar(path, provenance, origin=origin)
    return path
