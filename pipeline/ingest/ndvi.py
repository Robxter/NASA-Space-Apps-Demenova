"""Sentinel-2 L2A NDVI from the Earth Search STAC API (anonymous; dataset key `sentinel2` in config/datasets.yaml).

Per scene: red (B04) and nir (B08) at 10 m, scaled with the item's own STAC `raster:bands` scale/offset; SCL at
20 m (nearest to 10 m). A 10 m pixel is clear when SCL is 4 (vegetation), 5 (not vegetated) or 6 (water).
NDVI = (NIR - Red) / (NIR + Red) (Rouse et al. 1973-74). 30 m value = mean of the clear 10 m pixels of the cell when
at least 5 of its 9 are clear, else missing (NaN). Nothing is gap-filled.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path

import httpx
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT

from pipeline.common.grid import Grid
from pipeline.common.io import write_geotiff
from pipeline.common.provenance import dataset_record, utc_now
from pipeline.ingest.cache import RAW_ROOT, USER_AGENT

STAC_SEARCH = "https://earth-search.aws.element84.com/v1/search"
COLLECTION = "sentinel-2-l2a"
CLEAR_SCL = (4, 5, 6)
MIN_CLEAR_OF_9 = 5
GDAL_ENV = {"GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR", "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif", "GDAL_HTTP_MAX_RETRY": "3"}


def search(bbox: tuple[float, float, float, float], start: str, end: str, max_cloud: float = 60.0) -> list[dict]:
    body = {"collections": [COLLECTION], "bbox": list(bbox), "datetime": f"{start}T00:00:00Z/{end}T23:59:59Z",
            "limit": 200, "query": {"eo:cloud_cover": {"lt": max_cloud}}}
    response = httpx.post(STAC_SEARCH, json=body, timeout=120, headers={"User-Agent": USER_AGENT})
    response.raise_for_status()
    items = response.json()["features"]
    return sorted(items, key=lambda it: it["properties"]["datetime"])


def _band_scaling(item: dict, key: str) -> tuple[float, float]:
    """(scale, offset) that turn the COG's DN into surface reflectance for this item.

    T-049: Earth Search `sentinel-2-l2a` items with `earthsearch:boa_offset_applied: true` already carry the
    PB>=04.00 BOA_ADD_OFFSET in their pixel values, yet still list `offset: -0.1` in raster:bands. For them only the
    scale applies (Element 84, github.com/Element84/earth-search/issues/41, 2025-05-15; config/datasets.yaml key
    sentinel2). Applying the offset again made red reflectance negative over vegetation and NDVI > 1.
    """
    band = item["assets"][key]["raster:bands"][0]
    scale, offset = float(band.get("scale", 1.0)), float(band.get("offset", 0.0))
    if item["properties"].get("earthsearch:boa_offset_applied") is True:
        offset = 0.0
    return scale, offset


def ndvi_from_dn(red_dn: np.ndarray, nir_dn: np.ndarray, scl: np.ndarray, red_sc: tuple[float, float],
                 nir_sc: tuple[float, float]) -> np.ndarray:
    """10 m NDVI from DN. Missing (NaN) where SCL is not clear, DN is nodata (0) or a reflectance is <= 0.

    A non-positive surface reflectance has no physical NDVI; it stays missing rather than being clipped.
    With both reflectances > 0, NDVI lies strictly inside (-1, 1); the assertion guards against scaling bugs.
    """
    red, nir = red_dn * red_sc[0] + red_sc[1], nir_dn * nir_sc[0] + nir_sc[1]
    ok = np.isin(scl, CLEAR_SCL) & (red_dn > 0) & (nir_dn > 0) & (red > 0) & (nir > 0)
    with np.errstate(invalid="ignore", divide="ignore"):
        out = np.where(ok, (nir - red) / (nir + red), np.nan)
    finite = out[np.isfinite(out)]
    if finite.size and (finite.min() < -1 or finite.max() > 1):
        raise ValueError("NDVI outside [-1, 1]: reflectance scaling is wrong")
    return out


def _read_on(url: str, grid: Grid, resampling: Resampling) -> np.ndarray:
    with rasterio.open(url) as src, WarpedVRT(src, crs=grid.crs, transform=grid.transform, width=grid.width,
                                             height=grid.height, resampling=resampling, nodata=0) as vrt:
        return vrt.read(1)


def raw_scene(item: dict, grid10: Grid) -> Path:
    """Cache the scene's red, nir, SCL clipped to the 10 m grid: raw/sentinel2_l2a/<date>/<item id>.tif."""
    date = item["properties"]["datetime"][:10]
    path = RAW_ROOT / "sentinel2_l2a" / date / f"{item['id']}.tif"
    if path.is_file() and path.stat().st_size > 0:
        return path
    with rasterio.Env(**GDAL_ENV):
        red = _read_on(item["assets"]["red"]["href"], grid10, Resampling.nearest)
        nir = _read_on(item["assets"]["nir"]["href"], grid10, Resampling.nearest)
        scl = _read_on(item["assets"]["scl"]["href"], grid10, Resampling.nearest)
    path.parent.mkdir(parents=True, exist_ok=True)
    profile = {"driver": "GTiff", "dtype": "uint16", "count": 3, "height": grid10.height, "width": grid10.width,
               "crs": grid10.crs, "transform": grid10.transform, "nodata": 0, "compress": "deflate"}
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(np.stack([red, nir, scl.astype("uint16")]))
        for i, name in enumerate(("red_B04_dn", "nir_B08_dn", "scl"), start=1):
            dst.set_band_description(i, name)
    rs, ro = _band_scaling(item, "red")
    from pipeline.common.provenance import write_sidecar
    write_sidecar(path, dataset_record(
        f"prov-s2-raw-{item['id'].lower()}", "sentinel2", aoi="farm_grid_10m", time_range=(date, date),
        processing=[f"STAC item {item['id']} ({COLLECTION}); assets red, nir, scl read via HTTP (COG)",
                    "warped to the farm grid at 10 m in EPSG:32717, nearest (10 m lattice nests in the 30 m lattice)"],
        notes=f"Digital numbers as published; reflectance = DN x {rs} + ({ro}) (raster:bands, offset dropped when earthsearch:boa_offset_applied is true, T-049). Item cloud cover {item['properties'].get('eo:cloud_cover')} % (scene)."),
        origin="sourced")
    return path


def ndvi_30m(item: dict, grid: Grid) -> tuple[np.ndarray, float]:
    """NDVI on the 30 m grid for one scene, and the clear fraction of the grid."""
    grid10 = Grid(x_min=grid.x_min, y_max=grid.y_max, width=grid.width * 3, height=grid.height * 3, res=grid.res / 3)
    path = raw_scene(item, grid10)
    with rasterio.open(path) as src:
        red_dn, nir_dn, scl = src.read().astype("float64")
    ndvi10 = ndvi_from_dn(red_dn, nir_dn, scl, _band_scaling(item, "red"), _band_scaling(item, "nir"))
    ndvi = aggregate_3x3(ndvi10)
    return ndvi.astype("float32"), float(np.mean(~np.isnan(ndvi)))


def scaling_note(item: dict) -> str:
    rs, ro = _band_scaling(item, "red")
    flag = item["properties"].get("earthsearch:boa_offset_applied")
    return (f"reflectance = DN x {rs} + ({ro}); earthsearch:boa_offset_applied = {flag}, processing baseline "
            f"{item['properties'].get('s2:processing_baseline')} (T-049 scaling rule, config/datasets.yaml sentinel2)")


def aggregate_3x3(fine: np.ndarray, min_valid: int = MIN_CLEAR_OF_9) -> np.ndarray:
    """10 m -> 30 m: mean of the non-missing pixels of each 3 x 3 block when at least `min_valid` exist, else NaN."""
    h, w = fine.shape[0] // 3, fine.shape[1] // 3
    blocks = fine[: h * 3, : w * 3].reshape(h, 3, w, 3)
    valid = ~np.isnan(blocks)
    count = valid.sum(axis=(1, 3))
    total = np.where(valid, blocks, 0.0).sum(axis=(1, 3))
    with np.errstate(invalid="ignore", divide="ignore"):
        return np.where(count >= min_valid, total / np.maximum(count, 1), np.nan)


def composite(bbox, grid: Grid, start: str, end: str, aoi: str, out: Path, min_clear: float = 0.3) -> dict:
    """Median NDVI of every scene in [start, end] with clear fraction >= min_clear. Writes GeoTIFF (median, count)."""
    items = search(bbox, start, end)
    stack, used = [], []
    for item in items:
        ndvi, clear = ndvi_30m(item, grid)
        if clear >= min_clear:
            stack.append(ndvi)
            used.append((item["id"], item["properties"]["datetime"][:10], round(clear, 3)))
    if not stack:
        raise RuntimeError("no scene with enough clear pixels")
    arr = np.stack(stack)
    with np.errstate(all="ignore"):
        median = np.nanmedian(arr, axis=0)
    count = np.sum(~np.isnan(arr), axis=0).astype("float32")
    prov = dataset_record(
        "prov-s2-ndvi-composite-" + start + "-" + end, "sentinel2", aoi=aoi, time_range=(start, end),
        processing=["Earth Search STAC search " + COLLECTION + f", scene cloud cover < 60 %, {len(items)} scenes found",
                    "per scene: reflectance = DN x scale (+ raster:bands offset only when earthsearch:boa_offset_applied is not true; T-049); clear = SCL in {4,5,6} and both reflectances > 0",
                    "NDVI = (NIR - Red) / (NIR + Red) at 10 m; 30 m = mean of clear 10 m pixels when >= 5 of 9 clear (area-weighted aggregation)",
                    f"scenes kept when >= {min_clear:.0%} of the farm grid is clear: {len(used)}",
                    "composite = per-cell median of the kept scenes (NaN ignored); band 2 = number of clear observations"],
        accessed=utc_now(), notes="Regenerated for T-049 (earlier file applied the BOA offset twice; NDVI was > 1). Scenes used (id, date, clear fraction of grid): "
        + "; ".join(f"{a} {b} {c}" for a, b, c in used))
    write_geotiff(out, np.stack([median, count]), grid, prov, band_names=["ndvi_median", "n_clear_obs"])
    return {"scenes_found": len(items), "scenes_used": used}


def scenes_in_window(bbox, grid: Grid, start: str, end: str, aoi: str, out_dir: Path, min_clear: float = 0.3) -> tuple[list[dict], list[dict]]:
    """One NDVI GeoTIFF per scene in [start, end] whose clear fraction of the farm grid is >= min_clear (same rule as
    the composite). Cloudy pixels of a kept scene stay NaN; scenes below the threshold are listed, not written."""
    rows, skipped = [], []
    for item in search(bbox, start, end, max_cloud=100.0):
        date = item["properties"]["datetime"][:10]
        ndvi, clear = ndvi_30m(item, grid)
        if clear < min_clear:
            skipped.append({"item": item["id"], "date": date, "clear_fraction": round(clear, 3)})
            continue
        out = out_dir / f"ndvi_{date}_{item['id']}.tif"
        prov = dataset_record(f"prov-s2-ndvi-{item['id'].lower()}", "sentinel2", aoi=aoi, time_range=(date, date),
                              processing=[f"per scene: {scaling_note(item)}; clear = SCL in {{4,5,6}} and both reflectances > 0",
                                          "NDVI at 10 m; 30 m = mean of clear 10 m pixels when >= 5 of 9 clear, else missing",
                                          f"scene kept because >= {min_clear:.0%} of the farm grid is clear"],
                              accessed=utc_now(), notes=f"STAC item {item['id']}; clear fraction of the farm grid {clear:.3f}.")
        write_geotiff(out, ndvi, grid, prov, band_names=["ndvi"])
        rows.append({"item": item["id"], "date": date, "clear_fraction": round(clear, 3), "file": out.name})
    return rows, skipped


def today() -> str:
    return dt.date.today().isoformat()
