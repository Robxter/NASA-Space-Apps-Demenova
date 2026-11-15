"""State machine: transition table, hysteresis, two-update rule, Stale, floor (docs/spec/16)."""

import datetime as dt

import pytest

from pipeline.engine import state as s

P = s.StateParams(0.40, 0.60, 0.80, 0.30, 0.50, 0.70, severe_confirmations=2, stale_after_hours=12)
T0 = dt.datetime(2026, 2, 15, tzinfo=dt.timezone.utc)


def at(i: int) -> dt.datetime:
    return T0 + dt.timedelta(days=i)


def levels(ws, floors=None, start_level="normal", stale_at=()):
    times = [at(i) for i in range(len(ws))]
    rain = [None if i in stale_at else times[i] for i in range(len(ws))]
    states, events = s.run(ws, times, rain, P, floors, s.UnitState(start_level, T0))
    return [st.level for st in states], events


@pytest.mark.parametrize(
    "start, w, expected",
    [
        ("normal", 0.39, "normal"), ("normal", 0.40, "watch"), ("normal", 0.95, "watch"),
        ("watch", 0.59, "watch"), ("watch", 0.60, "warning"), ("watch", 0.30, "watch"), ("watch", 0.29, "normal"),
        ("warning", 0.79, "warning"), ("warning", 0.50, "warning"), ("warning", 0.49, "watch"),
        ("severe", 0.70, "severe"), ("severe", 0.69, "warning"), ("severe", 0.10, "warning"),
    ],
)
def test_transition_table(start, w, expected):
    assert levels([w], start_level=start)[0] == [expected]


def test_one_level_at_a_time_and_severe_needs_two_updates():
    lv, events = levels([0.9, 0.9, 0.9, 0.9])
    assert lv == ["watch", "warning", "severe", "severe"]
    assert [e.email for e in events] == [False, False, True]


def test_single_high_update_at_warning_does_not_reach_severe():
    lv, _ = levels([0.85, 0.75, 0.85, 0.85], start_level="warning")
    assert lv == ["warning", "warning", "warning", "severe"]


def test_hysteresis_holds_level_inside_the_gap():
    lv, _ = levels([0.65, 0.55, 0.52, 0.49, 0.35, 0.31, 0.29], start_level="warning")
    assert lv == ["warning", "warning", "warning", "watch", "watch", "watch", "normal"]


def test_de_escalation_is_one_level_per_update():
    lv, _ = levels([0.0, 0.0, 0.0], start_level="severe")
    assert lv == ["warning", "watch", "normal"]


def test_stale_from_any_state_never_emails_and_fresh_data_recomputes():
    lv, events = levels([0.9, 0.9, 0.9, 0.65, 0.9, 0.9], start_level="warning", stale_at={1})
    assert lv[1] == "stale"
    assert events[0].to_level == "stale" and not events[0].email
    # back from Stale with W 0.9 and one confirmation -> recomputed as Warning (Severe needs two)
    assert lv[2] == "warning" and lv[3] == "warning" and lv[4] == "warning" and lv[5] == "severe"


def test_stale_age_boundary():
    newest = T0
    assert not s.is_stale(T0 + dt.timedelta(hours=12), newest, P)
    assert s.is_stale(T0 + dt.timedelta(hours=12, seconds=1), newest, P)
    assert s.is_stale(T0, None, P)


def test_missing_w_holds_the_level_and_resets_confirmations():
    lv, _ = levels([0.85, None, 0.85, 0.85], start_level="warning")
    assert lv == ["warning", "warning", "warning", "severe"]


def test_floor_lifts_to_warning_and_hysteresis_takes_over():
    lv, events = levels([0.1, 0.1, 0.45, 0.45, 0.1], floors=[False, True, True, False, False])
    assert lv == ["normal", "warning", "warning", "watch", "normal"]
    assert events[0].reason == "floor"


def test_params_validation():
    with pytest.raises(ValueError):
        s.StateParams(0.4, 0.6, 0.8, 0.45, 0.5, 0.7, 2, 12)
    with pytest.raises(ValueError):
        s.StateParams(0.6, 0.4, 0.8, 0.3, 0.3, 0.7, 2, 12)


def test_rerun_on_the_same_rain_data_does_not_confirm_severe():
    # review T-025 M5: hourly re-runs re-score the same daily rain value; only new rain data counts
    rain_at = T0
    hours = [T0 + dt.timedelta(hours=h) for h in range(1, 5)]
    state = s.UnitState("warning", T0)
    for now in hours:
        state, _ = s.step(state, 0.95, now, rain_at, P)
    assert state.level == "warning" and state.confirmations == 1
    newer = rain_at + dt.timedelta(days=1)
    state, ev = s.step(state, 0.95, newer + dt.timedelta(hours=4), newer, P)
    assert state.level == "severe" and ev.email


def test_confirmations_reset_below_threshold_and_restart_on_new_data():
    state = s.UnitState("warning", T0)
    state, _ = s.step(state, 0.95, T0 + dt.timedelta(hours=4), T0, P)
    state, _ = s.step(state, 0.50, T0 + dt.timedelta(hours=5), T0, P)
    assert state.confirmations == 0 and state.confirmed_rain_at is None
    state, _ = s.step(state, 0.95, T0 + dt.timedelta(hours=6), T0, P)
    assert state.confirmations == 1
