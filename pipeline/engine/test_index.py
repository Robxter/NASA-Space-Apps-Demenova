"""Alert index W, percentiles, factor shares, confidence and AHP (docs/spec/09 method 13, docs/spec/12)."""

import numpy as np
import pytest

from pipeline.engine import index as ix

SPEC_WEIGHTS = {"upstream": 0.35, "saturation": 0.25, "terrain": 0.20, "local": 0.10, "balance": 0.10}


def test_percentile_hand_case_mid_rank_and_no_look_ahead():
    p = ix.percentile_against_history(np.array([1.0, 2.0, 3.0, 2.0, 0.0, 9.0]), min_history=3)
    # t=3: past {1,2,3}, v=2 -> (1 + 0.5*1)/3 = 0.5; t=4: v=0 -> 0; t=5: v=9 -> 1
    assert np.isnan(p[:3]).all()
    assert p[3] == pytest.approx(0.5) and p[4] == 0.0 and p[5] == 1.0


def test_percentile_skips_missing_values():
    p = ix.percentile_against_history(np.array([1.0, np.nan, 2.0, 3.0, np.nan]), min_history=2)
    assert np.isnan(p[2]) and p[3] == 1.0 and np.isnan(p[4])


def test_percentile_of_dry_day_among_dry_days_is_not_wet():
    p = ix.percentile_against_history(np.array([0.0, 0.0, 0.0, 10.0, 0.0]), min_history=4)
    assert p[4] == pytest.approx((0 + 0.5 * 3) / 4)


def test_w_hand_case_with_spec_weights():
    x = {"upstream": 1.0, "saturation": 0.8, "terrain": 0.5, "local": 0.0, "balance": 1.0}
    # 0.35 + 0.20 + 0.10 + 0 + 0.10 = 0.75
    assert float(ix.alert_index(x, SPEC_WEIGHTS)) == pytest.approx(0.75)


def test_w_is_missing_when_any_indicator_is_missing():
    x = {"upstream": np.array([1.0, 1.0]), "saturation": np.array([1.0, np.nan]), "terrain": 1.0, "local": 1.0, "balance": 1.0}
    w = ix.alert_index(x, SPEC_WEIGHTS)
    assert w[0] == pytest.approx(1.0) and np.isnan(w[1])


def test_w_rejects_pending_or_bad_weights_and_unnormalised_indicators():
    x = {name: 0.5 for name in ix.FACTORS}
    with pytest.raises(ValueError):
        ix.alert_index(x, {**SPEC_WEIGHTS, "local": None})
    with pytest.raises(ValueError):
        ix.alert_index(x, {**SPEC_WEIGHTS, "local": 0.2})
    with pytest.raises(ValueError):
        ix.alert_index({**x, "upstream": 1.5}, SPEC_WEIGHTS)


def test_factor_shares_and_top_two():
    x = {"upstream": 1.0, "saturation": 0.8, "terrain": 0.5, "local": 0.0, "balance": 1.0}
    shares = ix.factor_shares(x, SPEC_WEIGHTS)
    assert sum(shares.values()) == pytest.approx(1.0)
    assert shares["upstream"] == pytest.approx(0.35 / 0.75)
    top = ix.top_factors(shares)
    assert [f["name"] for f in top] == ["upstream", "saturation"]
    assert top[1]["share"] == pytest.approx(0.20 / 0.75)
    assert ix.factor_shares({**x, "local": None}, SPEC_WEIGHTS) is None
    assert ix.top_factors(None) == []


def test_confidence_follows_the_data_level():
    assert [ix.confidence_for_data_level(level) for level in (0, 1, 2, 3)] == [0, 1, 2, 3]
    with pytest.raises(ValueError):
        ix.confidence_for_data_level(4)
