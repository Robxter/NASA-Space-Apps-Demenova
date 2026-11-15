"""T-024b sensitivity helpers, run helpers, and the replay reproduced from committed files alone."""

import datetime as dt
import json
import re
from pathlib import Path

import numpy as np
import pytest

from pipeline.engine import run as R
from pipeline.engine import sensitivity as S

W = {"upstream": 0.35, "saturation": 0.25, "terrain": 0.20, "local": 0.10, "balance": 0.10}


def test_perturbed_weights_hand_case():
    # upstream +0.10 -> 0.45; the rest scaled by 0.55 / 0.65
    w = S.perturbed_weights(W, "upstream", 0.10)
    assert w["upstream"] == pytest.approx(0.45)
    assert w["saturation"] == pytest.approx(0.25 * 0.55 / 0.65)
    assert sum(w.values()) == pytest.approx(1.0)


def test_perturbed_weights_clip_at_zero_and_keep_ratios():
    w = S.perturbed_weights(W, "local", -0.10)
    assert w["local"] == 0.0 and sum(w.values()) == pytest.approx(1.0)
    assert w["upstream"] / w["saturation"] == pytest.approx(0.35 / 0.25)


def test_ten_variants_in_spec_order():
    v = S.variants(W, 0.10)
    assert [(name, round(d, 2)) for name, d, _ in v][:2] == [("upstream", 0.10), ("upstream", -0.10)]
    assert len(v) == 10 and all(sum(w.values()) == pytest.approx(1.0) for _, _, w in v)
    with pytest.raises(ValueError):
        S.perturbed_weights(W, "nope", 0.1)


def test_severe_days_and_compare():
    d = [dt.date(2026, 2, i) for i in (21, 22, 23)]
    base = S.severe_days({"a": ["severe", "severe", "warning"], "b": ["watch"] * 3}, d)
    assert base == {"a": d[:2]}
    same = S.compare(base, {"a": d[:2]})
    assert same["same_units"] and same["same_days"]
    diff = S.compare(base, {"a": d[1:], "b": d[:1]})
    assert diff == {"same_units": False, "same_days": False, "units_gained": ["b"], "units_lost": [], "units_with_shifted_days": ["a"]}


def test_demo_lot_ids_follow_the_contract():
    assert R.lot_number("lot_demo-el-oro_12") == 12
    for bad in ("lot_demo_el_oro_3", "lot_other_1"):
        with pytest.raises(ValueError):
            R.lot_number(bad)


def test_ulid_is_deterministic_valid_and_time_ordered():
    t1 = dt.datetime(2026, 2, 23, tzinfo=dt.timezone.utc)
    t2 = t1 + dt.timedelta(days=1)
    a, b = R.ulid_for(t1, "x"), R.ulid_for(t2, "x")
    assert a == R.ulid_for(t1, "x") and a != R.ulid_for(t1, "y")
    assert re.fullmatch(r"[0-9A-HJKMNP-TV-Z]{26}", a) and a[:10] < b[:10]


def test_ndvi_scene_validity():
    assert R.ndvi_scene_is_valid(np.array([-1.0, 0.2, 1.0, np.nan]))
    assert not R.ndvi_scene_is_valid(np.array([0.5, 1.4]))


def _strip(obj):
    if isinstance(obj, dict):
        return {k: _strip(v) for k, v in obj.items() if k not in ("provenance", "generated_at")}
    if isinstance(obj, list):
        return [_strip(v) for v in obj]
    return obj


@pytest.mark.skipif(not (R.DEMO / "manifest.json").exists(), reason="no committed snapshots yet")
def test_replay_snapshots_are_reproducible_from_committed_files(tmp_path, monkeypatch):
    monkeypatch.setattr(R, "DEMO", tmp_path)
    R.run_replay(json.loads((Path(R.REPO_ROOT) / "app/public/data/demo/manifest.json").read_text(encoding="utf-8"))["generated_at"])
    committed = Path(R.REPO_ROOT) / "app/public/data/demo"
    names = ["farm.json", "zones.geojson", "verification.json"] + [f"replay/{p.name}" for p in (committed / "replay").glob("*.json")] \
        + [f"history/{p.name}" for p in (committed / "history").glob("*.json")]
    n_days = (R.REPLAY[1] - R.REPLAY[0]).days + 1
    assert len(names) == 3 + n_days + 11
    for name in names:
        new = json.loads((tmp_path / name).read_text(encoding="utf-8"))
        old = json.loads((committed / name).read_text(encoding="utf-8"))
        assert _strip(new) == _strip(old), name


@pytest.mark.skipif(not (R.DEMO / "manifest.json").exists(), reason="no committed snapshots yet")
def test_snapshot_update_time_includes_latency_and_no_cold_level():
    # review T-025 M1 (4 h IMERG Early latency) and M4 (no cold-stress level without a sourced threshold)
    iso = lambda t: dt.datetime.fromisoformat(t.replace("Z", "+00:00"))  # noqa: E731
    for path in sorted((R.DEMO / "replay").glob("*.json")):
        day = json.loads(path.read_text(encoding="utf-8"))
        for unit in day["units"]:
            alert = unit["alert"]
            assert alert["side"]["cold"] is None
            if alert["newest_rain_data_at"]:
                assert iso(alert["updated_at"]) - iso(alert["newest_rain_data_at"]) == dt.timedelta(hours=4)
        for event in day["events"]:
            assert iso(event["at"]).hour == 4


@pytest.mark.skipif(not (R.DEMO / "manifest.json").exists(), reason="no committed snapshots yet")
def test_committed_d029_results():
    # D-029 (Severe >= 0.90, replay 2026-01-20..03-05), per-episode counts in the farm's catchment (review T-025 M2)
    v = json.loads((R.DEMO / "verification.json").read_text(encoding="utf-8"))
    assert (v["hits"], v["misses"], v["false_alarms"]) == (1, 0, 4)
    assert [e["id"] for e in v["events"] if e["outcome"] == "hit"] == ["flood-2026-02-22-buenavista-pasaje"]
    m = json.loads((R.DEMO / "manifest.json").read_text(encoding="utf-8"))
    assert m["replay_window"] == {"start": "2026-01-20", "end": "2026-03-05"}
    assert "3 of 3 documented El Oro floods on other rivers" in v["notes"] and "no flood-specific lead time" in v["notes"]
