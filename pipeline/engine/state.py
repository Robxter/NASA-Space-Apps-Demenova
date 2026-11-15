"""T-023 per-unit alert state machine (docs/spec/16-backend-state-machine.md). Owner: data-scientist.

Transitions, one evaluation per data update:

| From    | To      | Condition                                        |
| Normal  | Watch   | W >= up.watch                                    |
| Watch   | Warning | W >= up.warning                                  |
| Warning | Severe  | W >= up.severe on `severe_confirmations` consecutive updates (two-update rule) |
| Severe  | Warning | W < down.severe                                  |
| Warning | Watch   | W < down.warning                                 |
| Watch   | Normal  | W < down.watch                                   |
| any     | Stale   | newest rain data older than `stale_after_hours`  |
| Stale   | level recomputed from W (fresh data); Severe still needs its confirmations, else Warning |

Interpretation choices (design, recorded in config/alerts.yaml and the run report):
- One level per update in both directions (the diagram draws only adjacent arrows).
- `confirmations` counts consecutive updates with W >= up.severe, whatever the level, capped at the rule's count;
  an update counts only when its newest rain data is newer than the data behind the previous confirmation, so an
  hourly re-run that re-scores the same daily rain estimate cannot confirm Severe on its own (review T-025 M5);
  it resets when W falls below up.severe, W is missing, or the data go stale.
- An update whose W is missing (an indicator has no data) leaves the level unchanged and resets confirmations.
- The agronomic floor (2-day rule) lifts the level to at least Warning after the W step; it may skip levels because
  it is a separate rule on top of W (docs/spec/12), and the event records it.
- Stale never sends email; only an escalation into Severe is email-worthy.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, replace

LEVELS = ("normal", "watch", "warning", "severe")
STALE = "stale"


@dataclass(frozen=True)
class StateParams:
    up_watch: float
    up_warning: float
    up_severe: float
    down_watch: float
    down_warning: float
    down_severe: float
    severe_confirmations: int
    stale_after_hours: float

    def __post_init__(self) -> None:
        if not (self.up_watch < self.up_warning < self.up_severe):
            raise ValueError("escalation thresholds rise from watch to severe")
        for down, up in ((self.down_watch, self.up_watch), (self.down_warning, self.up_warning), (self.down_severe, self.up_severe)):
            if not down < up:
                raise ValueError("each de-escalation threshold lies below its escalation threshold")
        if self.severe_confirmations < 1 or self.stale_after_hours <= 0:
            raise ValueError("confirmations >= 1 and stale age > 0")


@dataclass(frozen=True)
class UnitState:
    level: str
    since: dt.datetime
    confirmations: int = 0
    confirmed_rain_at: dt.datetime | None = None  # newest rain data behind the last counted confirmation


@dataclass(frozen=True)
class Transition:
    from_level: str
    to_level: str
    at: dt.datetime
    reason: str  # "w", "floor", "stale", "fresh"
    email: bool


def initial_state(at: dt.datetime) -> UnitState:
    return UnitState(level="normal", since=at, confirmations=0)


def _recomputed_level(w: float, confirmations: int, p: StateParams) -> str:
    if w >= p.up_severe:
        return "severe" if confirmations >= p.severe_confirmations else "warning"
    if w >= p.up_warning:
        return "warning"
    if w >= p.up_watch:
        return "watch"
    return "normal"


def _w_step(level: str, w: float, confirmations: int, p: StateParams) -> str:
    if level == "normal":
        return "watch" if w >= p.up_watch else "normal"
    if level == "watch":
        if w >= p.up_warning:
            return "warning"
        return "normal" if w < p.down_watch else "watch"
    if level == "warning":
        if w >= p.up_severe and confirmations >= p.severe_confirmations:
            return "severe"
        return "watch" if w < p.down_warning else "warning"
    if level == "severe":
        return "warning" if w < p.down_severe else "severe"
    raise ValueError(f"unknown level {level}")


def is_stale(now: dt.datetime, newest_rain_at: dt.datetime | None, p: StateParams) -> bool:
    if newest_rain_at is None:
        return True
    return (now - newest_rain_at).total_seconds() > p.stale_after_hours * 3600


def step(
    state: UnitState,
    w: float | None,
    now: dt.datetime,
    newest_rain_at: dt.datetime | None,
    p: StateParams,
    floor_warning: bool = False,
) -> tuple[UnitState, Transition | None]:
    """One update of one unit. Returns the new state and the transition, if the level changed."""
    if is_stale(now, newest_rain_at, p):
        if state.level == STALE:
            return replace(state, confirmations=0, confirmed_rain_at=None), None
        new = UnitState(level=STALE, since=now, confirmations=0)
        return new, Transition(state.level, STALE, now, "stale", email=False)

    if w is None or w != w:  # missing W: hold the level
        return replace(state, confirmations=0, confirmed_rain_at=None), None

    if w >= p.up_severe:
        advanced = state.confirmed_rain_at is None or newest_rain_at > state.confirmed_rain_at
        confirmations = min(state.confirmations + 1, p.severe_confirmations) if advanced else state.confirmations
        confirmed_at = newest_rain_at if advanced else state.confirmed_rain_at
    else:
        confirmations, confirmed_at = 0, None
    if state.level == STALE:
        level, reason = _recomputed_level(w, confirmations, p), "fresh"
    else:
        level, reason = _w_step(state.level, w, confirmations, p), "w"
    if floor_warning and LEVELS.index(level) < LEVELS.index("warning"):
        level, reason = "warning", "floor"
    if level == state.level:
        return replace(state, confirmations=confirmations, confirmed_rain_at=confirmed_at), None
    new = UnitState(level=level, since=now, confirmations=confirmations, confirmed_rain_at=confirmed_at)
    email = level == "severe"
    return new, Transition(state.level, level, now, reason, email=email)


def run(
    ws: list[float | None],
    times: list[dt.datetime],
    newest_rain: list[dt.datetime | None],
    p: StateParams,
    floors: list[bool] | None = None,
    start: UnitState | None = None,
) -> tuple[list[UnitState], list[Transition]]:
    """Apply `step` over a sequence of updates; returns the state after each update and all transitions."""
    if not (len(ws) == len(times) == len(newest_rain)):
        raise ValueError("aligned sequences required")
    floors = floors or [False] * len(ws)
    state = start or initial_state(times[0])
    states, events = [], []
    for w, now, rain_at, fl in zip(ws, times, newest_rain, floors):
        state, ev = step(state, w, now, rain_at, p, fl)
        states.append(state)
        if ev is not None:
            events.append(ev)
    return states, events
