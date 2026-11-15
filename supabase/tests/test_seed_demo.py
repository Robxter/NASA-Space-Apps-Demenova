"""Snapshot -> row mapping of supabase/seed/seed_demo.py (no network, no database).

Run: uv run pytest supabase/tests/test_seed_demo.py   (supabase/ is not in pyproject testpaths)
"""

import importlib.util
import json
import re
from pathlib import Path

import httpx
import pytest

REPO = Path(__file__).resolve().parents[2]
DEMO = REPO / "app" / "public" / "data" / "demo"
MIGRATIONS = sorted((REPO / "supabase" / "migrations").glob("*.sql"))

_spec = importlib.util.spec_from_file_location("seed_demo", REPO / "supabase" / "seed" / "seed_demo.py")
seed = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(seed)


def _json(name):
    return json.loads((DEMO / name).read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def rows():
    return seed.build_rows(DEMO)


def _table_columns(table):
    """(columns, generated columns, columns with a default) of `create table public.<table>` in the migrations."""
    sql = "\n".join(p.read_text(encoding="utf-8") for p in MIGRATIONS)
    body = re.search(rf"create table if not exists public\.{table} \((.*?)\n\);", sql, re.S).group(1)
    cols, generated, defaults = set(), set(), set()
    for line in body.splitlines():
        m = re.match(r"\s{2}([a-z_0-9]+)\s+(.*)", line)
        if not m or m.group(1) in {"constraint", "primary"}:
            continue
        cols.add(m.group(1))
        if "generated always" in m.group(2):
            generated.add(m.group(1))
        if " default " in f" {m.group(2)} ":
            defaults.add(m.group(1))
    return cols, generated, defaults


def test_columns_exist_and_are_writable():
    for table, columns in seed.COLUMNS.items():
        cols, generated, _ = _table_columns(table)
        assert set(columns) <= cols, table
        assert not set(columns) & generated, table
    _, _, farm_defaults = _table_columns("farms")
    # DB defaults fill these; the seed never sends them (a re-run keeps the existing telegram code)
    assert {"telegram_code", "created_at", "updated_at"} <= farm_defaults
    assert not {"telegram_code", "created_at", "updated_at", "alert_email"} & set(seed.COLUMNS["farms"])


def test_row_counts_follow_the_snapshots(rows):
    farm = _json("farm.json")
    replay = [json.loads(p.read_text(encoding="utf-8")) for p in sorted((DEMO / "replay").glob("*.json"))]
    assert len(rows["farms"]) == 1 and rows["farms"][0]["id"] == "farm_demo-el-oro"
    assert len(rows["lots"]) == len(farm["lots"]) == 8
    assert len(rows["zones"]) == len(_json("zones.geojson")["features"])
    assert len(rows["alert_states"]) == len(replay[-1]["units"])
    assert len(rows["alert_events"]) == len({e["id"] for d in replay for e in d["events"]})
    assert len(rows["daily_features"]) == sum(1 for d in replay for u in d["units"] if u["features"] is not None)
    for table, table_rows in rows.items():
        assert all(set(r) == set(seed.COLUMNS[table]) for r in table_rows), table


def test_values_and_origins_are_copied_unchanged(rows):
    farm = _json("farm.json")
    assert rows["farms"][0] == {c: farm["farm"][c] for c in seed.COLUMNS["farms"]}
    assert rows["farms"][0]["is_demo"] is True and rows["farms"][0]["owner_id"] is None
    for lot, row in zip(farm["lots"], rows["lots"], strict=True):
        assert row == {c: lot[c] for c in seed.COLUMNS["lots"]}  # nulls stay null, origins stay as they are
    by_id = {p["id"]: p for f in ("farm.json", "zones.geojson", "manifest.json") for p in _json(f)["provenance"]}
    assert {r["id"] for r in rows["provenance"]} == set(by_id)
    replay = sorted((DEMO / "replay").glob("*.json"))
    first = json.loads(replay[0].read_text(encoding="utf-8"))
    for unit in first["units"]:
        assert unit["features"] in rows["daily_features"]


def test_states_are_the_last_replay_day_without_experimental(rows):
    last = json.loads(sorted((DEMO / "replay").glob("*.json"))[-1].read_text(encoding="utf-8"))
    for unit, row in zip(last["units"], rows["alert_states"], strict=True):
        alert = unit["alert"]
        assert set(row["side"]) == {"sigatoka", "cold"}
        assert row["side"] == {"sigatoka": alert["side"]["sigatoka"], "cold": alert["side"]["cold"]}
        assert {k: v for k, v in row.items() if k != "side"} == {
            k: alert[k] for k in seed.COLUMNS["alert_states"] if k != "side"}


def test_non_demo_farm_is_refused(tmp_path):
    for p in DEMO.rglob("*.json"):
        target = tmp_path / p.relative_to(DEMO)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(p.read_text(encoding="utf-8"), encoding="utf-8")
    (tmp_path / "zones.geojson").write_text((DEMO / "zones.geojson").read_text(encoding="utf-8"), encoding="utf-8")
    assert seed.build_rows(tmp_path)["farms"]  # the copy itself is valid
    farm = json.loads((tmp_path / "farm.json").read_text(encoding="utf-8"))
    farm["farm"]["is_demo"] = False
    (tmp_path / "farm.json").write_text(json.dumps(farm), encoding="utf-8")
    with pytest.raises(seed.SeedError):
        seed.build_rows(tmp_path)


def test_sql_is_one_service_role_transaction_that_keeps_backend_flags(rows):
    sql = seed.build_sql(rows)
    assert sql.index("begin;") < sql.index("set local role service_role;") < sql.index("commit;")
    for table in seed.TABLE_ORDER:
        assert f'insert into public."{table}"' in sql
    events = sql[sql.index('insert into public."alert_events"'):]
    update = events[events.index("do update set"):events.index(";\n")]
    assert '"email_sent"' not in update and '"telegram_sent"' not in update and '"w" = excluded."w"' in update


def test_rest_upserts_without_leaking_the_key(rows, capsys):
    key = "test-service-role-key-not-real"
    seen = []

    def handler(request):
        seen.append(request)
        if request.method == "GET":
            return httpx.Response(200, json=[], headers={"content-range": "0-0/1"})
        return httpx.Response(201)

    rest = seed.Rest("https://example.supabase.co", key, httpx.Client(transport=httpx.MockTransport(handler)))
    for table in seed.TABLE_ORDER:
        rest.upsert(table, rows[table])
    assert rest.count("farms", {"id": "eq.farm_demo-el-oro"}) == 1
    posts = [r for r in seen if r.method == "POST"]
    assert all(r.url.path.startswith("/rest/v1/") and key not in str(r.url) for r in seen)
    assert all("merge-duplicates" in r.headers["prefer"] or "ignore-duplicates" in r.headers["prefer"] for r in posts)
    event_posts = [r for r in posts if r.url.path.endswith("/alert_events")]
    assert "ignore-duplicates" in event_posts[0].headers["prefer"]
    assert "email_sent" not in json.loads(event_posts[1].content)[0]
    assert key not in capsys.readouterr().out
    with pytest.raises(seed.SeedError):
        seed.Rest("http://example.supabase.co", key)


def test_read_env_prefers_environment_then_dotenv(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text("# comment\nSUPABASE_URL='https://a.supabase.co'\nSUPABASE_SERVICE_ROLE_KEY=k1\n", "utf-8")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "k2")
    found = seed.read_env(("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"), env_file)
    assert found == {"SUPABASE_URL": "https://a.supabase.co", "SUPABASE_SERVICE_ROLE_KEY": "k2"}
