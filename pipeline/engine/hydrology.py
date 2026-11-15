"""T-021 and T-022 hydrology: Curve Number runoff, Kirpich travel time, lag calibration, antecedent precipitation
index, FAO-56 reference and crop evapotranspiration, daily water balance and the 2-day floor rule.
Owner: data-scientist. Every formula is a row of the Prediction science table (docs/spec/09); the source is named
on each function. Pure, vectorised numpy; missing input (NaN) gives missing output, never a filled value.
"""

from __future__ import annotations

import math
from typing import Sequence

import numpy as np

# --------------------------------------------------------------------------------------------------------
# Method 3: SCS Curve Number runoff. USDA NRCS, NEH Part 630 ch. 10 (2004), as written in the SPEC:
#   Q = (P - Ia)^2 / (P - Ia + S) for P > Ia, else 0;  Ia = 0.2 S;  S = 25400 / CN - 254  (mm)
# --------------------------------------------------------------------------------------------------------


def potential_retention_mm(cn: float) -> float:
    """S (mm) = 25400 / CN - 254, for 0 < CN <= 100."""
    if not 0 < cn <= 100:
        raise ValueError("a curve number lies in (0, 100]")
    return 25400.0 / cn - 254.0


def scs_cn_runoff_mm(p_mm: np.ndarray | float, cn: float, ia_ratio: float = 0.2) -> np.ndarray:
    """Direct runoff Q (mm) from event rain P (mm). NaN rain stays NaN. ia_ratio = 0.2 as in the SPEC."""
    p = np.asarray(p_mm, dtype="float64")
    s = potential_retention_mm(cn)
    ia = ia_ratio * s
    excess = p - ia
    with np.errstate(invalid="ignore", divide="ignore"):
        q = np.where(excess > 0, excess**2 / (excess + s), 0.0)
    return np.where(np.isnan(p), np.nan, q)


# --------------------------------------------------------------------------------------------------------
# Method 4: Kirpich (1940) time of concentration, first estimate of the upstream-to-farm travel time.
#   tc (min) = 0.0195 L^0.77 S^-0.385, L in m, S in m/m.
# --------------------------------------------------------------------------------------------------------


def kirpich_tc_minutes(length_m: float, slope_m_per_m: float) -> float:
    if length_m <= 0 or slope_m_per_m <= 0:
        raise ValueError("Kirpich needs a positive length and slope")
    return 0.0195 * length_m**0.77 * slope_m_per_m**-0.385


def calibrate_lag_hours(rain_times_h: Sequence[float], rain_mm: Sequence[float], observed_time_h: float) -> float:
    """Observed lag = time of the documented flood response minus the centroid (mass-weighted mean time) of the
    upstream rain that caused it, both in hours on the same clock (design definition, T-021).

    Needs sub-daily rain to be meaningful: with daily rain the centroid is only known to the day. Raises when the
    rain series is empty, has missing values or sums to zero (the lag is then undefined, not zero).
    """
    t = np.asarray(rain_times_h, dtype="float64")
    r = np.asarray(rain_mm, dtype="float64")
    if t.size == 0 or t.shape != r.shape:
        raise ValueError("rain times and amounts must be non-empty and aligned")
    if not (np.isfinite(t).all() and np.isfinite(r).all()):
        raise ValueError("missing rain values: the lag cannot be calibrated on a gap")
    if (r < 0).any() or r.sum() <= 0:
        raise ValueError("the event has no rain")
    centroid = float(np.sum(t * r) / np.sum(r))
    return float(observed_time_h) - centroid


def lag_days(travel_lag_hours: float | None, step_hours: float = 24.0) -> int:
    """Whole days by which the upstream signal is shifted on a daily series (nearest whole day; None -> 0 is NOT
    allowed: the caller must decide what a missing lag means)."""
    if travel_lag_hours is None or not math.isfinite(travel_lag_hours) or travel_lag_hours < 0:
        raise ValueError("travel lag must be a non-negative number of hours")
    return int(round(travel_lag_hours / step_hours))


# --------------------------------------------------------------------------------------------------------
# Method 5: antecedent precipitation index. Kohler & Linsley 1951: API_t = P_t + k * API_(t-1).
# --------------------------------------------------------------------------------------------------------


def antecedent_precipitation_index(p_mm: np.ndarray, k: float) -> np.ndarray:
    """API series. The first day starts from API = P_0 (no earlier state is known; its weight decays as k^t).
    A missing day makes that day and every later day missing: the recursion cannot be continued without inventing
    the gap (DATA_POLICY §2.2)."""
    if not 0 < k < 1:
        raise ValueError("k lies in (0, 1)")
    p = np.asarray(p_mm, dtype="float64")
    out = np.full(p.shape, np.nan)
    prev = 0.0
    for i, value in enumerate(p):
        if not np.isfinite(value):
            break
        prev = value + k * prev
        out[i] = prev
    return out


# --------------------------------------------------------------------------------------------------------
# Method 6: FAO-56 Penman-Monteith reference evapotranspiration and ETc = Kc x ETo (Allen et al. 1998, FAO
# Irrigation and Drainage Paper 56). Equation numbers below are FAO-56's. Checked against FAO-56 Example 18
# (Uccle, 6 July, ETo 3.9 mm/day) in test_hydrology.py.
# --------------------------------------------------------------------------------------------------------

SOLAR_CONSTANT = 0.0820  # Gsc, MJ m-2 min-1 (FAO-56 eq. 21)
STEFAN_BOLTZMANN = 4.903e-9  # sigma, MJ K-4 m-2 day-1 (FAO-56 eq. 39)
ALBEDO_GRASS = 0.23  # albedo of the hypothetical grass reference crop (FAO-56 eq. 38)


def atmospheric_pressure_kpa(z_m: float) -> float:
    """FAO-56 eq. 7."""
    return 101.3 * ((293.0 - 0.0065 * z_m) / 293.0) ** 5.26


def psychrometric_constant(p_kpa: float) -> float:
    """FAO-56 eq. 8: gamma = 0.665e-3 P (kPa/degC)."""
    return 0.665e-3 * p_kpa


def sat_vapour_pressure(t_c: np.ndarray | float) -> np.ndarray:
    """FAO-56 eq. 11: e0(T) = 0.6108 exp(17.27 T / (T + 237.3)) (kPa)."""
    t = np.asarray(t_c, dtype="float64")
    return 0.6108 * np.exp(17.27 * t / (t + 237.3))


def svp_slope(t_c: np.ndarray | float) -> np.ndarray:
    """FAO-56 eq. 13: Delta = 4098 e0(T) / (T + 237.3)^2 (kPa/degC)."""
    t = np.asarray(t_c, dtype="float64")
    return 4098.0 * sat_vapour_pressure(t) / (t + 237.3) ** 2


def extraterrestrial_radiation(lat_deg: float, doy: np.ndarray | int) -> np.ndarray:
    """FAO-56 eqs. 21-25: daily Ra (MJ m-2 day-1) from latitude and day of year."""
    j = np.asarray(doy, dtype="float64")
    phi = math.radians(lat_deg)
    dr = 1 + 0.033 * np.cos(2 * np.pi / 365 * j)  # eq. 23
    delta = 0.409 * np.sin(2 * np.pi / 365 * j - 1.39)  # eq. 24
    ws = np.arccos(np.clip(-np.tan(phi) * np.tan(delta), -1, 1))  # eq. 25
    return 24 * 60 / np.pi * SOLAR_CONSTANT * dr * (ws * np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.sin(ws))


def eto_fao56(
    tmax_c: np.ndarray,
    tmin_c: np.ndarray,
    ea_kpa: np.ndarray,
    u2_ms: np.ndarray,
    rs_mj: np.ndarray,
    lat_deg: float,
    doy: np.ndarray,
    z_m: float,
) -> np.ndarray:
    """FAO-56 eq. 6, daily step (G = 0, eq. 42), Tmean = (Tmax + Tmin) / 2 (eq. 9), es from eq. 12,
    Rns = (1 - 0.23) Rs (eq. 38), Rso = (0.75 + 2e-5 z) Ra (eq. 37), Rnl from eq. 39 with Rs/Rso capped at 1."""
    tmax = np.asarray(tmax_c, dtype="float64")
    tmin = np.asarray(tmin_c, dtype="float64")
    ea = np.asarray(ea_kpa, dtype="float64")
    u2 = np.asarray(u2_ms, dtype="float64")
    rs = np.asarray(rs_mj, dtype="float64")
    tmean = (tmax + tmin) / 2
    es = (sat_vapour_pressure(tmax) + sat_vapour_pressure(tmin)) / 2
    delta = svp_slope(tmean)
    gamma = psychrometric_constant(atmospheric_pressure_kpa(z_m))
    ra = extraterrestrial_radiation(lat_deg, doy)
    rso = (0.75 + 2e-5 * z_m) * ra
    rns = (1 - ALBEDO_GRASS) * rs
    with np.errstate(invalid="ignore", divide="ignore"):
        ratio = np.minimum(rs / rso, 1.0)
    rnl = STEFAN_BOLTZMANN * ((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2 * (0.34 - 0.14 * np.sqrt(ea)) * (1.35 * ratio - 0.35)
    rn = rns - rnl
    g = 0.0
    num = 0.408 * delta * (rn - g) + gamma * 900.0 / (tmean + 273.0) * u2 * (es - ea)
    den = delta + gamma * (1 + 0.34 * u2)
    return num / den


def ea_from_rh_mean(tmax_c: np.ndarray, tmin_c: np.ndarray, rh_mean_pct: np.ndarray) -> np.ndarray:
    """FAO-56 eq. 19: ea = RHmean / 100 * (e0(Tmax) + e0(Tmin)) / 2. Used because the POWER daily file holds the mean
    relative humidity only (no RHmax/RHmin, no dew point)."""
    rh = np.asarray(rh_mean_pct, dtype="float64")
    return rh / 100.0 * (sat_vapour_pressure(tmax_c) + sat_vapour_pressure(tmin_c)) / 2


def crop_et(kc: float, eto_mm: np.ndarray) -> np.ndarray:
    """ETc = Kc x ETo (FAO-56 eq. 56, single crop coefficient)."""
    return kc * np.asarray(eto_mm, dtype="float64")


# --------------------------------------------------------------------------------------------------------
# Method 7: daily soil water balance (FAO-56): Delta S = P - ETc - D, and the 2-day rule (team agronomist, 14 Nov 2026, sourced: banana tolerates
# at most 2 days of waterlogging; SPEC Risk engine: 2 consecutive positive-balance days on a top-tercile unit set a
# floor of Warning).
# --------------------------------------------------------------------------------------------------------


def daily_balance(p_mm: np.ndarray, etc_mm: np.ndarray, drainage_mm: np.ndarray | float | None) -> np.ndarray:
    """Delta S = P - ETc - D. With D pending (None) the result is P - ETc, the climatic balance of the SPEC's
    '7-day water balance' indicator ('rain minus ET'); callers must label it as such (D not subtracted)."""
    p = np.asarray(p_mm, dtype="float64")
    etc = np.asarray(etc_mm, dtype="float64")
    d = 0.0 if drainage_mm is None else np.asarray(drainage_mm, dtype="float64")
    return p - etc - d


def rolling_sum(values: np.ndarray, window: int) -> np.ndarray:
    """Trailing sum over `window` values ending at each index; NaN when the window is incomplete or has a gap."""
    x = np.asarray(values, dtype="float64")
    out = np.full(x.shape, np.nan)
    if window < 1:
        raise ValueError("window >= 1")
    for i in range(window - 1, x.size):
        chunk = x[i - window + 1 : i + 1]
        if np.isfinite(chunk).all():
            out[i] = chunk.sum()
    return out


def consecutive_positive_days(balance_mm: np.ndarray) -> np.ndarray:
    """Run length of consecutive days with balance > 0 ending at each day; a missing day breaks and is missing."""
    b = np.asarray(balance_mm, dtype="float64")
    out = np.full(b.shape, np.nan)
    run = 0
    for i, value in enumerate(b):
        if not np.isfinite(value):
            run = 0
            continue
        run = run + 1 if value > 0 else 0
        out[i] = run
    return out


def floor_warning(positive_days: np.ndarray, tercile: str | None, days_required: int) -> np.ndarray:
    """True where a top-tercile unit has had at least `days_required` consecutive positive-balance days."""
    run = np.asarray(positive_days, dtype="float64")
    if tercile != "high":
        return np.zeros(run.shape, dtype=bool)
    return np.where(np.isfinite(run), run >= days_required, False)
