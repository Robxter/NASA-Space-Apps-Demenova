"""Idempotent seed of the synthetic demo farm `farm_demo-el-oro` from the committed snapshots (database-engineer).

Source: app/public/data/demo/ (farm.json, zones.geojson, manifest.json, replay/*.json), validated against the
contracts in pipeline/common/models.py before anything is written. Values are copied as they are: every `origin`
and provenance id stays as in the snapshot (synthetic stays synthetic, design stays design); null stays null.
Nothing is computed, filled or rounded here.

Tables and what goes in them (upsert on the primary key, so a re-run changes nothing):
  provenance      every full record in farm.json, zones.geojson and manifest.json (deduplicated; conflicts fail)
  farms           the demo farm (is_demo true, owner_id null). Not sent: telegram_code, created_at, updated_at
                  (database defaults; a re-run keeps the existing ones) and alert_email (always null on the demo
                  farm; the backend mails ALERT_EMAIL_TO instead, backend/app/alerts.py recipient_for)
  lots            the farm's lots, all contract columns (twi_* included: service role)
  zones           the TWI tercile zones of zones.geojson
  daily_features  every unit-day of the replay files
  alert_states    each unit's state on the LAST replay day (the "current" state of the frozen demo). `side` keeps only
                  sigatoka and cold: alert_states.side accepts exactly those two keys (private.is_side), and the
                  contract says writers to Supabase omit `experimental` (models.SideIndicators)
  alert_events    every transition of the replay. On conflict, email_sent / telegram_sent are NOT overwritten: they
                  belong to the backend once the row exists, so a re-run never re-arms an alert that was mailed

Modes (exactly one write target; nothing is written without one):
  (default)            Supabase REST API (PostgREST) with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the
                       environment or .env. The key is never printed or logged.
  --dsn <postgres url> plain SQL through `psql` (no Python driver needed); for the local throwaway *_test database.
  --emit-sql <file|->  write the SQL (one transaction, `set local role service_role`) and stop.
  --dry-run            validate and print the row counts only.

Run from the repository root:  $env:PYTHONUTF8='1'; uv run python supabase/seed/seed_demo.py
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Any

import httpx

REPO = Path(__file__).resolve().parents[2]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from pipeline.common.models import AppManifest, FarmFile, ReplayDay, ZonesFile  # noqa: E402

DEMO_DIR = REPO / "app" / "public" / "data" / "demo"
DEMO_FARM_ID = "farm_demo-el-oro"

# Columns written per table, mirroring supabase/migrations (generated columns and DB-default-only columns excluded).
COLUMNS: dict[str, tuple[str, ...]] = {
    "provenance": ("id", "dataset", "version", "provider", "url", "accessed", "spatial_resolution",
                   "temporal_resolution", "aoi", "time_range", "processing", "code_commit", "agent", "notes"),
    "farms": ("id", "name", "owner_id", "country", "province", "canton", "location", "outline", "data_level", "crop",
              "variety", "variety_origin", "catchment_id", "language", "units", "mode", "storage_mode", "is_demo",
              "origin"),
    "lots": ("id", "farm_id", "name", "geometry", "area_ha", "area_ha_origin", "plant_age_months",
             "plant_age_months_origin", "variety", "variety_origin", "drainage_class", "drainage_class_origin",
             "drainage_works", "drainage_works_origin", "cover_crop", "cover_crop_origin", "last_soil_analysis",
             "last_soil_analysis_origin", "nematode_incidence", "nematode_incidence_origin", "disease_notes",
             "bioinputs", "bioinputs_origin", "twi_mean", "twi_max", "twi_tercile", "defined_by",
             "to_be_redefined_by", "origin"),
    "zones": ("id", "farm_id", "tercile", "twi_range", "origin", "geometry"),
    "daily_features": ("unit_id", "date", "rain_local_mm", "rain_upstream_24h_mm", "rain_upstream_48h_mm",
                       "rain_upstream_72h_mm", "runoff_upstream_mm", "soil_moisture", "soil_moisture_source",
                       "api_index", "et0_mm", "etc_mm", "balance_mm", "balance_7d_mm", "positive_balance_days",
                       "percentiles", "twi_rank", "temp_mean_c", "rh_mean", "leaf_wet_hours", "heat_units", "ndvi",
                       "ndvi_date", "provenance_ids", "origin"),
    "alert_states": ("unit_id", "level", "w", "factors", "since", "updated_at", "newest_rain_data_at",
                     "confirmations", "confidence", "side", "origin"),
    "alert_events": ("id", "unit_id", "from_level", "to_level", "w", "factors", "at", "email_sent", "telegram_sent",
                     "origin"),
}
PRIMARY_KEYS: dict[str, tuple[str, ...]] = {
    "provenance": ("id",), "farms": ("id",), "lots": ("id",), "zones": ("id",),
    "daily_features": ("unit_id", "date"), "alert_states": ("unit_id",), "alert_events": ("id",),
}
# Set on insert only; afterwards owned by the backend (backend/app/alerts.py sets email_sent after a send).
INSERT_ONLY: dict[str, tuple[str, ...]] = {"alert_events": ("email_sent", "telegram_sent")}
TABLE_ORDER = ("provenance", "farms", "lots", "zones", "daily_features", "alert_states", "alert_events")
SIDE_KEYS = ("sigatoka", "cold")
SQL_TAG = "$seed$"


class SeedError(RuntimeError):
    """The snapshots cannot be seeded as they are. The message names no secret."""


# ------------------------------------------------------------------------------------------------------------------
# Snapshot -> rows (pure; no network)
# ------------------------------------------------------------------------------------------------------------------
def _read(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise SeedError(f"cannot read {path.name}: {type(exc).__name__}") from None


def _pick(record: Mapping[str, Any], columns: Iterable[str], where: str) -> dict[str, Any]:
    missing = [c for c in columns if c not in record]
    if missing:
        raise SeedError(f"{where}: snapshot lacks {', '.join(missing)}")
    return {c: record[c] for c in columns}


def _add_provenance(store: dict[str, dict[str, Any]], records: Any, where: str) -> None:
    if not isinstance(records, list):
        return  # a {ref, ids} block: the records live in manifest.json
    for record in records:
        row = _pick(record, COLUMNS["provenance"], f"{where} provenance")
        known = store.get(row["id"])
        if known is not None and known != row:
            raise SeedError(f"provenance {row['id']} differs between snapshot files")
        store[row["id"]] = row


def build_rows(demo_dir: Path = DEMO_DIR) -> dict[str, list[dict[str, Any]]]:
    """Rows per table, in TABLE_ORDER, read from the snapshots. Raises SeedError instead of guessing."""
    farm_raw, zones_raw, manifest_raw = (_read(demo_dir / n) for n in ("farm.json", "zones.geojson", "manifest.json"))
    try:
        FarmFile.model_validate(farm_raw)
        ZonesFile.model_validate(zones_raw)
        manifest = AppManifest.model_validate(manifest_raw)
    except ValueError as exc:  # pydantic.ValidationError is a ValueError
        raise SeedError(f"snapshot does not match the contract: {exc.__class__.__name__}: {exc}") from None

    farm = farm_raw["farm"]
    if farm.get("id") != DEMO_FARM_ID or manifest.farm_id != DEMO_FARM_ID:
        raise SeedError(f"snapshot farm is not {DEMO_FARM_ID}")
    if farm.get("is_demo") is not True or farm.get("owner_id") is not None or farm.get("alert_email") is not None:
        raise SeedError("the demo farm must have is_demo true, no owner and no alert_email")

    provenance: dict[str, dict[str, Any]] = {}
    _add_provenance(provenance, farm_raw.get("provenance"), "farm.json")
    _add_provenance(provenance, zones_raw.get("provenance"), "zones.geojson")
    _add_provenance(provenance, manifest_raw.get("provenance"), "manifest.json")

    lots = [_pick(lot, COLUMNS["lots"], lot.get("id", "lot")) for lot in farm_raw["lots"]]
    zones = []
    for feature in zones_raw["features"]:
        props = dict(feature["properties"], geometry=feature["geometry"])
        zones.append(_pick(props, COLUMNS["zones"], props.get("id", "zone")))
    for zone in zones:
        if zone["farm_id"] != DEMO_FARM_ID:
            raise SeedError(f"{zone['id']}: belongs to another farm")
    units = {lot["id"] for lot in lots} | {zone["id"] for zone in zones}

    window = manifest.replay_window
    days: list[tuple[ReplayDay, dict[str, Any]]] = []
    for path in sorted((demo_dir / "replay").glob("*.json")):
        raw = _read(path)
        try:
            day = ReplayDay.model_validate(raw)
        except ValueError as exc:
            raise SeedError(f"replay/{path.name} does not match the contract: {exc}") from None
        if path.stem != day.date.isoformat() or not window.start <= day.date <= window.end:
            raise SeedError(f"replay/{path.name}: date outside the replay window or not its file name")
        days.append((day, raw))
    if not days or days[-1][0].date != window.end:
        raise SeedError("the last replay file is not the replay window's end day")

    features: list[dict[str, Any]] = []
    events: dict[str, dict[str, Any]] = {}
    referenced: set[str] = set()
    for day, raw in days:
        referenced.update(raw["provenance"].get("ids", []) if isinstance(raw["provenance"], dict) else [])
        for unit in raw["units"]:
            if unit["unit_id"] not in units:
                raise SeedError(f"replay {day.date}: unknown unit {unit['unit_id']}")
            if unit["features"] is not None:
                row = _pick(unit["features"], COLUMNS["daily_features"], f"{unit['unit_id']} {day.date}")
                referenced.update(row["provenance_ids"])
                features.append(row)
        for event in raw["events"]:
            row = _pick(event, COLUMNS["alert_events"], f"event {event.get('id')}")
            if row["unit_id"] not in units:
                raise SeedError(f"event {row['id']}: unknown unit")
            if row["id"] in events and events[row["id"]] != row:
                raise SeedError(f"event {row['id']} differs between replay days")
            events[row["id"]] = row

    states = []
    last_day = days[-1][1]
    for unit in last_day["units"]:
        alert = dict(unit["alert"])
        alert["side"] = {k: alert["side"][k] for k in SIDE_KEYS}  # drops only `experimental` (see module docstring)
        states.append(_pick(alert, COLUMNS["alert_states"], f"state {unit['unit_id']}"))

    unknown = sorted(referenced - provenance.keys())
    if unknown:
        raise SeedError(f"provenance ids without a record in the snapshots: {', '.join(unknown)}")

    rows = {
        "provenance": sorted(provenance.values(), key=lambda r: r["id"]),
        "farms": [_pick(farm, COLUMNS["farms"], DEMO_FARM_ID)],
        "lots": lots,
        "zones": zones,
        "daily_features": features,
        "alert_states": states,
        "alert_events": sorted(events.values(), key=lambda r: r["id"]),
    }
    return {table: rows[table] for table in TABLE_ORDER}


def describe(rows: Mapping[str, list[dict[str, Any]]], demo_dir: Path = DEMO_DIR) -> str:
    manifest = _read(demo_dir / "manifest.json")
    window = manifest["replay_window"]
    return (f"demo seed: {DEMO_FARM_ID} from app/public/data/demo "
            f"(replay {window['start']}..{window['end']}, alert states as of {window['end']})")


# ------------------------------------------------------------------------------------------------------------------
# SQL (one transaction, as the service role; same jsonb -> record path PostgREST uses)
# ------------------------------------------------------------------------------------------------------------------
def _ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def upsert_sql(table: str, rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""
    cols = COLUMNS[table]
    payload = json.dumps(rows, ensure_ascii=True, separators=(",", ":"), sort_keys=True)
    if SQL_TAG in payload:
        raise SeedError(f"{table}: payload contains the SQL quote tag")
    col_list = ", ".join(_ident(c) for c in cols)
    keys = PRIMARY_KEYS[table]
    updates = [c for c in cols if c not in keys and c not in INSERT_ONLY.get(table, ())]
    conflict = ", ".join(_ident(k) for k in keys)
    action = ("do update set " + ", ".join(f"{_ident(c)} = excluded.{_ident(c)}" for c in updates)) if updates \
        else "do nothing"
    return (f"insert into public.{_ident(table)} ({col_list})\n"
            f"select {col_list} from jsonb_populate_recordset(null::public.{_ident(table)}, "
            f"{SQL_TAG}{payload}{SQL_TAG}::jsonb)\n"
            f"on conflict ({conflict}) {action};\n")


def build_sql(rows: Mapping[str, list[dict[str, Any]]]) -> str:
    parts = ["-- Generated by supabase/seed/seed_demo.py from app/public/data/demo. Synthetic demo farm only.\n",
             "begin;\n", "set local role service_role;\n"]
    parts += [upsert_sql(table, rows[table]) for table in TABLE_ORDER]
    parts.append("commit;\n")
    return "".join(parts)


def count_sql(rows: Mapping[str, list[dict[str, Any]]]) -> str:
    ids = ", ".join("'" + r["id"].replace("'", "''") + "'" for r in rows["provenance"]) or "null"
    farm = f"'{DEMO_FARM_ID}'"
    selects = [f"select 'provenance', count(*) from public.provenance where id in ({ids})",
               f"select 'farms', count(*) from public.farms where id = {farm}"]
    selects += [f"select '{t}', count(*) from public.{t} where farm_id = {farm}" for t in TABLE_ORDER[2:]]
    return " union all ".join(selects) + ";"


def run_psql(psql: str, dsn: str, sql: str, *extra: str) -> str:
    env = dict(os.environ, PGCLIENTENCODING="UTF8")
    result = subprocess.run([psql, "-X", "-q", "-v", "ON_ERROR_STOP=1", *extra, "-d", dsn], input=sql, text=True,
                            encoding="utf-8", capture_output=True, env=env, check=False)
    if result.returncode != 0:
        raise SeedError(f"psql exit {result.returncode}: {result.stderr.strip()[:2000]}")
    return result.stdout


# ------------------------------------------------------------------------------------------------------------------
# Supabase REST (PostgREST) with the service role key
# ------------------------------------------------------------------------------------------------------------------
def read_env(names: Iterable[str], env_file: Path = REPO / ".env") -> dict[str, str]:
    """The named variables from the environment, else from .env (KEY=VALUE lines). Values are never printed."""
    wanted = list(names)
    found = {n: os.environ[n].strip() for n in wanted if os.environ.get(n, "").strip()}
    if len(found) < len(wanted) and env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.removeprefix("export ").split("=", 1)
            key, value = key.strip(), value.strip().strip('"').strip("'")
            if key in wanted and key not in found and value:
                found[key] = value
    return found


class Rest:
    """Upserts and counts over PostgREST. Errors name the table, the HTTP status and PostgREST's code only."""

    def __init__(self, base_url: str, key: str, client: httpx.Client | None = None) -> None:
        if not base_url.startswith("https://"):
            raise SeedError("SUPABASE_URL must start with https://")
        self._base = f"{base_url.rstrip('/')}/rest/v1"
        self._headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        self._client = client or httpx.Client(timeout=30.0)

    def _send(self, method: str, table: str, params: dict[str, str], prefer: str, json_body: Any = None,
              extra_headers: Mapping[str, str] | None = None) -> httpx.Response:
        headers = dict(self._headers, Prefer=prefer, **(extra_headers or {}))
        try:
            response = self._client.request(method, f"{self._base}/{table}", params=params, json=json_body,
                                            headers=headers)
        except httpx.HTTPError as exc:
            raise SeedError(f"{method} {table}: {type(exc).__name__}") from None
        if response.status_code >= 400:
            code = ""
            try:
                body = response.json()
                code = f" {body.get('code', '')}: {body.get('message', '')}" if isinstance(body, dict) else ""
            except ValueError:
                pass
            raise SeedError(f"{method} {table}: HTTP {response.status_code}{code}")
        return response

    def upsert(self, table: str, rows: list[dict[str, Any]], batch: int = 500) -> None:
        keys = PRIMARY_KEYS[table]
        insert_only = INSERT_ONLY.get(table, ())
        for start in range(0, len(rows), batch):
            chunk = rows[start:start + batch]
            if insert_only:
                # 1) new rows get every column, flags included; existing rows are left alone
                self._send("POST", table, {"on_conflict": ",".join(keys), "columns": ",".join(COLUMNS[table])},
                           "resolution=ignore-duplicates,return=minimal", chunk)
                cols = [c for c in COLUMNS[table] if c not in insert_only]
                chunk = [{c: r[c] for c in cols} for r in chunk]
            else:
                cols = list(COLUMNS[table])
            # 2) insert or update everything else on the primary key
            self._send("POST", table, {"on_conflict": ",".join(keys), "columns": ",".join(cols)},
                       "resolution=merge-duplicates,return=minimal", chunk)

    def count(self, table: str, params: dict[str, str]) -> int | None:
        response = self._send("GET", table, dict(params, select=PRIMARY_KEYS[table][0], limit="1"), "count=exact")
        total = response.headers.get("content-range", "").rpartition("/")[2]
        return int(total) if total.isdigit() else None


def count_filters(rows: Mapping[str, list[dict[str, Any]]]) -> dict[str, dict[str, str]]:
    ids = ",".join(f'"{r["id"]}"' for r in rows["provenance"])
    filters = {"provenance": {"id": f"in.({ids})"}, "farms": {"id": f"eq.{DEMO_FARM_ID}"}}
    filters |= {t: {"farm_id": f"eq.{DEMO_FARM_ID}"} for t in TABLE_ORDER[2:]}
    return filters


# ------------------------------------------------------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------------------------------------------------------
def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Idempotent upsert of the synthetic demo farm from the snapshots.")
    target = parser.add_mutually_exclusive_group()
    target.add_argument("--dsn", help="direct Postgres URL; the SQL is run through psql (local *_test DB)")
    target.add_argument("--emit-sql", metavar="FILE", help="write the SQL to FILE ('-' = stdout) and stop")
    target.add_argument("--dry-run", action="store_true", help="validate the snapshots and print row counts only")
    parser.add_argument("--psql", default=os.environ.get("PSQL") or shutil.which("psql") or "psql",
                        help="psql executable for --dsn (default: $PSQL or psql on PATH)")
    args = parser.parse_args(argv)

    try:
        rows = build_rows()
        if args.emit_sql:
            sql = build_sql(rows)
            if args.emit_sql == "-":
                sys.stdout.write(sql)
                return 0
            Path(args.emit_sql).write_text(sql, encoding="utf-8")
        print(describe(rows))
        if args.emit_sql or args.dry_run:
            for table in TABLE_ORDER:
                print(f"  {table:<15} {len(rows[table]):>4} rows")
            print("SQL written; nothing sent." if args.emit_sql else "dry run; nothing written.")
            return 0
        if args.dsn:
            run_psql(args.psql, args.dsn, build_sql(rows))
            out = run_psql(args.psql, args.dsn, count_sql(rows), "-t", "-A", "-F", "|")
            in_db = dict(line.split("|", 1) for line in out.splitlines() if "|" in line)
        else:
            env = read_env(("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"))
            if len(env) < 2:
                raise SeedError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (environment or .env)")
            rest = Rest(env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
            for table in TABLE_ORDER:
                rest.upsert(table, rows[table])
            in_db = {t: str(rest.count(t, f)) for t, f in count_filters(rows).items()}
        for table in TABLE_ORDER:
            print(f"  {table:<15} {len(rows[table]):>4} rows upserted, {in_db.get(table, '?'):>4} in the database")
        print("done")
        return 0
    except SeedError as exc:
        print(f"seed failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
