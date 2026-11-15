"""Test doubles over httpx.MockTransport (no extra dependency): a tiny PostgREST and a Resend endpoint.

Every row built here is a SYNTHETIC test fixture (origin: synthetic). The numbers are arbitrary test inputs that
exercise the code paths; they are not measurements, not calibrated values and never shipped as data.
"""

import datetime as dt
import json
from typing import Any
from urllib.parse import parse_qsl

import httpx

from backend.app.email import ResendMailer
from backend.app.settings import Settings
from backend.app.supabase import SupabaseRest

SYN = "synthetic"
SUPABASE_URL = "https://fake-project.supabase.test"
SERVICE_KEY = "service-role-key-test-only"
RESEND_KEY = "re_test_only_key"
ADMIN = "admin-token-test-only-0123456789abcdef"  # >= 32 characters (L1)
INBOX = "owner@example.test"


def settings(**overrides: Any) -> Settings:
    values: dict[str, Any] = dict(
        admin_token=ADMIN, resend_api_key=RESEND_KEY, alert_email_to=INBOX, alert_email_from_name="Demenova Alerts",
        supabase_url=SUPABASE_URL, supabase_service_role_key=SERVICE_KEY, app_base_url="https://app.example.test",
    )
    values.update(overrides)
    return Settings(**values)


def _norm(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    return value


def _matches(row: dict[str, Any], col: str, expr: str) -> bool:
    op, _, arg = expr.partition(".")
    value = row.get(col)
    if op == "eq":
        return _norm(str(value) if not isinstance(value, str) else value) == _norm(arg)
    if op == "in":
        return str(value) in arg.strip("()").split(",")
    if op == "is":
        return value is {"true": True, "false": False, "null": None}[arg]
    raise AssertionError(f"unsupported filter {expr}")


class FakePostgrest:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "farms": [], "lots": [], "alert_states": [], "alert_events": [], "email_log": [],
        }
        self.headers_seen: list[httpx.Headers] = []
        self.fail_tables: set[str] = set()
        # (method, table) -> number of next calls that fail with HTTP 500
        self.fail_next: dict[tuple[str, str], int] = {}

    def _rows(self, table: str, params: list[tuple[str, str]]) -> list[dict[str, Any]]:
        rows = self.tables[table]
        for col, expr in params:
            if col in {"select", "order", "limit"}:
                continue
            rows = [r for r in rows if _matches(r, col, expr)]
        return rows

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.headers_seen.append(request.headers)
        table = request.url.path.rsplit("/", 1)[-1]
        if table in self.fail_tables:
            return httpx.Response(500, json={"message": "boom"})
        key = (request.method, table)
        if self.fail_next.get(key, 0) > 0:
            self.fail_next[key] -= 1
            return httpx.Response(500, json={"message": "boom"})
        params = parse_qsl(request.url.query.decode(), keep_blank_values=True)
        if request.method == "GET":
            rows = list(self._rows(table, params))
            opts = dict(params)
            if "order" in opts:
                col, _, direction = opts["order"].partition(".")
                rows.sort(key=lambda r: _norm(r[col]), reverse=direction == "desc")
            if "limit" in opts:
                rows = rows[: int(opts["limit"])]
            return httpx.Response(200, json=rows)
        if request.method == "POST":
            row = json.loads(request.content)
            self.tables[table].append(dict(row, created_at=dt.datetime.now(dt.UTC).isoformat()))
            return httpx.Response(201)
        if request.method == "PATCH":
            for row in self._rows(table, params):
                row.update(json.loads(request.content))
            return httpx.Response(204)
        if request.method == "DELETE":
            doomed = {id(r) for r in self._rows(table, params)}
            self.tables[table] = [r for r in self.tables[table] if id(r) not in doomed]
            return httpx.Response(204)
        return httpx.Response(405)

    def client(self) -> SupabaseRest:
        return SupabaseRest(SUPABASE_URL, SERVICE_KEY, httpx.Client(transport=httpx.MockTransport(self.handler)))


class FakeResend:
    def __init__(self, status: int = 200) -> None:
        self.status = status
        self.requests: list[httpx.Request] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if self.status >= 300:
            return httpx.Response(self.status, json={"name": "validation_error", "message": "rejected"})
        return httpx.Response(self.status, json={"id": f"fake-provider-id-{len(self.requests)}"})

    @property
    def payloads(self) -> list[dict[str, Any]]:
        return [json.loads(r.content) for r in self.requests]

    def mailer(self, s: Settings | None = None) -> ResendMailer:
        s = s or settings()
        return ResendMailer(s.resend_api_key or "", s.from_header, httpx.Client(transport=httpx.MockTransport(self.handler)))


# ------------------------------------------------------------------------------------- synthetic rows

FARM = "farm_test-demo"
LOT = "lot_test-demo_1"
LOT2 = "lot_test-demo_2"
T0 = "2026-02-22T15:00:00Z"
T1 = "2026-02-22T18:00:00Z"
FACTORS = [{"name": "upstream", "share": 0.5}, {"name": "saturation", "share": 0.3}, {"name": "local", "share": 0.2}]


def seed(db: FakePostgrest, *, is_demo: bool = True, alert_email: str | None = None) -> None:
    db.tables["farms"].append({"id": FARM, "name": "Finca Prueba <b>", "is_demo": is_demo, "alert_email": alert_email})
    db.tables["lots"].append({"id": LOT, "farm_id": FARM, "name": "Lote 1"})
    db.tables["lots"].append({"id": LOT2, "farm_id": FARM, "name": "Lote 2"})


def add_event(db: FakePostgrest, *, event_id: str = "01JTEST0000000000000000001", at: str = T0,
              from_level: str = "warning", to_level: str = "severe", w: float | None = 0.9, unit: str = LOT) -> None:
    db.tables["alert_events"].append({
        "id": event_id, "unit_id": unit, "farm_id": FARM, "from_level": from_level, "to_level": to_level,
        "w": w, "factors": FACTORS, "at": at, "email_sent": False, "telegram_sent": False, "origin": SYN,
    })


def add_state(db: FakePostgrest, *, level: str = "severe", since: str = T0, updated_at: str = T1,
              newest_rain: str | None = T1, unit: str = LOT) -> None:
    db.tables["alert_states"].append({
        "unit_id": unit, "farm_id": FARM, "level": level, "w": 0.9, "factors": FACTORS, "since": since,
        "updated_at": updated_at, "newest_rain_data_at": newest_rain, "confirmations": 2, "confidence": 1,
        "side": {"sigatoka": None, "cold": None}, "origin": SYN,
    })
