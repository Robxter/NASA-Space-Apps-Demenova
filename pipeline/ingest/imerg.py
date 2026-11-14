"""T-013: IMERG daily rain over the catchment, 2015-01-01 -> today, and the heaviest 72 h upstream events.

Products (config/datasets.yaml): Final daily GPM_3IMERGDF V07 up to its last day (2025-09-30, CMR), Late daily
GPM_3IMERGDL V07 afterwards; each day records which run it came from. Days are the products' own (UTC) days
(ADR-002: a daily product used as published keeps its own day definition).
Catchment mean = area-weighted mean of the 0.1 degree cells, weights = fraction of each cell inside the catchment
polygon (rasterised at 0.001 degree). A missing day stays missing; a 72 h window with a missing day is not ranked.
Needs Earthdata login (pipeline/ingest/auth.py).
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio import features
from rasterio.transform import from_origin

from pipeline.common.io import write_csv, write_json
from pipeline.common.provenance import REPO_ROOT, dataset_record, load_datasets, utc_now, write_sidecar
from pipeline.ingest.cache import RAW_ROOT

FINAL_LAST_DAY = dt.date(2025, 9, 30)  # GPM_3IMERGDF V07 temporal extent end, CMR 2026-11-14
RUNS = {"final": ("imerg_final_daily", "GPM_3IMERGDF", "07"), "late": ("imerg_late_daily", "GPM_3IMERGDL", "07")}
OUT_DIR = REPO_ROOT / "pipeline" / "data" / "processed" / "rain"
CATCHMENT = REPO_ROOT / "pipeline" / "data" / "processed" / "aoi" / "catchment.geojson"
VARIABLE = "precipitation"
FINE = 0.001


def run_for(day: dt.date) -> str:
    return "final" if day <= FINAL_LAST_DAY else "late"


def cell_weights(geometry: dict, lons: np.ndarray, lats: np.ndarray, step: float = 0.1, fine: float = FINE) -> np.ndarray:
    """Fraction of each (lat, lon) cell of a regular grid (cell centres `lats`, `lons`) covered by `geometry`."""
    sub = int(round(step / fine))
    west, north = float(lons.min()) - step / 2, float(lats.max()) + step / 2
    shape = (len(lats) * sub, len(lons) * sub)
    mask = features.rasterize([(geometry, 1)], out_shape=shape, transform=from_origin(west, north, fine, fine), fill=0, dtype="uint8")
    frac = mask.reshape(len(lats), sub, len(lons), sub).mean(axis=(1, 3))
    if lats[0] < lats[-1]:  # grid given south-to-north: flip to match
        frac = frac[::-1]
    return frac


def weighted_mean(values: np.ndarray, weights: np.ndarray) -> float:
    """Area-weighted mean; NaN if any weighted cell is missing (missing stays missing)."""
    used = weights > 0
    if not used.any() or np.isnan(values[used]).any():
        return float("nan")
    return float(np.sum(values[used] * weights[used]) / np.sum(weights[used]))


def rolling_sum(series: list[float], window: int = 3) -> list[float]:
    out = []
    for i in range(len(series)):
        if i + 1 < window:
            out.append(float("nan"))
            continue
        chunk = series[i + 1 - window : i + 1]
        out.append(float("nan") if any(np.isnan(chunk)) else float(sum(chunk)))
    return out


def top_events(dates: list[dt.date], daily: list[float], n: int = 15, window: int = 3) -> list[dict]:
    """Largest non-overlapping `window`-day totals (declustered: chosen windows share no day)."""
    totals = rolling_sum(daily, window)
    order = sorted((i for i, v in enumerate(totals) if not np.isnan(v)), key=lambda i: -totals[i])
    used: set[int] = set()
    events = []
    for i in order:
        days = set(range(i + 1 - window, i + 1))
        if days & used:
            continue
        used |= days
        events.append({"start": dates[i + 1 - window].isoformat(), "end": dates[i].isoformat(), "rain_72h_mm": round(totals[i], 1)})
        if len(events) == n:
            break
    return events


def _search_download(day: dt.date, bbox: tuple[float, float, float, float]) -> Path | None:
    import earthaccess

    key, short_name, version = RUNS[run_for(day)]
    dest_dir = RAW_ROOT / short_name.lower() / version / day.isoformat()
    cached = sorted(p for p in dest_dir.glob("*") if not p.name.endswith(".provenance.json")) if dest_dir.exists() else []
    if cached:
        return cached[0]
    results = earthaccess.search_data(short_name=short_name, version=version, temporal=(day.isoformat(), day.isoformat()), bounding_box=bbox)
    results = [g for g in results if day.strftime("%Y%m%d") in json.dumps(g.data_links())]
    if not results:
        return None
    dest_dir.mkdir(parents=True, exist_ok=True)
    files = earthaccess.download(results[:1], local_path=str(dest_dir))
    path = Path(files[0])
    write_sidecar(path, dataset_record(f"prov-{short_name.lower()}-{day.isoformat()}", key, aoi=None, time_range=(day.isoformat(), day.isoformat()),
                                       processing=["downloaded unchanged with earthaccess"], notes="Raw global daily file."), origin="sourced")
    return path


def read_daily(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return (precip mm/day as (lat, lon), lons, lats) from an IMERG daily netCDF via GDAL."""
    with rasterio.open(f'netcdf:"{path}":{VARIABLE}') as src:
        data = src.read(1).astype("float64")
        nodata = src.nodata
        t = src.transform
        h, w = src.height, src.width
    if nodata is not None:
        data[data == nodata] = np.nan
    data[data < 0] = np.nan
    lons = t.c + t.a * (np.arange(w) + 0.5)
    lats = t.f + t.e * (np.arange(h) + 0.5)
    return data, lons, lats


def run(start: dt.date, end: dt.date) -> dict:
    from pipeline.ingest.auth import login

    if login() is None:
        raise PermissionError("Earthdata login unavailable: EARTHDATA_USERNAME / EARTHDATA_PASSWORD not set (PENDING.md)")
    geometry = json.loads(CATCHMENT.read_text(encoding="utf-8"))["features"][0]["geometry"]
    ring = np.array(geometry["coordinates"][0])
    bbox = (ring[:, 0].min(), ring[:, 1].min(), ring[:, 0].max(), ring[:, 1].max())
    dates, daily, runs = [], [], []
    weights = None
    day = start
    while day <= end:
        path = _search_download(day, bbox)
        value = float("nan")
        if path is not None:
            data, lons, lats = read_daily(path)
            sel_lon = (lons >= bbox[0] - 0.1) & (lons <= bbox[2] + 0.1)
            sel_lat = (lats >= bbox[1] - 0.1) & (lats <= bbox[3] + 0.1)
            sub = data[np.ix_(sel_lat, sel_lon)]
            if weights is None:
                weights = cell_weights(geometry, lons[sel_lon], lats[sel_lat])
            value = weighted_mean(sub, weights)
        dates.append(day)
        daily.append(value)
        runs.append(run_for(day))
        day += dt.timedelta(days=1)
    return write_outputs(dates, daily, runs, start, end)


def write_outputs(dates, daily, runs, start, end) -> dict:
    datasets = load_datasets()
    tr = (start.isoformat(), end.isoformat())
    method = ["catchment mean = area-weighted mean of 0.1 degree cells (weights = fraction inside catchment.geojson, rasterised at 0.001 degree)",
              "missing day stays missing (empty cell)"]
    prov = [dataset_record(f"prov-imerg-catchment-daily-{name}", key, aoi="catchment_buenavista_pasaje", time_range=tr, processing=method,
                           datasets=datasets, notes=f"Days from the {name} run.") for name, (key, _, _) in RUNS.items() if name in set(runs)]
    write_csv(OUT_DIR / "imerg_catchment_daily.csv", ["date", "rain_catchment_mm", "imerg_run"],
              [[d.isoformat(), None if np.isnan(v) else round(v, 2), r] for d, v, r in zip(dates, daily, runs)], prov, origin="sourced")
    events = top_events(dates, daily)
    write_json(OUT_DIR / "top15_72h_events.json", {"events": events, "origin": "sourced",
               "method": "non-overlapping 3-day totals of the catchment-mean daily IMERG rain, largest first"}, prov)
    return {"days": len(dates), "missing": int(np.sum(np.isnan(daily))), "events": events}
