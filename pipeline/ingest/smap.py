"""SMAP Enhanced L3 9 km soil moisture (SPL3SMP_E 006, NSIDC; key `smap`) for the farm AOI, via NASA cloud OPeNDAP.

Per day: one OPeNDAP CSV subset (a few 9 km EASE-Grid 2.0 cells around the AOI) of soil_moisture (AM, descending)
and soil_moisture_pm (PM), their retrieval_qual_flag, and the cell-centre latitude/longitude, read from the
granule (variable names, units cm3/cm3, fill -9999 and valid range 0.02-0.5 read from the granule DMR 2026-11-14).
Placed on the 30 m farm grid by nearest: each 30 m cell takes the 9 km cell whose bounds (halfway between published
cell centres) contain it. Fill, out-of-range and absent days stay NaN; nothing is filled or averaged across days.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path

import numpy as np

from pipeline.common.grid import Grid, to_lonlat
from pipeline.common.io import write_geotiff
from pipeline.common.provenance import dataset_record, utc_now, write_sidecar
from pipeline.ingest import opendap
from pipeline.ingest.cache import RAW_ROOT

SHORT_NAME, VERSION = "SPL3SMP_E", "006"
GROUP_AM, GROUP_PM = "/Soil_Moisture_Retrieval_Data_AM", "/Soil_Moisture_Retrieval_Data_PM"
FILL = -9999.0
VALID = (0.02, 0.5)
FLAG_FILL = 65534
RECOMMENDED_FLAGS = (0, 8)  # SPL3SMP_E User Guide p.13 as quoted by scientist-reviewer (2026-11-14-2252, M1)
VARS = {
    "soil_moisture_am": f"{GROUP_AM}/soil_moisture",
    "soil_moisture_pm": f"{GROUP_PM}/soil_moisture_pm",
    "retrieval_qual_flag_am": f"{GROUP_AM}/retrieval_qual_flag",
    "retrieval_qual_flag_pm": f"{GROUP_PM}/retrieval_qual_flag_pm",
    "lat": f"{GROUP_AM}/latitude",
    "lon": f"{GROUP_AM}/longitude",
}


parse_dap_csv = opendap.parse_dap_csv  # shared parser (2-D variables come back as (rows, cols))


def clean(sm: np.ndarray) -> np.ndarray:
    out = np.where(sm == FILL, np.nan, sm)
    return np.where((out < VALID[0]) | (out > VALID[1]), np.nan, out)


def edges_from_centres(centres: np.ndarray) -> np.ndarray:
    mids = (centres[1:] + centres[:-1]) / 2
    return np.concatenate([[centres[0] - (mids[0] - centres[0])], mids, [centres[-1] + (centres[-1] - mids[-1])]])


def nearest_index(grid: Grid, lat_centres: np.ndarray, lon_centres: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """(row, col) index into the subset for every 30 m cell centre; -1 when outside the subset."""
    cols, rows = np.meshgrid(np.arange(grid.width) + 0.5, np.arange(grid.height) + 0.5)
    xs, ys = grid.transform * (cols, rows)
    lons, lats = to_lonlat(xs, ys)
    lat_e, lon_e = edges_from_centres(lat_centres), edges_from_centres(lon_centres)
    # latitude decreases with row; digitize on the reversed edges
    ri = len(lat_centres) - np.digitize(lats, lat_e[::-1])
    ci = np.digitize(lons, lon_e) - 1
    ri = np.where((ri >= 0) & (ri < len(lat_centres)), ri, -1)
    ci = np.where((ci >= 0) & (ci < len(lon_centres)), ci, -1)
    return ri, ci


def _session():
    import earthaccess

    from pipeline.ingest.auth import login

    if login() is None:
        raise PermissionError("Earthdata login unavailable")
    return earthaccess, earthaccess.get_requests_https_session()


def fetch_day(day: dt.date, window: tuple[int, int, int, int], session=None, ea=None) -> Path | None:
    """Cached OPeNDAP CSV subset for `day` (rows r0..r1, cols c0..c1 inclusive), or None if no granule exists."""
    r0, r1, c0, c1 = window
    path = RAW_ROOT / SHORT_NAME.lower() / VERSION / f"{day.isoformat()}_r{r0}-{r1}_c{c0}-{c1}.dap.csv.txt"
    if path.is_file() and path.stat().st_size > 0:
        return path
    if session is None:
        ea, session = _session()
    granules = ea.search_data(short_name=SHORT_NAME, version=VERSION, temporal=(day.isoformat(), day.isoformat()))
    granules = [g for g in granules if f"_{day.strftime('%Y%m%d')}_" in g["umm"]["GranuleUR"]]
    if not granules:
        return None
    op = [u["URL"] for u in granules[0]["umm"]["RelatedUrls"] if "opendap.earthdata.nasa.gov" in u["URL"]][0]
    ce = ";".join(f"{v}[{r0}:{r1}][{c0}:{c1}]" for v in VARS.values())
    response = session.get(op + ".dap.csv", params={"dap4.ce": ce}, timeout=180)
    response.raise_for_status()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(response.text, encoding="utf-8")
    write_sidecar(path, dataset_record(
        f"prov-spl3smp-e-{day.isoformat()}", "smap", aoi="farm_aoi_smap_window", time_range=(day.isoformat(), day.isoformat()),
        processing=[f"OPeNDAP DAP4 CSV subset of granule {granules[0]['umm']['GranuleUR']}, EASE rows {r0}-{r1}, cols {c0}-{c1}",
                    "variables " + ", ".join(VARS.values())],
        notes=f"Raw values as published (fill {FILL:g}, flag fill {FLAG_FILL})."), origin="sourced")
    return path


SEARCH_BLOCK = (800, 920, 1000, 1150)  # EASE rows/cols probed for coordinates (western South America)


def axis_coords(lat2d: np.ndarray, lon2d: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per-row latitude and per-column longitude from 2-D coordinate arrays whose missing cells are -9999.

    EASE-Grid 2.0 global is cylindrical: latitude is constant along a row and longitude along a column.
    """
    lat = np.where(lat2d == FILL, np.nan, lat2d)
    lon = np.where(lon2d == FILL, np.nan, lon2d)
    with np.errstate(all="ignore"):
        return np.nanmax(lat, axis=1), np.nanmax(lon, axis=0)


def locate_window(box, session, ea, probe_day: dt.date) -> tuple[tuple[int, int, int, int], np.ndarray, np.ndarray]:
    """EASE (r0, r1, c0, c1) window of the cells within 0.1 degree of the box, plus their centre lat/lon vectors,
    read from the granule's own latitude/longitude arrays."""
    granules = ea.search_data(short_name=SHORT_NAME, version=VERSION, temporal=(probe_day.isoformat(), probe_day.isoformat()))
    op = [u["URL"] for u in granules[0]["umm"]["RelatedUrls"] if "opendap.earthdata.nasa.gov" in u["URL"]][0]
    r0, r1, c0, c1 = SEARCH_BLOCK
    text = session.get(op + ".dap.csv", params={"dap4.ce": f"{VARS['lat']}[{r0}:{r1}][{c0}:{c1}];{VARS['lon']}[{r0}:{r1}][{c0}:{c1}]"}, timeout=180).text
    arrays = parse_dap_csv(text)
    lat, lon = axis_coords(arrays[VARS["lat"]], arrays[VARS["lon"]])
    rows = np.where((lat <= box[3] + 0.1) & (lat >= box[1] - 0.1))[0]
    cols = np.where((lon >= box[0] - 0.1) & (lon <= box[2] + 0.1))[0]
    if not len(rows) or not len(cols):
        raise RuntimeError("AOI not inside the SMAP search block")
    window = (r0 + int(rows.min()), r0 + int(rows.max()), c0 + int(cols.min()), c0 + int(cols.max()))
    return window, lat[rows.min() : rows.max() + 1], lon[cols.min() : cols.max() + 1]


def replay_layers(box, grid: Grid, dates: list[str], aoi: str, out_dir: Path) -> dict:
    ea, session = _session()
    # The probe granule's lat/lon arrays are fill where it has no retrieval, so a day with no swath over the AOI cannot
    # locate it: try the window's days in order (the EASE grid is fixed; any covering granule gives the same cells).
    for probe in dates:
        try:
            window, lat_c, lon_c = locate_window(box, session, ea, dt.date.fromisoformat(probe))
            break
        except (RuntimeError, IndexError):
            continue
    else:
        raise RuntimeError("no SMAP granule in the window covers the AOI")
    ri, ci = nearest_index(grid, lat_c, lon_c)
    inside = (ri >= 0) & (ci >= 0)
    names = ["soil_moisture_am", "soil_moisture_pm", "retrieval_qual_flag_am", "retrieval_qual_flag_pm"]
    stacks = {n: np.full((len(dates), *grid.shape), np.nan, dtype="float32") for n in names}
    present: dict[str, list[str]] = {n: [] for n in names[:2]}
    granule_missing = []
    for i, day in enumerate(dates):
        path = fetch_day(dt.date.fromisoformat(day), window, session, ea)
        if path is None:
            granule_missing.append(day)
            continue
        arrays = parse_dap_csv(path.read_text(encoding="utf-8"))
        for n in names:
            raw = arrays[VARS[n]]
            vals = clean(raw) if n.startswith("soil") else np.where(raw == FLAG_FILL, np.nan, raw)
            layer = np.full(grid.shape, np.nan)
            layer[inside] = vals[ri[inside], ci[inside]]
            stacks[n][i] = layer
            if n in present and np.isfinite(layer).any():
                present[n].append(day)
    method = ["OPeNDAP CSV subsets of SPL3SMP_E 006 (one granule per day, UTC day of the file name)",
              "fill -9999 and values outside the valid range 0.02-0.5 cm3/cm3 -> missing; flag fill 65534 -> missing",
              "placed on the 30 m farm grid by nearest: each 30 m cell takes the 9 km EASE-Grid 2.0 cell containing it "
              "(cell bounds halfway between the granule's published cell centres, read once from a coordinate probe of "
              f"EASE rows/cols {SEARCH_BLOCK}); coarse value kept coarse",
              "AM and PM retrievals kept separate; no gap filling, no temporal compositing"]
    for n in names:
        write_geotiff(out_dir / f"smap_{n}_30m.tif", stacks[n], grid, dataset_record(
            f"prov-replay-smap-{n}-{dates[0]}-{dates[-1]}", "smap", aoi=aoi, time_range=(dates[0], dates[-1]),
            processing=method, accessed=utc_now(),
            notes=("Volumetric soil moisture, cm3/cm3, ALL quality levels: includes retrievals NOT recommended by the product "
                   "(retrieval_qual_flag other than 0 or 8). Do not use for alerts without the recommended-only layer." if n.startswith("soil")
                   else "retrieval_qual_flag as published.")
            + f" Missing granule days: {', '.join(granule_missing) or 'none'}."), band_names=dates)
    # Recommended-quality only (science review M1): keep a value only where its retrieval_qual_flag is 0 or 8.
    recommended: dict[str, list[str]] = {}
    for half in ("am", "pm"):
        sm, flag = stacks[f"soil_moisture_{half}"], stacks[f"retrieval_qual_flag_{half}"]
        rec = np.where(np.isin(flag, RECOMMENDED_FLAGS), sm, np.nan).astype("float32")
        recommended[f"soil_moisture_{half}_recommended"] = [d for k, d in enumerate(dates) if np.isfinite(rec[k]).any()]
        write_geotiff(out_dir / f"smap_soil_moisture_{half}_recommended_30m.tif", rec, grid, dataset_record(
            f"prov-replay-smap-soil-moisture-{half}-recommended-{dates[0]}-{dates[-1]}", "smap", aoi=aoi, time_range=(dates[0], dates[-1]),
            processing=method + [f"kept only where retrieval_qual_flag is in {RECOMMENDED_FLAGS} (recommended quality); every other value -> missing"],
            accessed=utc_now(),
            notes="Volumetric soil moisture, cm3/cm3, recommended-quality retrievals only. Flag rule (0 or 8 = high quality) as quoted from the "
                  "SPL3SMP_E User Guide p.13 in docs/reports/science/2026-11-14-2252.md (M1)."), band_names=dates)
    flags_seen = sorted({int(v) for n in ("retrieval_qual_flag_am", "retrieval_qual_flag_pm") for v in np.unique(stacks[n][np.isfinite(stacks[n])])})
    return {"window": window, "cells_used": sorted({(int(r), int(c)) for r, c in zip(ri[inside], ci[inside])}),
            "granule_missing": granule_missing,
            "days_with_value": {k: len(v) for k, v in present.items()}, "dates_with_value": present,
            "recommended_dates": recommended, "flags_seen": flags_seen}
