"""T-023 alert index W, factor shares, confidence badge and AHP weights. Owner: data-scientist.

W_unit,t = sum_i w_i x_i,unit,t with sum_i w_i = 1 (docs/spec/12). The five indicators x are normalised to 0..1:
percentile against the unit's own history (upstream, saturation, local, balance) and rank within the farm
(terrain). Weights: SPEC starting weights (estimated) until Tyson's AHP matrix (method 13) is accepted.
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


# --------------------------------------------------------------------------------------------------------
# Method 13: analytic hierarchy process (Saaty 1990, EJOR 48: 9-26). Principal eigenvector, CI = (lmax - n)/(n - 1),
# CR = CI / RI, accepted when CR <= 0.10 ("about 10% or less", p. 13).
# --------------------------------------------------------------------------------------------------------

# Random consistency index by matrix order, only where an opened source gives it. Saaty (1990) prints CI and CR for
# its examples: Table 3 (n = 3) gives CI/CR = 0.043/0.074, 0.068/0.117, 0.032/0.056 -> RI 0.58; Table 2 (n = 8)
# gives CI 0.238, CR 0.169 -> RI 1.41. Orders 1 and 2 are always consistent (CI = 0). Every other order is pending
# until a source with Saaty's full RI table is opened (PENDING.md P-013); n = 5 (the five alert signals) needs it.
RANDOM_INDEX: dict[int, float | None] = {1: 0.0, 2: 0.0, 3: 0.58, 4: None, 5: None, 6: None, 7: None, 8: 1.41, 9: None, 10: None}
CR_LIMIT = 0.10


class InconsistentJudgmentsError(ValueError):
    """CR above 0.10: Saaty's rule is to revise the judgments, not to use the weights."""


def ahp_weights(matrix: Sequence[Sequence[float]], *, require_consistent: bool = True) -> tuple[np.ndarray, float, float]:
    """(weights, CI, CR) of a positive reciprocal pairwise matrix by its principal eigenvector.

    Raises ValueError for a matrix that is not square, positive and reciprocal, or whose order has no sourced RI;
    raises InconsistentJudgmentsError when CR > 0.10 and require_consistent is True.
    """
    a = np.asarray(matrix, dtype="float64")
    if a.ndim != 2 or a.shape[0] != a.shape[1] or a.shape[0] < 1:
        raise ValueError("the pairwise matrix is square")
    n = a.shape[0]
    if not np.isfinite(a).all() or (a <= 0).any():
        raise ValueError("pairwise judgments are positive numbers")
    if not np.allclose(a * a.T, 1.0, rtol=1e-6, atol=1e-9):
        raise ValueError("the matrix is reciprocal: a_ji = 1 / a_ij")
    ri = RANDOM_INDEX.get(n)
    if ri is None:
        raise ValueError(f"no sourced random index for n = {n} (PENDING.md P-013)")
    eigvals, eigvecs = np.linalg.eig(a)
    i = int(np.argmax(eigvals.real))
    lam = float(eigvals[i].real)
    vec = np.abs(eigvecs[:, i].real)
    weights = vec / vec.sum()
    ci = (lam - n) / (n - 1) if n > 2 else 0.0
    cr = ci / ri if ri > 0 else 0.0
    if require_consistent and cr > CR_LIMIT:
        raise InconsistentJudgmentsError(f"CR = {cr:.3f} > {CR_LIMIT}: revise the judgments")
    return weights, float(ci), float(cr)
