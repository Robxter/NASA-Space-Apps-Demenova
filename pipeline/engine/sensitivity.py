"""T-024b weight sensitivity check (D-024, FIX2 §4.2): the replacement for an expert AHP matrix. Owner: data-scientist.

Each weight is moved by +delta and -delta (clipped to 0..1) and the other four are rescaled so the five still sum to 1:
w_j' = w_j * (1 - w_i') / (1 - w_i). The replay is re-run with each variant and the units that reach Severe, and the
days they are Severe, are compared with the baseline. Stability means the same units on the same days.
"""

from __future__ import annotations

import datetime as dt
from typing import Mapping

from pipeline.engine.index import FACTORS


def perturbed_weights(weights: Mapping[str, float], name: str, delta: float) -> dict[str, float]:
    if name not in FACTORS:
        raise ValueError(f"unknown factor {name}")
    base = {k: float(weights[k]) for k in FACTORS}
    new_i = min(max(base[name] + delta, 0.0), 1.0)
    rest = 1.0 - base[name]
    if rest <= 0:
        raise ValueError("cannot rescale: the other weights are all zero")
    scale = (1.0 - new_i) / rest
    out = {k: (new_i if k == name else v * scale) for k, v in base.items()}
    return out


def variants(weights: Mapping[str, float], delta: float) -> list[tuple[str, float, dict[str, float]]]:
    """(factor, signed delta, weights) for every factor and both signs, in SPEC factor order."""
    return [(name, sign * delta, perturbed_weights(weights, name, sign * delta)) for name in FACTORS for sign in (1, -1)]


def severe_days(levels: Mapping[str, list[str]], dates: list[dt.date]) -> dict[str, list[dt.date]]:
    """{unit: [days at Severe]} for the units that reach Severe at least once."""
    out = {unit: [d for d, level in zip(dates, series) if level == "severe"] for unit, series in levels.items()}
    return {unit: days for unit, days in sorted(out.items()) if days}


def compare(baseline: Mapping[str, list[dt.date]], variant: Mapping[str, list[dt.date]]) -> dict:
    """Same units and same days? Lists the differences (units gained or lost, days shifted)."""
    units_b, units_v = set(baseline), set(variant)
    shifted = sorted(u for u in units_b & units_v if list(baseline[u]) != list(variant[u]))
    return {
        "same_units": units_b == units_v,
        "same_days": units_b == units_v and not shifted,
        "units_gained": sorted(units_v - units_b),
        "units_lost": sorted(units_b - units_v),
        "units_with_shifted_days": shifted,
    }
