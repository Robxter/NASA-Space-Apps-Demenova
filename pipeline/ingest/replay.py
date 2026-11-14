"""T-014: harmonized replay stack on the farm's 30 m EPSG:32717 grid for a frozen window (default 2026-02-15:2026-03-05).

Layers and resampling (recorded per layer in stack.json and in each file's provenance):
- POWER daily: nearest (one POWER source cell covers the AOI, checked in power.py): coarse value kept coarse.
- Sentinel-2 NDVI: 10 m -> 30 m mean of clear pixels (area-weighted aggregation), one file per scene; no compositing.
- SRTM DEM / upslope area: see pipeline/ingest/aoi.py (bilinear DEM).
- IMERG, SMAP, GLDAS: need Earthdata login; listed as pending until credentials exist (PENDING.md). Nothing filled.
"""

from __future__ import annotations

import csv
import datetime as dt

import numpy as np

from pipeline.common.grid import grid_from_lonlat
from pipeline.common.io import write_geotiff, write_json
from pipeline.common.provenance import REPO_ROOT, dataset_record, record, utc_now
from pipeline.ingest import ndvi as ndvi_mod
from pipeline.ingest import power
from pipeline.ingest.aoi import AOI_ID, FARM_BOX

PROCESSED = REPO_ROOT / "pipeline" / "data" / "processed"


def parse_window(text: str) -> tuple[dt.date, dt.date]:
    start, end = text.split(":")
    a, b = dt.date.fromisoformat(start), dt.date.fromisoformat(end)
    if b < a:
        raise ValueError("replay window end is before start")
    return a, b


def days(a: dt.date, b: dt.date) -> list[str]:
    return [(a + dt.timedelta(days=i)).isoformat() for i in range((b - a).days + 1)]


def build(start: dt.date, end: dt.date) -> dict:
    grid = grid_from_lonlat(*FARM_BOX)
    out = PROCESSED / "replay" / f"{start}_{end}"
    out.mkdir(parents=True, exist_ok=True)
    dates = days(start, end)
    layers = []

    # POWER daily (rows from the committed CSV built by power.run; fetched if absent).
    csv_path = PROCESSED / "weather" / "power_daily_farm.csv"
    if not csv_path.is_file():
        power.run(FARM_BOX, "2015-01-01", dt.date.today().isoformat(), AOI_ID)
    with csv_path.open(encoding="utf-8") as handle:
        rows = {r["date"]: r for r in csv.DictReader(handle)}
    columns = [c for c in next(iter(rows.values())).keys() if c != "date"]
    for column in columns:
        bands = np.full((len(dates), *grid.shape), np.nan, dtype="float32")
        for i, day in enumerate(dates):
            text = rows.get(day, {}).get(column, "")
            if text != "":
                bands[i, :, :] = float(text)
        name = f"power_{column}_30m.tif"
        write_geotiff(out / name, bands, grid, dataset_record(
            f"prov-replay-power-{column}-{start}-{end}", "power", aoi=AOI_ID, time_range=(start.isoformat(), end.isoformat()),
            processing=["from pipeline/data/processed/weather/power_daily_farm.csv (POWER daily, LST days)",
                        "placed on the 30 m farm grid by nearest: one POWER cell covers the AOI, so each band is that cell's value",
                        "one band per day, band description = date; missing day = NaN band"],
            accessed=utc_now(), notes="Coarse value kept coarse; no sub-cell detail."), band_names=dates)
        layers.append({"layer": f"power_{column}", "file": name, "dataset": "power", "resampling": "nearest (single source cell)", "status": "available"})

    # Sentinel-2 NDVI scenes inside the window (any cloud cover; cloudy pixels stay missing).
    scenes = ndvi_mod.scenes_in_window(FARM_BOX, grid, start.isoformat(), end.isoformat(), AOI_ID, out)
    for s in scenes:
        layers.append({"layer": "ndvi", "file": s["file"], "date": s["date"], "dataset": "sentinel2",
                       "resampling": "mean of clear 10 m pixels (>= 5 of 9)", "clear_fraction": s["clear_fraction"], "status": "available"})

    for name in ("dem_farm_30m.tif", "upslope_area_farm_30m.tif"):
        layers.append({"layer": name.removesuffix("_30m.tif").removesuffix("_farm"), "file": f"../../terrain/{name}", "dataset": "srtm",
                       "resampling": "bilinear (DEM); D8 accumulation for upslope area", "status": "available"})
    pending = []
    try:
        from pipeline.ingest import smap

        sm = smap.replay_layers(FARM_BOX, grid, dates, AOI_ID, out)
        for name in ("soil_moisture_am", "soil_moisture_pm", "retrieval_qual_flag_am", "retrieval_qual_flag_pm"):
            entry = {"layer": f"smap_{name}", "file": f"smap_{name}_30m.tif", "dataset": "smap",
                     "resampling": "nearest (9 km EASE-Grid 2.0 cell containing the 30 m cell)", "status": "available",
                     "missing_granule_dates": sm["granule_missing"]}
            if name in sm["dates_with_value"]:
                entry["dates_with_value"] = sm["dates_with_value"][name]
            layers.append(entry)
    except PermissionError as error:
        pending.append(("smap", f"SPL3SMP_E 006 not reachable: {error}"))
    try:
        from pipeline.ingest import imerg

        im = imerg.farm_layer(grid, dates, AOI_ID, out)
        layers.append({"layer": "imerg_precipitation_mm", "file": im["file"], "dataset": "imerg_late_daily" if im["runs"] == ["late"] else "imerg",
                       "runs": im["runs"], "resampling": "nearest (0.1 degree cell containing the 30 m cell)", "status": "available",
                       "missing_dates": im["missing"], "upstream_series": "../../rain/imerg_catchment_daily.csv"})
    except PermissionError as error:
        pending.append(("imerg", f"IMERG not reachable: {error}"))
    try:
        from pipeline.ingest import gldas

        gl = gldas.replay_layers(FARM_BOX, grid, dates, AOI_ID, out)
        for name in gl["files"]:
            layers.append({"layer": name.removesuffix("_30m.tif"), "file": name, "dataset": "gldas",
                           "resampling": "daily mean of 8 three-hourly instants; nearest (0.25 degree cell containing the 30 m cell)",
                           "status": "available", "missing_dates": gl["incomplete_days"]})
    except PermissionError as error:
        pending.append(("gldas", f"GLDAS not reachable: {error}"))
    for key, reason in pending:
        layers.append({"layer": key, "file": None, "dataset": key, "resampling": "nearest (planned; coarse value kept coarse)", "status": "pending", "reason": reason})

    clear_fracs = [s["clear_fraction"] for s in scenes]
    manifest = {
        "window": [start.isoformat(), end.isoformat()], "dates": dates, "grid": grid.as_dict(), "aoi": AOI_ID,
        "layers": layers,
        "origin": {"*": "design", "layers": "sourced"},
    }
    prov = [record(f"prov-replay-stack-{start}-{end}", aoi=AOI_ID, time_range=(start.isoformat(), end.isoformat()),
                   processing=["index of the harmonized replay stack; grid is the ADR-002 30 m EPSG:32717 lattice clipped to the farm AOI"],
                   notes="Grid numbers are design constants; clear fractions come from the Sentinel-2 SCL (see each NDVI file's provenance).")]
    write_json(out / "stack.json", manifest, prov)
    return {"dir": out.relative_to(REPO_ROOT).as_posix(), "power_layers": len(columns), "ndvi_scenes": len(scenes), "ndvi_clear_fractions": clear_fracs}
