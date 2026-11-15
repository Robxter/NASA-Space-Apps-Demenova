"""T-024 forecast verification (docs/spec/09, method 14; NCAR DTC MET User's Guide, appendix C). Owner: data-scientist.

Counts first: hits, misses, false alarms. POD = hits / (hits + misses); FAR = false alarms / (hits + false alarms);
CSI = hits / (hits + misses + false alarms); a ratio with a zero denominator is None. With a handful of events the
ratios are not skill estimates; reports quote the counts.

Matching (design, config/alerts.yaml `verification`): a documented flood [start, end] (local calendar dates) is a hit
when any unit is at the alert level on a data day inside [start - days_before, end + days_after]; otherwise a miss.
Every alert episode (consecutive days with at least one unit at the alert level) that touches no flood window is one
false alarm. A false alarm here means "no documented flood", not "no flood".
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Mapping, Sequence


@dataclass(frozen=True)
class Flood:
    id: str
    start: dt.date
    end: dt.date
    kind: str = "documented_flood"
    description: str | None = None
    sources: tuple[dict, ...] = ()


@dataclass
class Outcome:
    flood_or_episode_id: str
    kind: str
    start: dt.date
    end: dt.date
    outcome: str
    unit_ids: list[str] = field(default_factory=list)
    description: str | None = None
    sources: list[dict] = field(default_factory=list)


def ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def scores(hits: int, misses: int, false_alarms: int) -> dict[str, float | None]:
    return {
        "pod": ratio(hits, hits + misses),
        "far": ratio(false_alarms, hits + false_alarms),
        "csi": ratio(hits, hits + misses + false_alarms),
    }


def alert_days(levels: Mapping[str, Sequence[str]], dates: Sequence[dt.date], alert_levels: frozenset[str]) -> dict[dt.date, list[str]]:
    """{date: units at an alert level that day} for the days with at least one such unit."""
    out: dict[dt.date, list[str]] = {}
    for unit, series in levels.items():
        for d, level in zip(dates, series):
            if level in alert_levels:
                out.setdefault(d, []).append(unit)
    return {d: sorted(units) for d, units in sorted(out.items())}


def episodes(days: Sequence[dt.date]) -> list[tuple[dt.date, dt.date]]:
    """Runs of consecutive dates."""
    runs: list[tuple[dt.date, dt.date]] = []
    for d in sorted(days):
        if runs and d - runs[-1][1] == dt.timedelta(days=1):
            runs[-1] = (runs[-1][0], d)
        else:
            runs.append((d, d))
    return runs


def verify(
    floods: Sequence[Flood],
    levels: Mapping[str, Sequence[str]],
    dates: Sequence[dt.date],
    alert_levels: frozenset[str],
    days_before: int,
    days_after: int,
) -> tuple[list[Outcome], dict[str, int]]:
    """Outcomes for every flood and every unmatched alert episode within `dates`, plus the counts."""
    if days_before < 0 or days_after < 0:
        raise ValueError("matching windows are non-negative")
    alerts = alert_days(levels, dates, alert_levels)
    first, last = min(dates), max(dates)
    windows = []
    outcomes: list[Outcome] = []
    for flood in floods:
        lo = flood.start - dt.timedelta(days=days_before)
        hi = flood.end + dt.timedelta(days=days_after)
        if hi < first or lo > last:
            continue  # outside the verified period: neither hit nor miss
        windows.append((lo, hi))
        units = sorted({u for d, us in alerts.items() if lo <= d <= hi for u in us})
        outcomes.append(Outcome(flood.id, flood.kind, flood.start, flood.end, "hit" if units else "miss", units,
                                flood.description, list(flood.sources)))
    for k, (s, e) in enumerate(episodes(list(alerts)), start=1):
        if any(not (e < lo or s > hi) for lo, hi in windows):
            continue
        units = sorted({u for d, us in alerts.items() if s <= d <= e for u in us})
        outcomes.append(Outcome(f"alert-episode-{s.isoformat()}", "alert_without_flood", s, e, "false_alarm", units,
                                "Alert episode with no documented flood in its window (not proof that no flood happened).", []))
    counts = {
        "hits": sum(o.outcome == "hit" for o in outcomes),
        "misses": sum(o.outcome == "miss" for o in outcomes),
        "false_alarms": sum(o.outcome == "false_alarm" for o in outcomes),
    }
    return outcomes, counts
