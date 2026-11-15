"""Analytic hierarchy process (docs/spec/09 method 13). Owner: data-scientist.

UNUSED in v1 (D-024): no expert pairwise matrix exists, so the alert weights are the SPEC starting weights with
origin `design` and their stability is checked by sensitivity.py (T-024b) instead. Kept, tested on Saaty's published
example, as the path for a future local agronomist: give `ahp_weights` a reciprocal matrix of the five signals
(upstream, saturation, terrain, local, balance) and accept the weights only when CR <= 0.10. Using it needs the random
index for n = 5 from an opened source first (see RANDOM_INDEX below); changing weights stays class A.
"""

from __future__ import annotations

from typing import Sequence

import numpy as np

# --------------------------------------------------------------------------------------------------------
# Method 13: analytic hierarchy process (Saaty 1990, EJOR 48: 9-26). Principal eigenvector, CI = (lmax - n)/(n - 1),
# CR = CI / RI, accepted when CR <= 0.10 ("about 10% or less", p. 13).
# --------------------------------------------------------------------------------------------------------

# Random consistency index by matrix order, only where an opened source gives it. Saaty (1990) prints CI and CR for
# its examples: Table 3 (n = 3) gives CI/CR = 0.043/0.074, 0.068/0.117, 0.032/0.056 -> RI 0.58; Table 2 (n = 8)
# gives CI 0.238, CR 0.169 -> RI 1.41. Orders 1 and 2 are always consistent (CI = 0). Every other order is pending
# until a source with Saaty's full RI table is opened (T-047); n = 5 (the five alert signals) needs it.
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
        raise ValueError(f"no sourced random index for n = {n} (T-047)")
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
