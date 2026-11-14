"""NASA POWER daily and hourly point data for the farm AOI (no login; dataset key `power`).

The farm AOI is queried at its centre and four corners; if all five return identical series, the AOI lies in one
POWER source cell and the centre series represents the whole AOI (checked, not assumed). Fill value -999 -> missing.
"""

from __future__ import annotations

import json
from pathlib import Path

import httpx

from pipeline.common.io import write_csv
from pipeline.common.provenance import REPO_ROOT, dataset_record, utc_now, write_sidecar
from pipeline.ingest.cache import RAW_ROOT, USER_AGENT

DAILY_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
HOURLY_URL = "https://power.larc.nasa.gov/api/temporal/hourly/point"
DAILY_PARAMS = ["T2M", "T2M_MAX", "T2M_MIN", "RH2M", "PRECTOTCORR", "WS2M", "ALLSKY_SFC_SW_DWN"]
HOURLY_PARAMS = ["T2M", "RH2M", "PRECTOTCORR", "WS2M", "ALLSKY_SFC_SW_DWN"]
OUT_DIR = REPO_ROOT / "pipeline" / "data" / "processed" / "weather"
UNIT_SUFFIX = {"C": "c", "%": "pct", "mm/day": "mm", "mm/hour": "mm", "m/s": "ms", "MJ/m^2/day": "mj_m2", "MJ/hr": "mj_m2", "Wh/m^2": "wh_m2", "W/m^2": "w_m2"}


def fetch(url: str, lon: float, lat: float, start: str, end: str, params: list[str], extra: dict | None = None) -> dict:
    """GET the POWER point API, cached as raw JSON (raw/nasa_power/<api>/<lon>_<lat>_<start>_<end>.json)."""
    kind = "hourly" if "hourly" in url else "daily"
    cache = RAW_ROOT / "nasa_power" / kind / f"{lon:.4f}_{lat:.4f}_{start}_{end}_{'-'.join(params)}.json"
    if cache.is_file() and cache.stat().st_size > 0:
        return json.loads(cache.read_text(encoding="utf-8"))
    query = {"parameters": ",".join(params), "community": "AG", "longitude": lon, "latitude": lat,
             "start": start.replace("-", ""), "end": end.replace("-", ""), "format": "JSON", **(extra or {})}
    response = httpx.get(url, params=query, timeout=300, headers={"User-Agent": USER_AGENT})
    response.raise_for_status()
    data = response.json()
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(data), encoding="utf-8")
    write_sidecar(cache, dataset_record(f"prov-power-raw-{kind}-{start}-{end}", "power", aoi=None, time_range=(start, end),
                                        processing=[f"GET {url} community AG, point ({lon}, {lat})"],
                                        notes=f"Raw API response, API {data.get('header', {}).get('api', {}).get('version')}, sources {data.get('header', {}).get('sources')}."),
                  origin="sourced")
    return data


def same_cell(box: tuple[float, float, float, float], start: str, end: str) -> bool:
    x0, y0, x1, y1 = box
    points = [((x0 + x1) / 2, (y0 + y1) / 2), (x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    series = [fetch(DAILY_URL, lon, lat, start, end, ["T2M", "PRECTOTCORR"])["properties"]["parameter"] for lon, lat in points]
    return all(s == series[0] for s in series[1:])


def to_rows(data: dict, params: list[str]) -> tuple[list[str], list[list], dict]:
    fill = data["header"].get("fill_value", -999.0)
    meta = data["parameters"]
    columns = [f"{p.lower()}_{UNIT_SUFFIX.get(meta[p]['units'], 'value')}" for p in params]
    stamps = sorted(data["properties"]["parameter"][params[0]].keys())
    rows = []
    for stamp in stamps:
        when = f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}" + (f"T{stamp[8:10]}:00" if len(stamp) == 10 else "")
        values = []
        for p in params:
            v = data["properties"]["parameter"][p].get(stamp)
            values.append(None if v is None or v == fill else v)
        rows.append([when, *values])
    return columns, rows, meta


def run(box, start: str, end: str, aoi: str, hourly_start: str | None = None, hourly_end: str | None = None) -> dict:
    lon, lat = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    one_cell = same_cell(box, start, end)
    if not one_cell:
        raise RuntimeError("the AOI spans more than one POWER cell: per-cell handling needed")
    data = fetch(DAILY_URL, round(lon, 4), round(lat, 4), start, end, DAILY_PARAMS)
    columns, rows, meta = to_rows(data, DAILY_PARAMS)
    header = data["header"]
    common = [f"POWER API {header['api']['version']} (sources {', '.join(header['sources'])}), community AG, point ({lon:.4f}, {lat:.4f})",
              "AOI centre and 4 corners returned identical series: one POWER cell covers the AOI",
              f"fill value {header.get('fill_value')} -> missing (empty cell); units in column suffix, as published"]
    units = "; ".join(f"{c}: {p} [{meta[p]['units']}] {meta[p]['longname']}" for c, p in zip(columns, DAILY_PARAMS))
    write_csv(OUT_DIR / "power_daily_farm.csv", ["date", *columns], rows,
              dataset_record("prov-power-daily-farm", "power", aoi=aoi, time_range=(start, end), processing=common,
                             notes=f"time_standard {header.get('time_standard')}. Columns: {units}. RH stays in % as published (convert to 0..1 in the engine)."),
              origin="sourced")
    result = {"daily_rows": len(rows), "daily_missing_cells": sum(v is None for r in rows for v in r[1:])}
    if hourly_start and hourly_end:
        hdata = fetch(HOURLY_URL, round(lon, 4), round(lat, 4), hourly_start, hourly_end, HOURLY_PARAMS, {"time-standard": "UTC"})
        hcols, hrows, hmeta = to_rows(hdata, HOURLY_PARAMS)
        hunits = "; ".join(f"{c}: {p} [{hmeta[p]['units']}]" for c, p in zip(hcols, HOURLY_PARAMS))
        write_csv(OUT_DIR / f"power_hourly_farm_{hourly_start}_{hourly_end}.csv", ["time_utc", *hcols], hrows,
                  dataset_record(f"prov-power-hourly-farm-{hourly_start}-{hourly_end}", "power", aoi=aoi, time_range=(hourly_start, hourly_end),
                                 processing=[f"POWER hourly API {hdata['header']['api']['version']}, time-standard UTC, point ({lon:.4f}, {lat:.4f})", common[2]],
                                 notes=f"time_standard {hdata['header'].get('time_standard')}. Columns: {hunits}."),
                  origin="sourced")
        result["hourly_rows"] = len(hrows)
    return result
