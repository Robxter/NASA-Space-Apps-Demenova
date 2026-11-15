"""Side indicators (methods 8-10) and verification counts (method 14)."""

import datetime as dt

import numpy as np
import pytest

from pipeline.engine import side, verification as v


def test_leaf_wetness_hours():
    rh = np.array([95.0] * 6 + [89.9] * 10 + [90.0] * 8)
    assert side.leaf_wetness_hours(rh, 0.90) == 14
    assert side.leaf_wetness_hours(rh[:23], 0.90) is None
    assert side.leaf_wetness_hours(np.r_[rh[:23], np.nan], 0.90) is None


def test_sigatoka_three_day_rule():
    t = np.array([24, 24, 24, 24, 22, 24, 24, 24.0])
    rh = np.array([0.8] * 8)
    rain = np.array([1, 1, 1, 1, 1, 1, 0, 1.0])
    fav = side.sigatoka_favourable(t, rh, rain, 23, 0.75)
    assert list(fav) == [1, 1, 1, 1, 0, 1, 0, 1]
    assert side.sigatoka_level(fav, 3) == ["normal", "normal", "watch", "watch", "normal", "normal", "normal", "normal"]


def test_sigatoka_missing_day_is_missing_and_restarts():
    fav = side.sigatoka_favourable(np.array([24, np.nan, 24, 24, 24.0]), np.full(5, 0.8), np.ones(5), 23, 0.75)
    assert side.sigatoka_level(fav, 3) == ["normal", None, "normal", "normal", "watch"]


def test_heat_units_hand_case():
    assert np.allclose(side.heat_units(np.array([24.0, 13.0]), 14), [10.0, -1.0])


def test_cold_level_against_same_day_climatology():
    dates = [dt.date(y, 2, 20) for y in (2020, 2021, 2022)]
    sums = np.array([70.0, 80.0, 74.0])
    assert side.cold_level(dates, sums, min_years=2) == [None, None, "watch"]  # 74 < mean(70, 80) = 75
    assert side.cold_level(dates, np.array([70.0, 80.0, 76.0]), min_years=2)[2] == "normal"


def _d(day):
    return dt.date(2026, 2, day)


def test_verification_counts_hit_miss_false_alarm():
    dates = [_d(i) for i in range(15, 29)]
    levels = {"lot_a_1": ["normal"] * 14, "lot_a_2": ["normal"] * 14}
    levels["lot_a_1"][7] = "severe"  # 22 Feb
    levels["lot_a_2"][2] = "severe"  # 17 Feb: no flood -> false alarm
    levels["lot_a_2"][3] = "severe"  # 18 Feb: same episode
    floods = [v.Flood("f1", _d(22), _d(23)), v.Flood("f2", _d(26), _d(26))]
    outcomes, counts = v.verify(floods, levels, dates, frozenset({"severe"}), 1, 1)
    assert counts == {"hits": 1, "misses": 1, "false_alarms": 1}
    assert [o.outcome for o in outcomes] == ["hit", "miss", "false_alarm"]
    assert outcomes[0].unit_ids == ["lot_a_1"]
    assert v.scores(**counts) == {"pod": 0.5, "far": 0.5, "csi": pytest.approx(1 / 3)}


def test_verification_lead_day_counts_and_out_of_period_flood_is_ignored():
    dates = [_d(i) for i in range(15, 20)]
    levels = {"u": ["normal", "normal", "severe", "normal", "normal"]}  # 17 Feb
    outcomes, counts = v.verify([v.Flood("f", _d(18), _d(18)), v.Flood("old", dt.date(2025, 1, 1), dt.date(2025, 1, 2))],
                                levels, dates, frozenset({"severe"}), 1, 1)
    assert counts == {"hits": 1, "misses": 0, "false_alarms": 0}


def test_scores_with_zero_denominators_are_none():
    assert v.scores(0, 0, 0) == {"pod": None, "far": None, "csi": None}


def test_episodes_split_on_gaps():
    assert v.episodes([_d(1), _d(2), _d(4)]) == [(_d(1), _d(2)), (_d(4), _d(4))]
