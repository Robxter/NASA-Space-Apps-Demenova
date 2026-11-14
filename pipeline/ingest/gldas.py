"""GLDAS-2.1 Noah 3-hourly 0.25 degree soil moisture (GLDAS_NOAH025_3H 2.1, GES DISC; key `gldas`) for the farm AOI.

Variables read from the granule DMR (2026-11-14): SoilMoi0_10cm_inst, SoilMoi10_40cm_inst, SoilMoi40_100cm_inst,
RootMoist_inst; units kg m-2, fill -9999, dims (time, lat, lon); grid centres lon -179.875 + 0.25 i, lat -59.875 + 0.25 j.
Daily value = mean of the 8 three-hourly instants of the UTC day, only when all 8 exist (else missing).
Placed on the 30 m farm grid by nearest (each 30 m cell takes the 0.25 degree cell containing it).
"""

from __future__ import annotations

import datetime as dt
import math
from pathlib import Path

import numpy as np

from pipeline.common.grid import Grid, to_lonlat
from pipeline.common.io import write_geotiff
from pipeline.common.provenance import dataset_record, load_datasets, utc_now
from pipeline.ingest import opendap
from pipeline.ingest.cache import RAW_ROOT

SHORT_NAME, VERSION = "GLDAS_NOAH025_3H", "2.1"
VARIABLES = ["SoilMoi0_10cm_inst", "SoilMoi10_40cm_inst", "SoilMoi40_100cm_inst", "RootMoist_inst"]
FILL = -9999.0
STEP = 0.25


def index_window(box, margin: int = 1) -> tuple[int, int, int, int]:
    """(i0, i1 lon; j0, j1 lat) inclusive indices of the 0.25 degree cells touching box (+margin)."""
    return (math.floor((box[0] + 180) / STEP) - margin, math.floor((box[2] + 180) / STEP) + margin,
            math.floor((box[1] + 60) / STEP) - margin, math.floor((box[3] + 60) / STEP) + margin)


def daily_mean(instants: list[np.ndarray | None]) -> np.ndarray | None:
    """Mean of the day's 8 instants; None unless all 8 are present. Cells missing in any instant stay NaN."""
    if len(instants) != 8 or any(x is None for x in instants):
        return None
    return np.mean(np.stack(instants), axis=0)  # NaN propagates


def replay_layers(box, grid: Grid, dates: list[str], aoi: str, out_dir: Path) -> dict:
    from pipeline.ingest.smap import _session

    ea, _ = _session()
    i0, i1, j0, j1 = index_window(box)
    ce = f"/lon[{i0}:{i1}];/lat[{j0}:{j1}];" + ";".join(f"/{v}[0:0][{j0}:{j1}][{i0}:{i1}]" for v in VARIABLES)
    start, end = dt.date.fromisoformat(dates[0]), dt.date.fromisoformat(dates[-1])
    granules = [g for g in opendap.list_granules(SHORT_NAME, VERSION, start, end) if g["opendap"]]
    datasets = load_datasets()
    jobs = []
    for g in granules:
        stamp = g["begin"][:13].replace(":", "")
        path = RAW_ROOT / SHORT_NAME.lower() / VERSION / f"{stamp}_lon{i0}-{i1}_lat{j0}-{j1}.dap.csv.txt"
        prov = dataset_record(f"prov-gldas-noah025-3h-{stamp.lower()}", "gldas", aoi="farm_aoi_gldas_window", datasets=datasets,
                              time_range=(g["begin"][:10], g["begin"][:10]),
                              processing=[f"OPeNDAP DAP4 CSV subset of {g['ur']}: {ce}"], notes="Raw values as published (kg m-2).")
        jobs.append((g["opendap"], ce, path, prov))
    paths = opendap.fetch_subsets(jobs, ea.get_requests_https_session)
    by_day: dict[str, list] = {}
    exp_lon = -179.875 + STEP * np.arange(i0, i1 + 1)
    exp_lat = -59.875 + STEP * np.arange(j0, j1 + 1)
    for g, p in zip(granules, paths):
        arrays = opendap.parse_dap_csv(p.read_text(encoding="utf-8")) if p else None
        if arrays is not None and not (np.allclose(arrays["/lon"], exp_lon, atol=1e-4) and np.allclose(arrays["/lat"], exp_lat, atol=1e-4)):
            raise ValueError("GLDAS subset coordinates differ from the expected 0.25 degree grid")
        fields = None
        if arrays is not None:
            fields = {v: np.where(arrays["/" + v][0] == FILL, np.nan, arrays["/" + v][0]) for v in VARIABLES}  # (lat, lon)
        by_day.setdefault(g["begin"][:10], []).append(fields)
    cols, rows = np.meshgrid(np.arange(grid.width) + 0.5, np.arange(grid.height) + 0.5)
    lons, lats = to_lonlat(*(grid.transform * (cols, rows)))
    ci = np.floor((lons + 180) / STEP).astype(int) - i0
    ri = np.floor((lats + 60) / STEP).astype(int) - j0
    incomplete = [d for d in dates if len(by_day.get(d, [])) != 8 or any(f is None for f in by_day.get(d, []))]
    result = {"granules": len(granules), "incomplete_days": incomplete, "files": []}
    for v in VARIABLES:
        bands = np.full((len(dates), *grid.shape), np.nan, dtype="float32")
        for k, day in enumerate(dates):
            mean = daily_mean([f[v] if f else None for f in by_day.get(day, [])])
            if mean is not None:
                bands[k] = mean[ri, ci]
        name = f"gldas_{v.lower()}_kg_m2_30m.tif"
        write_geotiff(out_dir / name, bands, grid, dataset_record(
            f"prov-replay-gldas-{v.lower()}-{dates[0]}-{dates[-1]}", "gldas", aoi=aoi, time_range=(dates[0], dates[-1]), accessed=utc_now(),
            processing=[f"OPeNDAP subsets of {v} (kg m-2) from {len(granules)} three-hourly granules",
                        "daily value = mean of the 8 three-hourly instants of the UTC day; missing unless all 8 exist",
                        "placed on the 30 m farm grid by nearest: each 30 m cell takes the 0.25 degree cell containing it; coarse value kept coarse"],
            notes=f"GLDAS-2.1 Noah model output (modelled, not observed). Incomplete days (NaN): {', '.join(incomplete) or 'none'}."),
            band_names=dates)
        result["files"].append(name)
    return result
