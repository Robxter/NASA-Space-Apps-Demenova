"""T-023 side indicators, shown on Lot detail and never in the email (docs/spec/12). Owner: data-scientist.

- Method 8, leaf wetness: hours with relative humidity >= threshold (Sentelhas et al. 2008), from POWER hourly RH.
- Method 9, Sigatoka favourability: mean temperature > t_mean and mean RH > rh_mean with rain is favourable;
  Watch after `days` consecutive favourable days (docs/spec/12). RH < rh_unfavourable is reported as unfavourable.
- Method 10, banana heat units: daily units = mean temperature - base; the weekly (7-day) sum is compared with the
  same week's climatology (mean of the same 7-day window in earlier years); a sum below it flags cold stress
  (literal reading of domain/thresholds.yaml cold_stress_rule; how far below counts is not defined; experimental, D-024).
All thresholds are `estimated` (D-014) and come from config/alerts.yaml.
"""

from __future__ import annotations

import datetime as dt
from typing import Sequence

import numpy as np


def leaf_wetness_hours(rh_hourly_pct: np.ndarray, threshold_fraction: float) -> float | None:
    """Hours of one day with RH >= threshold. Needs all 24 hourly values; otherwise missing (None)."""
    rh = np.asarray(rh_hourly_pct, dtype="float64")
    if rh.size != 24 or not np.isfinite(rh).all():
        return None
    return float(np.count_nonzero(rh / 100.0 >= threshold_fraction))


def sigatoka_favourable(t_mean_c: np.ndarray, rh_mean_fraction: np.ndarray, rain_mm: np.ndarray, t_thr: float, rh_thr: float) -> np.ndarray:
    """1.0 favourable, 0.0 not, NaN when any input is missing. 'Rain' is read literally: rain > 0 mm that day."""
    t = np.asarray(t_mean_c, dtype="float64")
    rh = np.asarray(rh_mean_fraction, dtype="float64")
    r = np.asarray(rain_mm, dtype="float64")
    fav = ((t > t_thr) & (rh > rh_thr) & (r > 0)).astype("float64")
    fav[~(np.isfinite(t) & np.isfinite(rh) & np.isfinite(r))] = np.nan
    return fav


def sigatoka_level(favourable: np.ndarray, days: int) -> list[str | None]:
    """'watch' after `days` consecutive favourable days, else 'normal'; None on a missing day (the run restarts)."""
    out: list[str | None] = []
    run = 0
    for f in np.asarray(favourable, dtype="float64"):
        if not np.isfinite(f):
            run = 0
            out.append(None)
            continue
        run = run + 1 if f == 1.0 else 0
        out.append("watch" if run >= days else "normal")
    return out


def heat_units(t_mean_c: np.ndarray, base_c: float) -> np.ndarray:
    """Daily heat units = mean temperature - base (docs/spec/09, method 10), as written (no truncation)."""
    return np.asarray(t_mean_c, dtype="float64") - base_c


def cold_level(dates: Sequence[dt.date], weekly_sum: np.ndarray, min_years: int) -> list[str | None]:
    """'watch' when the 7-day heat-unit sum ending on a day is below the mean of the sums ending on the same
    month-day in earlier years; None without a value or without `min_years` earlier years (29 Feb has no peers)."""
    values = np.asarray(weekly_sum, dtype="float64")
    by_md: dict[tuple[int, int], list[tuple[int, float]]] = {}
    for d, v in zip(dates, values):
        if np.isfinite(v):
            by_md.setdefault((d.month, d.day), []).append((d.year, float(v)))
    out: list[str | None] = []
    for d, v in zip(dates, values):
        peers = [x for year, x in by_md.get((d.month, d.day), []) if year < d.year]
        if not np.isfinite(v) or len(peers) < min_years:
            out.append(None)
            continue
        out.append("watch" if v < float(np.mean(peers)) else "normal")
    return out
