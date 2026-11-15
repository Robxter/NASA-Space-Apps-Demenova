"""T-024 engine run for the demo farm: features, W, states, verification, sensitivity, app snapshots.
Owner: data-scientist. Run from the repository root:

    uv run python -m pipeline.engine kirpich      # Kirpich inputs from the git-ignored SRTM DEMs (T-021)
    uv run python -m pipeline.engine farm-rain    # farm-cell IMERG Early daily history from the raw IMERG cache
    uv run python -m pipeline.engine replay       # features + states + snapshots in app/public/data/demo/

`replay` reads committed files only (pipeline/data/processed/** and config/alerts.yaml), so the snapshots are
reproducible from the repository. Every number written carries an origin; every file carries provenance.

Units: 8 synthetic demo lots (data level 2, the alert units) and 3 automatic TWI zones (data level 1 view of the same
farm). The demo farm has no outline; its extent is the union of its lots, so the zones are TWI terciles of the lot
cells (synthetic extent, sourced TWI).
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import rasterio

from pipeline.common.grid import Grid, to_lonlat, to_utm
from pipeline.common.io import write_csv, write_json
from pipeline.common.models import CONTRACT_VERSION
from pipeline.common.provenance import REPO_ROOT, dataset_record, git_commit, record, utc_now
from pipeline.engine import config as cfgmod
from pipeline.engine import hydrology as hy
from pipeline.engine import side as sd
from pipeline.engine import state as st
from pipeline.engine import terrain as tr
from pipeline.engine.index import FACTORS, alert_index, confidence_for_data_level, factor_shares, percentile_against_history, top_factors
from pipeline.engine.sensitivity import compare, severe_days, variants
from pipeline.engine.verification import Flood, scores, verify

AGENT = "data-scientist"
REPLAY = (dt.date(2026, 2, 15), dt.date(2026, 3, 5))
FARM_ID = "farm_demo-el-oro"
FARM_SLUG = "demo-el-oro"
AOI_ID = "aoi_pasaje_buenavista"
CATCHMENT_ID = "catchment_buenavista_pasaje"
PROCESSED = REPO_ROOT / "pipeline" / "data" / "processed"
ENGINE_DATA = PROCESSED / "engine"
STACK = PROCESSED / "replay" / "2026-02-15_2026-03-05"
DEMO = REPO_ROOT / "app" / "public" / "data" / "demo"
FARM_RAIN_CSV = ENGINE_DATA / "imerg_farm_cell_daily.csv"
HISTORY_DAYS = 90
LOT_DATA_LEVEL = 2
ZONE_DATA_LEVEL = 1
SENSITIVITY_DELTA = 0.10

# Press-documented floods used for calibration and verification (D-024), opened by data-scientist. Local dates.
DOCUMENTED_FLOODS = (
    Flood("flood-2026-02-22-buenavista-pasaje", dt.date(2026, 2, 22), dt.date(2026, 2, 23),
          description=("Rio Buenavista overflowed at the Buenavista-Pasaje road (Pasaje) after rain from Sunday night 22 Feb "
                       "to the early hours of Monday 23 Feb 2026; water entered banana areas. Same night the Machala-Santa Rosa "
                       "road was closed by an overflowing river. In the demo farm's catchment."),
          sources=({"citation": "El Universo, 23 Feb 2026, 'Inundaciones en Machala y desbordamientos de rios paralizan parte de El Oro este 23 de febrero'",
                    "url": "https://www.eluniverso.com/noticias/ecuador/inundaciones-en-machala-y-desbordamientos-de-rios-paralizan-parte-de-el-oro-el-23-de-febrero-nota/",
                    "accessed": "2026-11-14"},)),
    Flood("flood-2026-10-11-santa-rosa", dt.date(2026, 10, 11), dt.date(2026, 10, 12),
          description=("SNGR report (cut-off Monday 12 Oct 2026, 07:00): Rio Chico (El Recreo, Bellamaria, Santa Rosa) and Rio "
                       "Caluguro (Caluguro, Santa Rosa) overflowed. Outside the demo farm's catchment (regional event)."),
          sources=({"citation": "Teleamazonas, 12 Oct 2026, 'Seis rios y esteros desbordados en tres provincias' (SNGR table)",
                    "url": "https://www.teleamazonas.com/actualidad/noticias/ecuador/seis-rios-esteros-desbordados-tres-provincias-lunes-12-octubre-130196/",
                    "accessed": "2026-11-15"},)),
    Flood("flood-2026-10-19-chaguana", dt.date(2026, 10, 19), dt.date(2026, 10, 19),
          description="Rio Chaguana overflow on Monday 19 Oct 2026 (Tendales, El Guabo). Outside the demo farm's catchment (regional event).",
          sources=({"citation": "Extra, 26 Oct 2026, 'El Oro: Tendales se inunda por segunda vez tras el desbordamiento del rio Chaguana'",
                    "url": "https://www.extra.ec/noticia/ecuador/oro-tendales-inunda-segunda-vez-desbordamiento-rio-chaguana-166024.html",
                    "accessed": "2026-11-15"},)),
    Flood("flood-2026-10-26-chaguana", dt.date(2026, 10, 26), dt.date(2026, 10, 26),
          description=("Second Rio Chaguana overflow from about 02:00 local on Monday 26 Oct 2026 (Tendales, El Guabo). FIX2 lists "
                       "24 Oct; the opened source gives Monday 26 Oct. Outside the demo farm's catchment (regional event)."),
          sources=({"citation": "Extra, 26 Oct 2026, 'El Oro: Tendales se inunda por segunda vez tras el desbordamiento del rio Chaguana'",
                    "url": "https://www.extra.ec/noticia/ecuador/oro-tendales-inunda-segunda-vez-desbordamiento-rio-chaguana-166024.html",
                    "accessed": "2026-11-15"},)),
)
VERIFICATION_PERIOD = (dt.date(2026, 1, 1), None)  # to the last day with data


def _mine(rec: dict) -> dict:
    rec = dict(rec)
    rec["agent"] = AGENT
    return rec


def _read_sidecar(path: Path) -> list[dict]:
    block = json.loads((path.parent / (path.name + ".provenance.json")).read_text(encoding="utf-8"))["provenance"]
    return block if isinstance(block, list) else [block]


def _read_embedded(path: Path) -> list[dict]:
    block = json.loads(path.read_text(encoding="utf-8"))["provenance"]
    return block if isinstance(block, list) else [block]


def contract_lot_id(ingest_id: str) -> str:
    """demo_lots.geojson writes lot_demo_el_oro_N; the contract id is lot_<farm slug>_<n> with slug demo-el-oro."""
    m = re.fullmatch(r"lot_demo_el_oro_(\d+)", ingest_id) or re.fullmatch(rf"lot_{FARM_SLUG}_(\d+)", ingest_id)
    if not m:
        raise ValueError(f"unexpected demo lot id {ingest_id}")
    return f"lot_{FARM_SLUG}_{m.group(1)}"


# --------------------------------------------------------------------------------------------------------
# farm-rain: the 0.1 degree IMERG cell over the lots, from the raw cache written by pipeline/ingest/imerg.py
# --------------------------------------------------------------------------------------------------------


def build_farm_rain() -> dict:
    from pipeline.ingest import imerg
    from pipeline.ingest.cache import RAW_ROOT

    lots = json.loads((PROCESSED / "aoi" / "demo_lots.geojson").read_text(encoding="utf-8"))["features"]
    pts = np.array([np.mean(np.array(f["geometry"]["coordinates"][0][:-1]), axis=0) for f in lots])
    cells = {(int(np.floor((lon + 180) / imerg.STEP)), int(np.floor((lat + 90) / imerg.STEP))) for lon, lat in pts}
    if len(cells) != 1:
        raise RuntimeError(f"the demo lots span {len(cells)} IMERG cells; the engine expects one")
    ci, cj = cells.pop()
    catch = pd.read_csv(PROCESSED / "rain" / "imerg_catchment_daily.csv")
    feature = json.loads(imerg.CATCHMENT.read_text(encoding="utf-8"))["features"][0]
    ring = np.array(feature["geometry"]["coordinates"][0])
    win = imerg.index_window((ring[:, 0].min(), ring[:, 1].min(), ring[:, 0].max(), ring[:, 1].max()))
    folder = RAW_ROOT / "gpm_3imergde" / "07"
    rows = []
    for day, suffix in zip(catch["date"], catch["granule_version"]):
        path = folder / f"{day}_lon{win[0]}-{win[1]}_lat{win[2]}-{win[3]}.dap.csv.txt"
        value = None
        if path.is_file():
            grid = imerg.parse_subset(path.read_text(encoding="utf-8"), win)
            v = grid[cj - win[2], ci - win[0]]
            value = None if not np.isfinite(v) else round(float(v), 2)
        rows.append([day, value, suffix])
    lon_c, lat_c = -179.95 + 0.1 * ci, -89.95 + 0.1 * cj
    prov = _mine(dataset_record(
        f"prov-imerg-early-farm-cell-daily-{rows[0][0]}-{rows[-1][0]}", "imerg_early_daily", aoi=AOI_ID,
        time_range=(rows[0][0], rows[-1][0]),
        processing=[f"cached OPeNDAP subsets of `precipitation` (mm/day, UTC days) from GPM_3IMERGDE V07 written by pipeline/ingest/imerg.py (window lon {win[0]}-{win[1]}, lat {win[2]}-{win[3]})",
                    f"value of the single 0.1 degree cell containing all 8 demo lots: grid index lon {ci}, lat {cj} (centre {lon_c:.2f}, {lat_c:.2f})",
                    "granule version per day copied from processed/rain/imerg_catchment_daily.csv; a day without a cached subset stays empty"],
        notes="Local (farm) daily rain history for the engine's percentiles; same product and days as the catchment series."))
    write_csv(FARM_RAIN_CSV, ["date", "rain_farm_cell_mm", "granule_version"], rows, prov, origin="sourced")
    return {"file": str(FARM_RAIN_CSV.relative_to(REPO_ROOT)), "days": len(rows), "missing": sum(r[1] is None for r in rows), "cell": [ci, cj]}


# --------------------------------------------------------------------------------------------------------
# Inputs and terrain units
# --------------------------------------------------------------------------------------------------------


@dataclass
class Unit:
    id: str
    kind: str  # "lot" | "zone"
    name: str
    mask: np.ndarray
    geometry: dict  # EPSG:4326 GeoJSON geometry
    twi_mean: float | None = None
    twi_max: float | None = None
    twi_min: float | None = None
    n_cells: int = 0
    n_undefined: int = 0
    rank: float | None = None
    tercile: str | None = None
    ndvi: dict[dt.date, float | None] = field(default_factory=dict)
    props: dict = field(default_factory=dict)


def _read_raster(path: Path) -> tuple[np.ndarray, Any]:
    with rasterio.open(path) as src:
        return src.read(1).astype("float64"), src.transform


def terrain_units() -> tuple[list[Unit], dict]:
    dem, transform = _read_raster(PROCESSED / "terrain" / "dem_farm_30m.tif")
    upslope, transform2 = _read_raster(PROCESSED / "terrain" / "upslope_area_farm_30m.tif")
    if transform != transform2:
        raise RuntimeError("DEM and upslope grids differ")
    res = float(transform.a)
    twi = tr.twi(upslope, tr.slope_tan(dem, res), contour_width_m=res)
    collection = json.loads((PROCESSED / "aoi" / "demo_lots.geojson").read_text(encoding="utf-8"))
    feats = sorted(collection["features"], key=lambda f: int(contract_lot_id(f["properties"]["id"]).rsplit("_", 1)[1]))
    utm_geoms = []
    for f in feats:
        ring = np.array(f["geometry"]["coordinates"][0])
        xs, ys = to_utm(ring[:, 0], ring[:, 1])
        utm_geoms.append({"type": "Polygon", "coordinates": [list(zip(xs, ys))]})
    labels = tr.rasterize_units(utm_geoms, dem.shape, transform)
    stats = tr.unit_stats(twi, labels, len(feats))
    farm_mask = labels > 0
    breaks = tr.tercile_breaks(twi[farm_mask])
    units: list[Unit] = []
    for k, (f, s) in enumerate(zip(feats, stats), start=1):
        u = Unit(contract_lot_id(f["properties"]["id"]), "lot", f["properties"]["name"], labels == k, f["geometry"],
                 s["mean"], s["max"], s["min"], s["n_cells"], s["n_undefined"], props=f["properties"])
        u.tercile = tr.tercile_of(u.twi_mean, breaks)
        units.append(u)
    for u, r in zip(units, tr.rank_within_farm([u.twi_mean for u in units])):
        u.rank = r
    codes = tr.tercile_raster(twi, farm_mask, breaks)
    zones = []
    for code, name in enumerate(tr.TERCILES, start=1):
        mask = codes == code
        vals = twi[mask]
        polys = [tr.ring_to_lonlat(rings, to_lonlat) for rings in tr.polygons_of(codes, code, transform)]
        z = Unit(f"zone_{FARM_SLUG}_{name}", "zone", f"Zona {name}", mask, {"type": "MultiPolygon", "coordinates": polys},
                 float(vals.mean()), float(vals.max()), float(vals.min()), int(mask.sum()), 0)
        z.tercile = name
        zones.append(z)
    for z, r in zip(zones, tr.rank_within_farm([0.0, 1.0, 2.0])):  # zone order low < mid < high by construction
        z.rank = r
    # NDVI of the replay scenes, mean of the clear cells inside each unit, only on the acquisition day. A scene with
    # any value outside [-1, 1] cannot be NDVI = (NIR - Red) / (NIR + Red); it is rejected whole (stays missing).
    stack = json.loads((STACK / "stack.json").read_text(encoding="utf-8"))
    ndvi_layers = [layer for layer in stack["layers"] if layer["layer"] == "ndvi"]
    used, rejected = [], []
    for layer in ndvi_layers:
        arr, t3 = _read_raster(STACK / layer["file"])
        if t3 != transform:
            raise RuntimeError("NDVI grid differs from the terrain grid")
        day = dt.date.fromisoformat(layer["date"])
        finite = arr[np.isfinite(arr)]
        valid = ndvi_scene_is_valid(finite)
        (used if valid and finite.size else rejected).append(layer["file"])
        for u in units + zones:
            vals = arr[u.mask]
            vals = vals[np.isfinite(vals)]
            u.ndvi[day] = round(float(vals.mean()), 3) if valid and vals.size else None
    farm = {
        "breaks": breaks, "n_farm_cells": int(farm_mask.sum()), "n_undefined_farm": int((~np.isfinite(twi[farm_mask])).sum()),
        "elevation_m": float(np.nanmean(dem[farm_mask])),
        "lat": float(np.mean([np.mean(np.array(f["geometry"]["coordinates"][0])[:-1, 1]) for f in feats])),
        "lon": float(np.mean([np.mean(np.array(f["geometry"]["coordinates"][0])[:-1, 0]) for f in feats])),
        "ndvi_files": used, "ndvi_rejected": rejected,
    }
    return units + zones, farm


def ndvi_scene_is_valid(values: np.ndarray) -> bool:
    """True when every finite value lies in [-1, 1], the range the NDVI formula allows."""
    v = np.asarray(values, dtype="float64")
    v = v[np.isfinite(v)]
    return bool(((v >= -1) & (v <= 1)).all())


@dataclass
class Series:
    dates: list[dt.date]
    data: dict[str, np.ndarray]
    hourly_leaf: dict[dt.date, float | None]


def daily_series(cfg: dict, farm: dict) -> Series:
    catch = pd.read_csv(PROCESSED / "rain" / "imerg_catchment_daily.csv", parse_dates=["date"])
    local = pd.read_csv(FARM_RAIN_CSV, parse_dates=["date"])
    power = pd.read_csv(PROCESSED / "weather" / "power_daily_farm.csv", parse_dates=["date"])
    df = catch.merge(local[["date", "rain_farm_cell_mm"]], on="date", how="left").merge(power, on="date", how="left")
    dates = [d.date() for d in df["date"]]
    up = df["rain_catchment_mm"].to_numpy(dtype="float64")
    loc = df["rain_farm_cell_mm"].to_numpy(dtype="float64")
    up_w = int(cfgmod.value(cfg, "engine.upstream_window_hours")) // 24
    lag = int(cfgmod.value(cfg, "travel_lag_days"))  # calibrated on the Feb 2026 event (config/alerts.yaml)
    up_sums = {h: hy.rolling_sum(up, h // 24) for h in (24, 48, 72)}
    upstream = hy.rolling_sum(up, up_w)
    if lag:
        upstream = np.r_[np.full(lag, np.nan), upstream[:-lag]]
    api = hy.antecedent_precipitation_index(loc, float(cfgmod.value(cfg, "api_k")))
    tmax, tmin = df["t2m_max_c"].to_numpy(float), df["t2m_min_c"].to_numpy(float)
    rh = df["rh2m_pct"].to_numpy(float)
    doy = np.array([d.timetuple().tm_yday for d in dates])
    eto = hy.eto_fao56(tmax, tmin, hy.ea_from_rh_mean(tmax, tmin, rh), df["ws2m_ms"].to_numpy(float),
                       df["allsky_sfc_sw_dwn_mj_m2"].to_numpy(float), farm["lat"], doy, farm["elevation_m"])
    etc = hy.crop_et(float(cfgmod.value(cfg, "kc_banana")), eto)
    drainage = cfgmod.value_or_none(cfg, "drainage_mm_per_day")
    bal = hy.daily_balance(loc, etc, drainage)
    bal7 = hy.rolling_sum(bal, int(cfgmod.value(cfg, "engine.balance_window_days")))
    tmean = df["t2m_c"].to_numpy(float)
    hu = sd.heat_units(tmean, float(cfgmod.value(cfg, "cold.base_c")))
    hourly = pd.read_csv(PROCESSED / "weather" / f"power_hourly_farm_{REPLAY[0]}_{REPLAY[1]}.csv")
    hourly["day"] = hourly["time_utc"].str[:10]
    leaf_rh = float(cfgmod.value(cfg, "sigatoka.leaf_wet_rh"))
    leaf = {dt.date.fromisoformat(day): sd.leaf_wetness_hours(g["rh2m_pct"].to_numpy(float), leaf_rh) for day, g in hourly.groupby("day")}
    data = {
        "rain_up": up, "rain_local": loc, "up24": up_sums[24], "up48": up_sums[48], "up72": up_sums[72], "upstream": upstream,
        "api": api, "eto": eto, "etc": etc, "balance": bal, "balance7": bal7,
        "positive_days": hy.consecutive_positive_days(bal), "tmean": tmean, "rh": rh / 100.0, "heat_units": hu,
        "heat7": hy.rolling_sum(hu, 7),
    }
    return Series(dates, data, leaf)


def indicators(series: Series, cfg: dict) -> dict[str, np.ndarray]:
    n = int(cfgmod.value(cfg, "engine.percentile_min_history_days"))
    d = series.data
    return {
        "upstream": percentile_against_history(d["upstream"], n),
        "saturation": percentile_against_history(d["api"], n),
        "local": percentile_against_history(d["rain_local"], n),
        "balance": percentile_against_history(d["balance7"], n),
    }


def state_params(cfg: dict) -> st.StateParams:
    v = lambda k: float(cfgmod.value(cfg, k))  # noqa: E731
    return st.StateParams(v("levels.watch"), v("levels.warning"), v("levels.severe"), v("deescalate.watch"),
                          v("deescalate.warning"), v("deescalate.severe"), int(v("severe_confirmations")), v("stale_after_hours"))


def _end_of_day(d: dt.date) -> dt.datetime:
    return dt.datetime.combine(d + dt.timedelta(days=1), dt.time(0), tzinfo=dt.timezone.utc)


@dataclass
class UnitRun:
    w: np.ndarray
    states: list[st.UnitState]
    events: list[st.Transition]
    floors: list[bool]


def run_units(units: list[Unit], series: Series, x: dict[str, np.ndarray], weights: dict[str, float], cfg: dict,
              start: dt.date, end: dt.date) -> dict[str, UnitRun]:
    p = state_params(cfg)
    i0, i1 = series.dates.index(start), series.dates.index(end)
    sl = slice(i0, i1 + 1)
    days = series.dates[sl]
    fresh = np.isfinite(series.data["rain_up"]) & np.isfinite(series.data["rain_local"])
    newest: list[dt.datetime | None] = []
    last = None
    for i in range(len(series.dates)):
        if fresh[i]:
            last = _end_of_day(series.dates[i])
        if sl.start <= i <= i1:
            newest.append(last)
    floor_days = int(cfgmod.value(cfg, "waterlogging_days_floor_warning"))
    out = {}
    for u in units:
        ind = {**{k: v[sl] for k, v in x.items()}, "terrain": np.full(len(days), np.nan if u.rank is None else u.rank)}
        w = alert_index(ind, weights)
        floors = list(hy.floor_warning(series.data["positive_days"][sl], u.tercile, floor_days))
        times = [_end_of_day(d) for d in days]
        ws = [None if not np.isfinite(v) else float(v) for v in w]
        states, events = st.run(ws, times, newest, p, floors, st.initial_state(times[0]))
        out[u.id] = UnitRun(w, states, events, floors)
    return out


# --------------------------------------------------------------------------------------------------------
# Snapshot builders (shapes: pipeline/common/models.py)
# --------------------------------------------------------------------------------------------------------

CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def ulid_for(at: dt.datetime, key: str) -> str:
    """Deterministic ULID: 48-bit epoch milliseconds of `at` + 80 bits of sha256(key), Crockford base32."""
    value = (int(at.timestamp() * 1000) << 80) | int.from_bytes(hashlib.sha256(key.encode()).digest()[:10], "big")
    return "".join(CROCKFORD[(value >> (5 * i)) & 31] for i in reversed(range(26)))


def _iso(t: dt.datetime | None) -> str | None:
    return None if t is None else t.isoformat().replace("+00:00", "Z")


def _r(v: float | None, nd: int = 2) -> float | None:
    return None if v is None or not np.isfinite(v) else round(float(v), nd)


FEATURE_ORIGIN = {
    "*": "sourced", "runoff_upstream_mm": "pending", "soil_moisture": "pending", "api_index": "estimated", "etc_mm": "estimated",
    "balance_mm": "estimated", "balance_7d_mm": "estimated", "positive_balance_days": "estimated", "percentiles": "estimated",
    "leaf_wet_hours": "estimated", "heat_units": "estimated",
}
ALERT_ORIGIN = {"*": "design", "w": "estimated", "factors": "estimated"}


def feature_record(u: Unit, i: int, series: Series, x: dict[str, np.ndarray], prov_ids: list[str]) -> dict:
    d, day = series.data, series.dates[i]
    ndvi = u.ndvi.get(day)
    pos = d["positive_days"][i]
    return {
        "unit_id": u.id, "date": day.isoformat(),
        "rain_local_mm": _r(d["rain_local"][i]), "rain_upstream_24h_mm": _r(d["up24"][i]), "rain_upstream_48h_mm": _r(d["up48"][i]),
        "rain_upstream_72h_mm": _r(d["up72"][i]), "runoff_upstream_mm": None, "soil_moisture": None, "soil_moisture_source": None,
        "api_index": _r(d["api"][i]), "et0_mm": _r(d["eto"][i]), "etc_mm": _r(d["etc"][i]), "balance_mm": _r(d["balance"][i]),
        "balance_7d_mm": _r(d["balance7"][i]), "positive_balance_days": None if not np.isfinite(pos) else int(pos),
        "percentiles": {k: _r(x[k][i], 4) for k in ("upstream", "saturation", "local", "balance")},
        "twi_rank": _r(u.rank, 4), "temp_mean_c": _r(d["tmean"][i]), "rh_mean": _r(d["rh"][i], 4),
        "leaf_wet_hours": series.hourly_leaf.get(day), "heat_units": _r(d["heat_units"][i]),
        "ndvi": ndvi, "ndvi_date": day.isoformat() if ndvi is not None else None,
        "provenance_ids": prov_ids, "origin": FEATURE_ORIGIN,
    }


def alert_record(u: Unit, j: int, i: int, run: dict[str, UnitRun], series: Series, x: dict[str, np.ndarray], weights: dict,
                 side: dict[str, list], newest_at: dt.datetime | None) -> dict:
    ur = run[u.id]
    state = ur.states[j]
    w = ur.w[j]
    ind = {**{k: float(v[i]) for k, v in x.items()}, "terrain": u.rank}
    shares = factor_shares(ind, weights) if np.isfinite(w) else None
    return {
        "unit_id": u.id, "level": state.level, "w": _r(w, 4) if state.level != "stale" else None,
        "factors": [{"name": f["name"], "share": round(f["share"], 4)} for f in top_factors(shares)] if state.level != "stale" else [],
        "since": _iso(state.since), "updated_at": _iso(_end_of_day(series.dates[i])), "newest_rain_data_at": _iso(newest_at),
        "confirmations": state.confirmations,
        "confidence": confidence_for_data_level(LOT_DATA_LEVEL if u.kind == "lot" else ZONE_DATA_LEVEL),
        "side": {"sigatoka": side["sigatoka"][i], "cold": side["cold"][i]}, "origin": ALERT_ORIGIN,
    }


def event_record(unit_id: str, ev: st.Transition, w: float | None, factors: list[dict]) -> dict:
    return {
        "id": ulid_for(ev.at, f"{unit_id}|{ev.at.isoformat()}|{ev.from_level}|{ev.to_level}"), "unit_id": unit_id,
        "from_level": ev.from_level, "to_level": ev.to_level, "w": w, "factors": factors, "at": _iso(ev.at),
        "email_sent": False, "telegram_sent": False, "origin": ALERT_ORIGIN,
    }


def side_levels(series: Series, cfg: dict) -> dict[str, list]:
    d = series.data
    fav = sd.sigatoka_favourable(d["tmean"], d["rh"], d["rain_local"], float(cfgmod.value(cfg, "sigatoka.t_mean_c")),
                                 float(cfgmod.value(cfg, "sigatoka.rh_mean")))
    return {
        "sigatoka": sd.sigatoka_level(fav, int(cfgmod.value(cfg, "sigatoka.days"))),
        "cold": sd.cold_level(series.dates, d["heat7"], int(cfgmod.value(cfg, "engine.cold_climatology_min_years"))),
    }


def input_provenance(farm: dict) -> tuple[list[dict], dict[str, str]]:
    recs: list[dict] = []
    ids: dict[str, str] = {}

    def add(key: str, records: list[dict]) -> None:
        for rec in records:
            if rec["id"] not in {r["id"] for r in recs}:
                recs.append(rec)
        ids[key] = records[0]["id"]

    add("rain_up", _read_sidecar(PROCESSED / "rain" / "imerg_catchment_daily.csv"))
    add("rain_local", _read_sidecar(FARM_RAIN_CSV))
    add("power_daily", _read_sidecar(PROCESSED / "weather" / "power_daily_farm.csv"))
    add("power_hourly", _read_sidecar(PROCESSED / "weather" / f"power_hourly_farm_{REPLAY[0]}_{REPLAY[1]}.csv"))
    add("dem", _read_sidecar(PROCESSED / "terrain" / "dem_farm_30m.tif"))
    add("upslope", _read_sidecar(PROCESSED / "terrain" / "upslope_area_farm_30m.tif"))
    add("catchment", _read_embedded(PROCESSED / "aoi" / "catchment.geojson"))
    add("lots", _read_embedded(PROCESSED / "aoi" / "demo_lots.geojson")[:1])
    for i, name in enumerate(farm["ndvi_files"]):
        add(f"ndvi{i}", _read_sidecar(STACK / name))
    return recs, ids


# --------------------------------------------------------------------------------------------------------
# replay: everything
# --------------------------------------------------------------------------------------------------------


def run_replay(generated_at: str | None = None) -> dict:
    cfg = cfgmod.load()
    generated_at = generated_at or utc_now()
    weights = {k: float(cfgmod.value(cfg, f"weights.{k}")) for k in FACTORS}
    units, farm = terrain_units()
    series = daily_series(cfg, farm)
    x = indicators(series, cfg)
    sides = side_levels(series, cfg)
    state_start = dt.date.fromisoformat(cfgmod.value(cfg, "engine.state_start"))
    last_day = max(d for d, a, b in zip(series.dates, series.data["rain_up"], series.data["rain_local"]) if np.isfinite(a) and np.isfinite(b))
    runs = run_units(units, series, x, weights, cfg, state_start, last_day)
    run_dates = series.dates[series.dates.index(state_start): series.dates.index(last_day) + 1]
    lots = [u for u in units if u.kind == "lot"]
    level_series = {u.id: [s.level for s in runs[u.id].states] for u in units}

    # --- verification (lots are the alert units at data level 2) ---
    v_lo = VERIFICATION_PERIOD[0]
    v_dates = [d for d in run_dates if d >= v_lo]
    k0 = run_dates.index(v_lo)
    v_levels = {u.id: level_series[u.id][k0:] for u in lots}
    alert_level = cfgmod.value(cfg, "verification.alert_level")
    outcomes, counts = verify(DOCUMENTED_FLOODS, v_levels, v_dates, frozenset({alert_level}),
                              int(cfgmod.value(cfg, "verification.days_before")), int(cfgmod.value(cfg, "verification.days_after")))
    replay_outcomes, replay_counts = verify(DOCUMENTED_FLOODS, {u: s[v_dates.index(REPLAY[0]): v_dates.index(REPLAY[1]) + 1] for u, s in v_levels.items()},
                                            [d for d in run_dates if REPLAY[0] <= d <= REPLAY[1]], frozenset({alert_level}),
                                            int(cfgmod.value(cfg, "verification.days_before")), int(cfgmod.value(cfg, "verification.days_after")))

    # --- sensitivity on the replay window (T-024b) ---
    r_dates = [d for d in run_dates if REPLAY[0] <= d <= REPLAY[1]]
    r0, r1 = run_dates.index(REPLAY[0]), run_dates.index(REPLAY[1])
    base_severe = severe_days({u.id: level_series[u.id][r0: r1 + 1] for u in lots}, r_dates)
    feb = DOCUMENTED_FLOODS[0]
    f_lo = feb.start - dt.timedelta(days=int(cfgmod.value(cfg, "verification.days_before")))
    f_hi = feb.end + dt.timedelta(days=int(cfgmod.value(cfg, "verification.days_after")))
    flood_lots = lambda sev: sorted(u for u, days in sev.items() if any(f_lo <= d <= f_hi for d in days))  # noqa: E731
    base_flood_lots = flood_lots(base_severe)
    sens = []
    for name, delta, wv in variants(weights, SENSITIVITY_DELTA):
        vr = run_units(lots, series, x, wv, cfg, state_start, REPLAY[1])
        vs = severe_days({u.id: [s.level for s in vr[u.id].states][r0: r1 + 1] for u in lots}, r_dates)
        sens.append({"factor": name, "delta": delta, "weights": {k: round(v, 4) for k, v in wv.items()}, "severe": vs, **compare(base_severe, vs),
                     "flood_lots": flood_lots(vs)})

    # --- write snapshots ---
    in_recs, ids = input_provenance(farm)
    engine_id = f"prov-engine-demo-replay-{REPLAY[0]}-{REPLAY[1]}"
    engine_rec = _mine(record(
        engine_id, aoi=AOI_ID, time_range=(REPLAY[0].isoformat(), REPLAY[1].isoformat()),
        processing=["pipeline/engine (data-scientist): TWI terciles and ranks, IMERG Early catchment 72 h rain, API (k from config), FAO-56 ETo x Kc, 7-day rain minus ETc, mid-rank percentiles against earlier days",
                    "W = sum of design weights x indicators; state machine per docs/spec/16 run daily from engine.state_start; parameters config/alerts.yaml",
                    "verification against press-documented floods (D-024); weight sensitivity +/-0.10 renormalised (T-024b)"],
        notes="Engine outputs for the synthetic demo farm (Finca Demo El Oro, labelled Demo). Inputs are the other records of this manifest. Side indicators (Sigatoka, cold) are experimental (D-024). " + (f"NDVI scenes not used (no clear pixel, or values outside [-1, 1]): {len(farm['ndvi_rejected'])} of {len(farm['ndvi_rejected']) + len(farm['ndvi_files'])} (NDVI stays missing)." if farm["ndvi_rejected"] else "")))
    feature_ids = [engine_id, ids["rain_up"], ids["rain_local"], ids["power_daily"], ids["upslope"]]
    ref = {"ref": "../manifest.json", "ids": [engine_id] + sorted(set(ids.values()))}
    DEMO.mkdir(parents=True, exist_ok=True)
    for sub in ("replay", "history"):
        for old in (DEMO / sub).glob("*.json") if (DEMO / sub).exists() else []:
            old.unlink()
    manifest = {"schema_version": CONTRACT_VERSION, "farm_id": FARM_ID, "generated_at": generated_at, "engine_commit": git_commit(),
                "replay_window": {"start": REPLAY[0].isoformat(), "end": REPLAY[1].isoformat()}}
    write_json(DEMO / "manifest.json", manifest, [engine_rec] + in_recs)

    idx = {d: i for i, d in enumerate(series.dates)}
    for d in r_dates:
        i, j = idx[d], run_dates.index(d)
        newest_at = _end_of_day(d) if np.isfinite(series.data["rain_up"][i]) and np.isfinite(series.data["rain_local"][i]) else None
        day_units, day_events = [], []
        for u in units:
            alert = alert_record(u, j, i, runs, series, x, weights, sides, newest_at)
            day_units.append({"unit_id": u.id, "alert": alert, "features": feature_record(u, i, series, x, feature_ids)})
            for ev in runs[u.id].events:
                if ev.at == _end_of_day(d):
                    day_events.append(event_record(u.id, ev, alert["w"], alert["factors"]))
        write_json(DEMO / "replay" / f"{d.isoformat()}.json",
                   {"date": d.isoformat(), "generated_at": generated_at, "units": day_units, "events": day_events}, {"ref": ref["ref"], "ids": ref["ids"]})

    h_dates = [series.dates[idx[REPLAY[1]] - k] for k in reversed(range(HISTORY_DAYS))]
    for u in units:
        recs = [feature_record(u, idx[d], series, x, feature_ids) for d in h_dates]
        ser: dict[str, Any] = {"origin": FEATURE_ORIGIN, "soil_moisture_origin": None}
        for key in recs[0]:
            if key in ("unit_id", "date", "provenance_ids", "origin"):
                continue
            if key == "percentiles":
                ser[key] = {k: [r[key][k] for r in recs] for k in recs[0][key]}
            else:
                ser[key] = [r[key] for r in recs]
        write_json(DEMO / "history" / f"{u.id}.json",
                   {"unit_id": u.id, "generated_at": generated_at, "dates": [d.isoformat() for d in h_dates], "series": ser},
                   {"ref": ref["ref"], "ids": ref["ids"]})

    zone_feats = [{"type": "Feature", "geometry": z.geometry,
                   "properties": {"id": z.id, "farm_id": FARM_ID, "tercile": z.tercile, "twi_range": [round(z.twi_min, 3), round(z.twi_max, 3)], "origin": "sourced"}}
                  for z in units if z.kind == "zone"]
    zone_rec = _mine(record(
        f"prov-engine-demo-zones-{FARM_SLUG}", aoi=AOI_ID, time_range=None,
        processing=["TWI = ln((D8 upslope area / 30 m) / tan beta), tan beta by central differences on the SRTM DEM (pipeline/engine/terrain.py)",
                    f"farm extent = union of the 8 synthetic demo lots ({farm['n_farm_cells']} cells; {farm['n_undefined_farm']} flat cells with undefined TWI left out)",
                    f"terciles at the 1/3 and 2/3 quantiles of the farm's TWI cells: {farm['breaks'][0]:.3f}, {farm['breaks'][1]:.3f}; cells polygonised (4-connected) to EPSG:4326, 6 decimals"],
        notes="Automatic data-level-1 zones of the synthetic demo farm: sourced TWI, synthetic extent (the demo farm has no outline)."))
    srtm = [r for r in in_recs if r["id"] in (ids["dem"], ids["upslope"])]
    write_json(DEMO / "zones.geojson", {"type": "FeatureCollection", "features": zone_feats}, [zone_rec] + srtm)
    catch = json.loads((PROCESSED / "aoi" / "catchment.geojson").read_text(encoding="utf-8"))
    write_json(DEMO / "catchment.geojson", {"type": "FeatureCollection", "features": catch["features"]}, catch["provenance"])
    write_farm(units, farm, generated_at, in_recs, ids, zone_rec)
    verification = write_verification(outcomes, counts, replay_counts, sens, base_severe, base_flood_lots, (f_lo, f_hi), generated_at, engine_rec, in_recs, v_dates)

    return {
        "units": [{"id": u.id, "twi_mean": _r(u.twi_mean, 3), "rank": _r(u.rank, 3), "tercile": u.tercile, "cells": u.n_cells, "undefined": u.n_undefined} for u in units],
        "breaks": farm["breaks"], "levels_replay": {u.id: level_series[u.id][r0: r1 + 1] for u in units},
        "w_replay": {u.id: [_r(v, 3) for v in runs[u.id].w[r0: r1 + 1]] for u in units},
        "counts": counts, "replay_counts": replay_counts, "outcomes": [(o.flood_or_episode_id, o.outcome, o.unit_ids) for o in outcomes],
        "base_severe": {k: [d.isoformat() for d in v] for k, v in base_severe.items()}, "sensitivity_stable": all(s["same_days"] for s in sens),
        "sensitivity": [(s["factor"], s["delta"], s["same_units"], s["same_days"], s["units_gained"], s["units_lost"], s["units_with_shifted_days"]) for s in sens],
        "floors_replay": {u.id: sum(runs[u.id].floors[r0: r1 + 1]) for u in units},
        "severe_episodes_lots_2016_on": len(_episodes_any({u.id: level_series[u.id] for u in lots}, run_dates)),
        "last_day": last_day.isoformat(), "verification_bytes": verification, "ndvi_rejected": farm["ndvi_rejected"],
    }


def _episodes_any(levels: dict[str, list[str]], dates: list[dt.date]) -> list[tuple[dt.date, dt.date]]:
    from pipeline.engine.verification import alert_days, episodes

    return episodes(list(alert_days(levels, dates, frozenset({"severe"}))))


def write_farm(units: list[Unit], farm: dict, generated_at: str, in_recs: list[dict], ids: dict, zone_rec: dict) -> None:
    lots_out = []
    for u in units:
        if u.kind != "lot":
            continue
        lots_out.append({
            "id": u.id, "farm_id": FARM_ID, "name": u.name, "geometry": u.geometry,
            "area_ha": u.props.get("area_ha"), "area_ha_origin": "synthetic",
            "plant_age_months": None, "plant_age_months_origin": "pending", "variety": None, "variety_origin": "pending",
            "drainage_class": None, "drainage_class_origin": "pending", "drainage_works": None, "drainage_works_origin": "pending",
            "cover_crop": None, "cover_crop_origin": "pending", "last_soil_analysis": None, "last_soil_analysis_origin": "pending",
            "nematode_incidence": None, "nematode_incidence_origin": "pending", "disease_notes": None,
            "bioinputs": None, "bioinputs_origin": "pending",
            "twi_mean": _r(u.twi_mean, 3), "twi_max": _r(u.twi_max, 3), "twi_tercile": u.tercile,
            "defined_by": u.props.get("defined_by", "data-engineer"), "to_be_redefined_by": "future-local-agronomist",
            "origin": {"*": "synthetic", "twi_mean": "sourced", "twi_max": "sourced"},
        })
    farm_out = {
        "id": FARM_ID, "name": "Finca Demo El Oro", "owner_id": None, "country": "Ecuador", "province": "El Oro", "canton": "Pasaje",
        "location": {"type": "Point", "coordinates": [round(farm["lon"], 6), round(farm["lat"], 6)]}, "outline": None,
        "data_level": LOT_DATA_LEVEL, "crop": "banana", "variety": "Cavendish Williams", "variety_origin": "estimated",
        "catchment_id": CATCHMENT_ID, "alert_email": None, "language": "es", "units": "metric", "mode": "farmer",
        "storage_mode": "full", "is_demo": True, "created_at": generated_at, "updated_at": generated_at, "origin": {"*": "synthetic"},
    }
    farm_rec = _mine(record(
        f"prov-engine-demo-farm-{FARM_SLUG}", aoi=AOI_ID, time_range=None,
        processing=["farm fields from docs/spec/19 (Demo farm data: name, crop, Pasaje along the Buenavista river); variety = questionnaire default kept as estimated (D-023)",
                    "lots: geometry and area from processed/aoi/demo_lots.geojson (synthetic, D-005), ids mapped to lot_demo-el-oro_<n>; twi_mean/twi_max/twi_tercile from pipeline/engine/terrain.py",
                    "location = mean of the lot centres; no outline (the demo farm is its lots); unknown lot attributes are null (pending)"],
        notes="Synthetic demo farm (Finca Demo El Oro), shown with a visible Demo label; to_be_redefined_by future-local-agronomist (D-026)."))
    lots_rec = [r for r in in_recs if r["id"] == ids["lots"]]
    write_json(DEMO / "farm.json", {"farm": farm_out, "lots": lots_out}, [farm_rec, zone_rec] + lots_rec)


def _ranges(days: list[dt.date]) -> str:
    from pipeline.engine.verification import episodes

    return ", ".join(a.isoformat()[5:] if a == b else f"{a.isoformat()[5:]}..{b.isoformat()[5:]}" for a, b in episodes(days))


def write_verification(outcomes, counts, replay_counts, sens, base_severe, base_flood_lots, flood_window, generated_at, engine_rec, in_recs, v_dates) -> int:
    events = [{"id": o.flood_or_episode_id, "kind": o.kind, "start": o.start.isoformat(), "end": o.end.isoformat(), "outcome": o.outcome,
               "unit_ids": o.unit_ids, "description": o.description, "sources": o.sources} for o in outcomes]
    stable = all(s["same_days"] for s in sens)
    base_txt = "; ".join(f"{u.rsplit('_', 1)[1]}: {_ranges(days)}" for u, days in base_severe.items()) or "none"
    flood_same = sum(s["flood_lots"] == base_flood_lots for s in sens)
    always = sorted(set(base_flood_lots).intersection(*[set(s["flood_lots"]) for s in sens]))
    ever = sorted(set(base_flood_lots).union(*[set(s["flood_lots"]) for s in sens]))
    lines = []
    for s in sens:
        if s["same_days"]:
            continue
        diff = []
        if s["units_gained"]:
            diff.append("gains lot " + ", ".join(u.rsplit("_", 1)[1] for u in s["units_gained"]))
        if s["units_lost"]:
            diff.append("loses lot " + ", ".join(u.rsplit("_", 1)[1] for u in s["units_lost"]))
        if s["units_with_shifted_days"]:
            diff.append("days shift for lot " + ", ".join(u.rsplit("_", 1)[1] for u in s["units_with_shifted_days"]))
        lines.append(f"{s['factor']} {s['delta']:+.2f}: {'; '.join(diff)}")
    notes = (
        f"Counts, not skill: {len(DOCUMENTED_FLOODS)} press-documented floods (D-024; 1 in the farm's catchment, 3 regional), "
        f"period {v_dates[0].isoformat()}..{v_dates[-1].isoformat()}, alert = a demo lot at Severe; a hit needs Severe from 1 UTC day before "
        f"to 1 day after the local flood dates. False alarm = Severe episode with no documented flood in this list, not proof that no flood "
        f"happened. Replay window {REPLAY[0].isoformat()}..{REPLAY[1].isoformat()}: hits {replay_counts['hits']}, misses {replay_counts['misses']}, "
        f"false alarms {replay_counts['false_alarms']}. Weights are design (no expert AHP). "
        f"SENSITIVITY (T-024b): each weight moved by +/-0.10 and the rest renormalised, 10 variants, replay re-run. "
        f"Baseline demo lots at Severe (UTC days): {base_txt}. Strict result (same lots, same days): "
        f"{'STABLE in all 10 variants' if stable else 'NOT STABLE in ' + str(len(lines)) + ' of 10 variants: ' + ' | '.join(lines)}. "
        f"Flood days {flood_window[0].isoformat()[5:]}..{flood_window[1].isoformat()[5:]}: lots at Severe in the baseline: "
        f"{', '.join(u.rsplit('_', 1)[1] for u in base_flood_lots) or 'none'}; the same set in {flood_same} of 10 variants; Severe on those days in every variant: lots "
        f"{', '.join(u.rsplit('_', 1)[1] for u in always) or 'none'}; in at least one variant: lots {', '.join(u.rsplit('_', 1)[1] for u in ever)}."
    )
    ver_rec = _mine(record(
        f"prov-engine-demo-verification-{v_dates[0].isoformat()}-{v_dates[-1].isoformat()}", aoi=AOI_ID,
        time_range=(v_dates[0].isoformat(), v_dates[-1].isoformat()),
        processing=["pipeline/engine/verification.py: documented floods vs daily lot levels (config/alerts.yaml verification.*)",
                    "pipeline/engine/sensitivity.py: weights +/-0.10 renormalised, replay re-run, Severe lots and days compared"],
        notes="Flood events: press reports opened by data-scientist (sources per event), origin observed with the press URL as observer (D-024)."))
    sc = scores(counts["hits"], counts["misses"], counts["false_alarms"])
    write_json(DEMO / "verification.json", {
        "generated_at": generated_at, "events": events, **counts, **sc,
        "origin": {"*": "estimated", "events": "observed"}, "notes": notes,
    }, [ver_rec, engine_rec])
    return (DEMO / "verification.json").stat().st_size
