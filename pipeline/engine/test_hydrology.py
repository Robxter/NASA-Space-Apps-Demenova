"""Hydrology formulas against hand-computed cases and FAO-56 Example 18 (docs/spec/09 methods 3-7)."""

import math

import numpy as np
import pytest

from pipeline.engine import hydrology as h


# --- Method 3: Curve Number -------------------------------------------------------------------------------

def test_potential_retention_by_hand():
    # S = 25400 / 80 - 254 = 63.5 mm
    assert h.potential_retention_mm(80) == pytest.approx(63.5)


def test_cn_runoff_hand_case():
    # CN 80: S = 63.5, Ia = 12.7; P = 100: Q = 87.3^2 / (87.3 + 63.5) = 7621.29 / 150.8 = 50.539 mm
    assert float(h.scs_cn_runoff_mm(100.0, 80)) == pytest.approx(50.539, abs=1e-3)


def test_cn_runoff_is_zero_up_to_initial_abstraction_and_keeps_missing():
    q = h.scs_cn_runoff_mm(np.array([0.0, 12.7, 12.69, np.nan]), 80)
    assert q[0] == 0 and q[1] == 0 and q[2] == 0
    assert np.isnan(q[3])


def test_cn_runoff_never_exceeds_rain_and_cn_100_gives_all_rain():
    p = np.array([5.0, 50.0, 200.0])
    assert np.all(h.scs_cn_runoff_mm(p, 70) <= p)
    assert np.allclose(h.scs_cn_runoff_mm(p, 100), p)


def test_curve_number_out_of_range_raises():
    with pytest.raises(ValueError):
        h.potential_retention_mm(0)
    with pytest.raises(ValueError):
        h.potential_retention_mm(101)


# --- Method 4: Kirpich and lag ----------------------------------------------------------------------------

def test_kirpich_hand_case():
    # L = 1000 m, S = 0.01: 0.0195 * 1000^0.77 * 0.01^-0.385 = 0.0195 * 204.17 * 5.8884 = 23.44 min
    expected = 0.0195 * 1000**0.77 * 0.01**-0.385
    assert expected == pytest.approx(23.44, abs=0.01)
    assert h.kirpich_tc_minutes(1000, 0.01) == pytest.approx(expected)


def test_kirpich_demo_catchment_value_recorded_in_config():
    # config/alerts.yaml kirpich: L 47995 m, S 0.04888 -> 250.7 min (4.18 h)
    assert h.kirpich_tc_minutes(47995, 0.04888) == pytest.approx(250.7, abs=0.1)


def test_kirpich_rejects_non_positive_inputs():
    with pytest.raises(ValueError):
        h.kirpich_tc_minutes(0, 0.1)
    with pytest.raises(ValueError):
        h.kirpich_tc_minutes(100, 0)


def test_lag_calibration_on_a_fixture_event():
    # rain 10 mm at t = 0 h and 30 mm at t = 4 h: centroid = (0*10 + 4*30) / 40 = 3 h; overflow seen at 9 h -> lag 6 h
    assert h.calibrate_lag_hours([0, 4], [10, 30], 9.0) == pytest.approx(6.0)


@pytest.mark.parametrize("times, rain", [([], []), ([0, 1], [0, 0]), ([0, 1], [1, np.nan])])
def test_lag_calibration_refuses_undefined_events(times, rain):
    with pytest.raises(ValueError):
        h.calibrate_lag_hours(times, rain, 5.0)


def test_lag_days_rounds_hours_to_whole_days():
    assert h.lag_days(4.18) == 0
    assert h.lag_days(13) == 1
    with pytest.raises(ValueError):
        h.lag_days(None)


# --- Method 5: API -----------------------------------------------------------------------------------------

def test_api_hand_case():
    # k = 0.9: API = 10, 0 + 9 = 9, 5 + 8.1 = 13.1
    assert np.allclose(h.antecedent_precipitation_index(np.array([10.0, 0.0, 5.0]), 0.9), [10.0, 9.0, 13.1])


def test_api_missing_day_is_never_bridged():
    api = h.antecedent_precipitation_index(np.array([10.0, np.nan, 5.0]), 0.9)
    assert api[0] == 10.0 and np.isnan(api[1]) and np.isnan(api[2])


def test_api_k_out_of_range():
    with pytest.raises(ValueError):
        h.antecedent_precipitation_index(np.array([1.0]), 1.0)


# --- Method 6: FAO-56 --------------------------------------------------------------------------------------

def test_fao56_pressure_and_gamma_example_18():
    p = h.atmospheric_pressure_kpa(100)
    assert p == pytest.approx(100.1, abs=0.05)
    assert h.psychrometric_constant(p) == pytest.approx(0.0666, abs=1e-4)


def test_fao56_vapour_pressures_example_18():
    assert float(h.sat_vapour_pressure(21.5)) == pytest.approx(2.564, abs=1e-3)
    assert float(h.sat_vapour_pressure(12.3)) == pytest.approx(1.431, abs=1e-3)
    assert float(h.svp_slope(16.9)) == pytest.approx(0.122, abs=1e-3)


def test_fao56_extraterrestrial_radiation_example_18():
    # 6 July = day 187, latitude 50.80 N -> Ra 41.09 MJ m-2 day-1
    assert float(h.extraterrestrial_radiation(50.80, 187)) == pytest.approx(41.09, abs=0.05)


def test_fao56_eto_example_18():
    # FAO-56 Example 18 (Uccle, 6 July): Tmax 21.5, Tmin 12.3, ea 1.409 kPa, u2 2.078 m/s, Rs 22.07 MJ, z 100 m
    # -> ETo 3.9 mm/day (printed 2.81 + 1.07 = 3.88)
    eto = h.eto_fao56(np.array([21.5]), np.array([12.3]), np.array([1.409]), np.array([2.078]), np.array([22.07]), 50.80, np.array([187]), 100)
    assert float(eto[0]) == pytest.approx(3.88, abs=0.03)


def test_fao56_missing_input_gives_missing_eto():
    eto = h.eto_fao56(np.array([30.0, np.nan]), np.array([20.0, 20.0]), np.array([2.0, 2.0]), np.array([2.0, 2.0]),
                      np.array([15.0, 15.0]), -3.36, np.array([50, 51]), 20)
    assert np.isfinite(eto[0]) and np.isnan(eto[1])


def test_ea_from_rh_mean_hand_case():
    # eq. 19: 0.5 * (e0(30) + e0(20)) / 2 = 0.5 * (4.243 + 2.338) / 2 = 1.645 kPa
    assert float(h.ea_from_rh_mean(30.0, 20.0, 50.0)) == pytest.approx(1.645, abs=2e-3)


def test_crop_et():
    assert np.allclose(h.crop_et(1.10, np.array([4.0, np.nan]))[0], 4.4)


# --- Method 7: balance and 2-day rule ----------------------------------------------------------------------

def test_balance_with_and_without_drainage():
    assert np.allclose(h.daily_balance(np.array([10.0]), np.array([4.0]), None), [6.0])
    assert np.allclose(h.daily_balance(np.array([10.0]), np.array([4.0]), 3.0), [3.0])


def test_rolling_sum_needs_a_complete_window():
    s = h.rolling_sum(np.array([1.0, 2.0, 3.0, np.nan, 5.0, 6.0, 7.0]), 3)
    assert np.isnan(s[0]) and np.isnan(s[1]) and s[2] == 6.0
    assert np.isnan(s[3]) and np.isnan(s[4]) and np.isnan(s[5]) and s[6] == 18.0


def test_consecutive_positive_days():
    run = h.consecutive_positive_days(np.array([1.0, 2.0, -1.0, 3.0, np.nan, 4.0]))
    assert list(run[:4]) == [1, 2, 0, 1] and np.isnan(run[4]) and run[5] == 1


def test_floor_only_on_top_tercile_after_two_days():
    run = np.array([1.0, 2.0, 3.0, np.nan])
    assert list(h.floor_warning(run, "high", 2)) == [False, True, True, False]
    assert not h.floor_warning(run, "mid", 2).any()
    assert not h.floor_warning(run, None, 2).any()


def test_sources_are_named_in_the_module():
    text = (h.__doc__ or "") + open(h.__file__, encoding="utf-8").read()
    for name in ("NEH Part 630", "Kirpich (1940)", "Kohler & Linsley 1951", "FAO-56", "Example 18"):
        assert name in text
    assert math.isclose(h.ALBEDO_GRASS, 0.23)
