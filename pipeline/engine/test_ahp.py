"""AHP on Saaty's published example (docs/spec/09 method 13); module unused in v1 (D-024)."""

import numpy as np
import pytest

from pipeline.engine import ahp as ix

# Saaty (1990), EJOR 48: 9-26, Table 2 (house example, level 1), read from the scanned paper on 2026-11-14.
SAATY_TABLE_2 = [
    [1, 5, 3, 7, 6, 6, 1 / 3, 1 / 4],
    [1 / 5, 1, 1 / 3, 5, 3, 3, 1 / 5, 1 / 7],
    [1 / 3, 3, 1, 6, 3, 4, 6, 1 / 5],
    [1 / 7, 1 / 5, 1 / 6, 1, 1 / 3, 1 / 4, 1 / 7, 1 / 8],
    [1 / 6, 1 / 3, 1 / 3, 3, 1, 1 / 2, 1 / 5, 1 / 6],
    [1 / 6, 1 / 3, 1 / 4, 4, 2, 1, 1 / 5, 1 / 6],
    [3, 5, 1 / 6, 7, 5, 5, 1, 1 / 2],
    [4, 7, 5, 8, 6, 6, 2, 1],
]
SAATY_TABLE_2_PRIORITIES = [0.173, 0.054, 0.188, 0.018, 0.031, 0.036, 0.167, 0.333]
# Saaty (1990) Table 3, "Yard space": priorities 0.674, 0.101, 0.226; lambda_max 3.086, CI 0.043, CR 0.074.
SAATY_YARD = [[1, 5, 4], [1 / 5, 1, 1 / 3], [1 / 4, 3, 1]]


def test_ahp_saaty_table_2_eigenvector_and_rejection():
    weights, ci, cr = ix.ahp_weights(SAATY_TABLE_2, require_consistent=False)
    assert np.allclose(weights, SAATY_TABLE_2_PRIORITIES, atol=0.002)
    assert ci == pytest.approx(0.238, abs=0.001)
    assert cr == pytest.approx(0.169, abs=0.001)
    with pytest.raises(ix.InconsistentJudgmentsError):
        ix.ahp_weights(SAATY_TABLE_2)


def test_ahp_saaty_table_3_yard_space_is_accepted():
    weights, ci, cr = ix.ahp_weights(SAATY_YARD)
    assert np.allclose(weights, [0.674, 0.101, 0.226], atol=0.002)
    assert ci == pytest.approx(0.043, abs=0.001)
    assert cr == pytest.approx(0.074, abs=0.001)


def test_ahp_consistent_matrix_has_zero_ci():
    w = np.array([0.5, 0.3, 0.2])
    weights, ci, cr = ix.ahp_weights(w[:, None] / w[None, :])
    assert np.allclose(weights, w) and ci == pytest.approx(0, abs=1e-9) and cr == pytest.approx(0, abs=1e-9)


def test_ahp_refuses_bad_matrices_and_unsourced_random_index():
    with pytest.raises(ValueError):
        ix.ahp_weights([[1, 2], [2, 1]])  # not reciprocal
    with pytest.raises(ValueError):
        ix.ahp_weights([[1, -1], [-1, 1]])
    with pytest.raises(ValueError, match="T-047"):
        ix.ahp_weights(np.ones((5, 5)))  # RI for n = 5 not yet sourced
