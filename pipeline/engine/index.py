"""T-023 alert index W, factor shares, confidence badge and AHP weights. Owner: data-scientist.

W_unit,t = sum_i w_i x_i,unit,t with sum_i w_i = 1 (docs/spec/12). The five indicators x are normalised to 0..1:
percentile against the unit's own history (upstream, saturation, local, balance) and rank within the farm
(terrain). Weights: SPEC starting weights, origin design ("engineering choice; no expert AHP matrix available",
D-024); their stability is checked by sensitivity.py (T-024b). AHP (method 13) lives in ahp.py, unused.
"""

from __future__ import annotations

from typing import Mapping, Sequence

import numpy as np

FACTORS = ("upstream", "saturation", "terrain", "local", "balance")


def percentile_against_history(values: np.ndarray, min_history: int) -> np.ndarray:
    """Mid-rank percentile of each value against the values strictly before it (no look-ahead):
    p_t = (#{past < v_t} + 0.5 #{past == v_t}) / #{past}, over the finite past values.

    NaN when v_t is missing or fewer than `min_history` finite past values exist. Design choice (T-023): mid-rank
    so that the many tied dry days do not count as wet, and history only up to t-1 so a replay never sees the future.
    """
    x = np.asarray(values, dtype="float64")
    out = np.full(x.shape, np.nan)
    finite_before = 0
    past = np.empty(0)  # sorted finite values seen so far
    for t, v in enumerate(x):
        if np.isfinite(v) and finite_before >= min_history:
            less = np.searchsorted(past, v, side="left")
            less_eq = np.searchsorted(past, v, side="right")
            out[t] = (less + 0.5 * (less_eq - less)) / finite_before
        if np.isfinite(v):
            past = np.insert(past, np.searchsorted(past, v), v)
            finite_before += 1
    return out


def check_weights(weights: Mapping[str, float]) -> None:
    missing = [name for name in FACTORS if name not in weights or weights[name] is None]
    if missing:
        raise ValueError(f"weights are pending for: {', '.join(missing)}")
    values = np.array([weights[name] for name in FACTORS], dtype="float64")
    if (values < 0).any() or (values > 1).any() or not np.isclose(values.sum(), 1.0, atol=1e-9):
        raise ValueError("weights lie in 0..1 and sum to 1")


def alert_index(indicators: Mapping[str, np.ndarray | float | None], weights: Mapping[str, float]) -> np.ndarray:
    """W = sum w_i x_i. NaN wherever any indicator is missing: weights are never re-normalised over the indicators
    that happen to exist, because that would silently change the weights (class A)."""
    check_weights(weights)
    total = None
    for name in FACTORS:
        value = indicators.get(name)
        x = np.asarray(np.nan if value is None else value, dtype="float64")
        if np.any((x < 0) | (x > 1)):
            raise ValueError(f"indicator {name} must be normalised to 0..1")
        term = weights[name] * x
        total = term if total is None else total + term
    return np.asarray(total)


def factor_shares(indicators: Mapping[str, float | None], weights: Mapping[str, float]) -> dict[str, float] | None:
    """Share of W of each factor, w_i x_i / W, for one unit and time. None when W is missing or zero."""
    check_weights(weights)
    terms = {}
    for name in FACTORS:
        value = indicators.get(name)
        if value is None or not np.isfinite(value):
            return None
        terms[name] = weights[name] * float(value)
    w = sum(terms.values())
    if w <= 0:
        return None
    return {name: term / w for name, term in terms.items()}


def top_factors(shares: Mapping[str, float] | None, k: int = 2) -> list[dict]:
    """The k largest shares as [{name, share}], largest first; ties broken by the SPEC order of the factors."""
    if not shares:
        return []
    order = sorted(FACTORS, key=lambda name: (-shares[name], FACTORS.index(name)))
    return [{"name": name, "share": shares[name]} for name in order[:k]]


def confidence_for_data_level(data_level: int) -> int:
    """Confidence badge 0..3 = the farm's data level (docs/spec/04, Data modes: Low, Medium-low, Medium, High)."""
    if data_level not in (0, 1, 2, 3):
        raise ValueError("data level is 0..3")
    return int(data_level)
