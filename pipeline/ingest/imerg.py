"""T-013: IMERG daily rain over the catchment, 2015-01-01 -> latest day, and the heaviest 72 h upstream events.

Products (config/datasets.yaml): Final daily GPM_3IMERGDF V07 up to its last day (2025-09-30, CMR), Late daily
GPM_3IMERGDL V07 afterwards; each day records which run it came from. Days are the products' own UTC days
(file S000000-E235959; ADR-002: a daily product used as published keeps its own day definition).
Access: NASA cloud OPeNDAP CSV subsets of `precipitation` (mm/day, dims time/lon/lat, fill -9999.9) over the
0.1 degree cells around the catchment; one cached raw subset per day.
Catchment mean = area-weighted mean of the 0.1 degree cells, weights = fraction of each cell inside the catchment
polygon (rasterised at 0.001 degree). A missing day stays missing; a 72 h window with a missing day is not ranked.
"""

from __future__ import annotations

import datetime as dt
import json
import math
from pathlib import Path

import numpy as np
from rasterio import features
from rasterio.transform import from_origin

from pipeline.common.grid import Grid, to_lonlat
from pipeline.common.io import write_csv, write_geotiff
from pipeline.common.provenance import REPO_ROOT, dataset_record, load_datasets, utc_now
from pipeline.ingest import opendap
from pipeline.ingest.cache import RAW_ROOT

FINAL_LAST_DAY = dt.date(2025, 9, 30)  # GPM_3IMERGDF V07 temporal extent end, CMR 2026-11-14
RUNS = {"final": ("imerg_final_daily", "GPM_3IMERGDF", "07"), "late": ("imerg_late_daily", "GPM_3IMERGDL", "07")}
OUT_DIR = REPO_ROOT / "pipeline" / "data" / "processed" / "rain"
CATCHMENT = REPO_ROOT / "pipeline" / "data" / "processed" / "aoi" / "catchment.geojson"
CATCHMENT_ID = "catchment_buenavista_pasaje"
VARIABLE = "precipitation"
FILL = -9999.9
STEP = 0.1
FINE = 0.001


def run_for(day: dt.date) -> str:
    return "final" if day <= FINAL_LAST_DAY else "late"


def cell_weights(geometry: dict, lons: np.ndarray, lats: np.ndarray, step: float = STEP, fine: float = FINE) -> np.ndarray:
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
    """Largest non-overlapping `window`-day totals (declustered: chosen windows share no day). n=0 -> all."""
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


def window_stats(dates: list[dt.date], daily: list[float], start: dt.date, end: dt.date, events: list[dict], window: int = 3) -> dict:
    """Wettest `window`-day total fully inside [start, end], its rank among all valid rolling windows (1 = wettest)
    and among the declustered events (None if that window is not itself a declustered event)."""
    totals = rolling_sum(daily, window)
    valid = sorted((v for v in totals if not np.isnan(v)), reverse=True)
    best_i, best_v = None, float("nan")
    for i, v in enumerate(totals):
        if np.isnan(v) or i + 1 < window:
            continue
        if dates[i + 1 - window] >= start and dates[i] <= end and (best_i is None or v > best_v):
            best_i, best_v = i, v
    if best_i is None:
        return {"range": [start.isoformat(), end.isoformat()], "max_72h_mm": None}
    w_start, w_end = dates[best_i + 1 - window].isoformat(), dates[best_i].isoformat()
    ev_rank = next((k + 1 for k, e in enumerate(events) if e["start"] == w_start), None)
    return {"range": [start.isoformat(), end.isoformat()], "window": [w_start, w_end], "max_72h_mm": round(best_v, 1),
            "rank_all_windows": 1 + sum(1 for v in valid if v > best_v), "n_windows": len(valid),
            "rank_declustered": ev_rank, "n_events": len(events)}


def index_window(bbox: tuple[float, float, float, float], margin: int = 1) -> tuple[int, int, int, int]:
    """IMERG V07 grid indices (i0, i1 lon; j0, j1 lat; inclusive) of the 0.1 degree cells touching bbox (+margin)."""
    i0 = math.floor((bbox[0] + 180) / STEP) - margin
    i1 = math.floor((bbox[2] + 180) / STEP) + margin
    j0 = math.floor((bbox[1] + 90) / STEP) - margin
    j1 = math.floor((bbox[3] + 90) / STEP) + margin
    return i0, i1, j0, j1


def expected_centres(win: tuple[int, int, int, int]) -> tuple[np.ndarray, np.ndarray]:
    i0, i1, j0, j1 = win
    return -179.95 + STEP * np.arange(i0, i1 + 1), -89.95 + STEP * np.arange(j0, j1 + 1)


def parse_subset(text: str, win) -> np.ndarray:
    """(lat, lon) array (lat ascending) of one day; checks the returned coordinates against the expected grid."""
    arrays = opendap.parse_dap_csv(text)
    lons, lats = arrays["/lon"], arrays["/lat"]
    exp_lon, exp_lat = expected_centres(win)
    if not (np.allclose(lons, exp_lon, atol=1e-4) and np.allclose(lats, exp_lat, atol=1e-4)):
        raise ValueError("IMERG subset coordinates differ from the expected 0.1 degree grid")
    data = arrays["/" + VARIABLE][0].T.copy()  # (lon, lat) -> (lat, lon)
    data[(data <= FILL + 0.01) | (data < 0)] = np.nan
    return data


def fetch_days(start: dt.date, end: dt.date, win) -> dict[dt.date, tuple[str, Path | None]]:
    from pipeline.ingest.smap import _session

    ea, _ = _session()
    i0, i1, j0, j1 = win
    ce = f"/lon[{i0}:{i1}];/lat[{j0}:{j1}];/{VARIABLE}[0:0][{i0}:{i1}][{j0}:{j1}]"
    datasets = load_datasets()
    granules: dict[dt.date, tuple[str, dict]] = {}
    for run, (key, short_name, version) in RUNS.items():
        a = start if run == "final" else max(start, FINAL_LAST_DAY + dt.timedelta(days=1))
        b = min(end, FINAL_LAST_DAY) if run == "final" else end
        if a > b:
            continue
        for g in opendap.list_granules(short_name, version, a, b):
            day = dt.date.fromisoformat(g["begin"][:10])
            if a <= day <= b and g["opendap"]:
                granules[day] = (run, g)
    jobs, keys = [], []
    for day, (run, g) in sorted(granules.items()):
        key, short_name, version = RUNS[run]
        path = RAW_ROOT / short_name.lower() / version / f"{day.isoformat()}_lon{i0}-{i1}_lat{j0}-{j1}.dap.csv.txt"
        prov = dataset_record(f"prov-{short_name.lower()}-{day.isoformat()}", key, aoi="imerg_window_" + CATCHMENT_ID,
                              time_range=(day.isoformat(), day.isoformat()), datasets=datasets,
                              processing=[f"OPeNDAP DAP4 CSV subset of {g['ur']}: {ce}"], notes="Raw values as published (mm/day).")
        jobs.append((g["opendap"], ce, path, prov))
        keys.append((day, run))
    paths = opendap.fetch_subsets(jobs, ea.get_requests_https_session)
    return {day: (run, p) for (day, run), p in zip(keys, paths)}


def run(start: dt.date, end: dt.date) -> dict:
    geometry = json.loads(CATCHMENT.read_text(encoding="utf-8"))["features"][0]["geometry"]
    ring = np.array(geometry["coordinates"][0])
    bbox = (ring[:, 0].min(), ring[:, 1].min(), ring[:, 0].max(), ring[:, 1].max())
    win = index_window(bbox)
    got = fetch_days(start, end, win)
    exp_lon, exp_lat = expected_centres(win)
    weights = cell_weights(geometry, exp_lon, exp_lat)
    dates, daily, runs = [], [], []
    day = start
    while day <= end:
        run_name, path = got.get(day, (run_for(day), None))
        value = float("nan")
        if path is not None:
            value = weighted_mean(parse_subset(path.read_text(encoding="utf-8"), win), weights)
        dates.append(day)
        daily.append(value)
        runs.append(run_name)
        day += dt.timedelta(days=1)
    # trailing days not yet published are not part of the record
    while dates and np.isnan(daily[-1]) and got.get(dates[-1], (None, None))[1] is None:
        dates.pop(), daily.pop(), runs.pop()
    return write_outputs(dates, daily, runs, win, weights)


def write_outputs(dates, daily, runs, win, weights) -> dict:
    datasets = load_datasets()
    tr = (dates[0].isoformat(), dates[-1].isoformat())
    switch = f"product switch: GPM_3IMERGDF V07 (Final) through {FINAL_LAST_DAY}, GPM_3IMERGDL V07 (Late) from {FINAL_LAST_DAY + dt.timedelta(days=1)}"
    method = [f"OPeNDAP subsets of `{VARIABLE}` (mm/day, UTC days), IMERG grid indices lon {win[0]}-{win[1]}, lat {win[2]}-{win[3]}",
              switch,
              "catchment mean = area-weighted mean of 0.1 degree cells (weights = fraction inside processed/aoi/catchment.geojson, rasterised at 0.001 degree; "
              f"{int((weights > 0).sum())} cells, total weight {weights.sum():.3f} cell-equivalents)",
              "a day with any missing weighted cell or no granule stays missing (empty cell)"]
    prov = [dataset_record(f"prov-imerg-catchment-daily-{name}", key, aoi=CATCHMENT_ID, time_range=tr, processing=method,
                           datasets=datasets, notes=f"Rows with imerg_run = {name}.") for name, (key, _, _) in RUNS.items() if name in set(runs)]
    write_csv(OUT_DIR / "imerg_catchment_daily.csv", ["date", "rain_catchment_mm", "imerg_run"],
              [[d.isoformat(), None if np.isnan(v) else round(v, 2), r] for d, v, r in zip(dates, daily, runs)], prov, origin="sourced")
    all_events = top_events(dates, daily, n=0)
    run_of = dict(zip(dates, runs))
    rows = []
    for k, e in enumerate(all_events[:15], start=1):
        s, t = dt.date.fromisoformat(e["start"]), dt.date.fromisoformat(e["end"])
        used = sorted({run_of[s + dt.timedelta(days=d)] for d in range((t - s).days + 1)})
        product = "+".join(RUNS[u][1] + " V07" for u in used)
        rows.append([k, e["start"], e["end"], e["rain_72h_mm"], product])
    write_csv(OUT_DIR / "top15_72h_events.csv", ["rank", "start", "end", "rain_72h_catchment_mm", "product"], rows,
              [*prov, {**prov[0], "id": "prov-imerg-top15-72h", "processing": method + [
                  "72 h total = sum of 3 consecutive daily catchment means; windows with a missing day are not ranked",
                  "declustered: windows sorted by total, a window is kept only if it shares no day with a kept window; top 15"],
                  "notes": "Top-15 heaviest 72 h upstream rain events over the record."}], origin="sourced")
    p007 = [window_stats(dates, daily, dt.date.fromisoformat(a), dt.date.fromisoformat(b), all_events)
            for a, b in (("2026-02-20", "2026-02-24"), ("2025-02-25", "2025-03-01"), ("2026-06-07", "2026-06-10"))]
    return {"days": len(dates), "missing_days": int(np.sum(np.isnan(daily))), "first": tr[0], "last": tr[1],
            "events": rows, "p007": p007, "n_events": len(all_events)}


def farm_layer(grid: Grid, dates: list[str], aoi: str, out_dir: Path) -> dict:
    """Daily IMERG precipitation on the 30 m farm grid (nearest: the 0.1 degree cell containing each 30 m cell)."""
    geometry = json.loads(CATCHMENT.read_text(encoding="utf-8"))["features"][0]["geometry"]
    ring = np.array(geometry["coordinates"][0])
    win = index_window((ring[:, 0].min(), ring[:, 1].min(), ring[:, 0].max(), ring[:, 1].max()))
    got = fetch_days(dt.date.fromisoformat(dates[0]), dt.date.fromisoformat(dates[-1]), win)
    cols, rows = np.meshgrid(np.arange(grid.width) + 0.5, np.arange(grid.height) + 0.5)
    lons, lats = to_lonlat(*(grid.transform * (cols, rows)))
    ci = np.floor((lons + 180) / STEP).astype(int) - win[0]
    ri = np.floor((lats + 90) / STEP).astype(int) - win[2]
    bands = np.full((len(dates), *grid.shape), np.nan, dtype="float32")
    runs, missing = set(), []
    for k, day in enumerate(dates):
        run_name, path = got.get(dt.date.fromisoformat(day), (None, None))
        if path is None:
            missing.append(day)
            continue
        runs.add(run_name)
        bands[k] = parse_subset(path.read_text(encoding="utf-8"), win)[ri, ci]
    key = RUNS[sorted(runs)[0]][0] if len(runs) == 1 else "imerg_late_daily"
    name = "imerg_precipitation_mm_30m.tif"
    write_geotiff(out_dir / name, bands, grid, dataset_record(
        f"prov-replay-imerg-{dates[0]}-{dates[-1]}", key, aoi=aoi, time_range=(dates[0], dates[-1]), accessed=utc_now(),
        processing=["OPeNDAP subsets of daily `precipitation` (mm/day, UTC days); runs used: " + ", ".join(RUNS[r][1] for r in sorted(runs)),
                    "placed on the 30 m farm grid by nearest: each 30 m cell takes the 0.1 degree cell containing it; coarse value kept coarse",
                    "one band per day; a day without a granule is a NaN band"],
        notes=f"Local (farm) daily rain. Missing days: {', '.join(missing) or 'none'}. Catchment-mean upstream rain: processed/rain/imerg_catchment_daily.csv."),
        band_names=dates)
    return {"file": name, "runs": sorted(runs), "missing": missing}
