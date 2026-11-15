"""Demenova backend (docs/contracts/openapi.yaml). Background work only: no screen a judge opens calls it.

Run from the repository root: `uv run uvicorn backend.app.main:app`.
"""

import datetime as dt
import hmac
import logging
import threading
import time
from typing import Annotated, Any

from fastapi import BackgroundTasks, Depends, FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

from backend.app.alerts import build_email, latest_demo_severe, publish_severe_alerts, quiet_http_logs
from backend.app.email import ResendMailer, SevereEmail
from backend.app.ids import new_ulid
from backend.app.settings import Settings, load_settings
from backend.app.supabase import SupabaseError, SupabaseRest
from pipeline.common.models import EmailStatus, FarmId

log = logging.getLogger("demenova.api")
quiet_http_logs()

# /email/test sends at most once per interval per process (security review L2): a leaked token cannot burn the
# Resend quota quickly. Attempts count, whether or not Resend accepts them.
EMAIL_TEST_MIN_INTERVAL_S = 60.0


class _Throttle:
    def __init__(self, interval_s: float) -> None:
        self.interval_s = interval_s
        self._last: float | None = None
        self._lock = threading.Lock()

    def allow(self) -> bool:
        with self._lock:
            now = time.monotonic()
            if self._last is not None and now - self._last < self.interval_s:
                return False
            self._last = now
            return True

    def reset(self) -> None:
        with self._lock:
            self._last = None


email_test_throttle = _Throttle(EMAIL_TEST_MIN_INTERVAL_S)

app = FastAPI(title="Demenova backend", version="0.1.0", docs_url=None, redoc_url=None, openapi_url=None)


class ApiError(Exception):
    def __init__(self, status: int, detail: str) -> None:
        self.status, self.detail = status, detail


@app.exception_handler(ApiError)
async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse({"detail": exc.detail}, status_code=exc.status)


@app.exception_handler(RequestValidationError)
async def _validation_error(_: Request, __: RequestValidationError) -> JSONResponse:
    # Never echo the submitted body back (it could hold anything).
    return JSONResponse({"detail": "Request body does not match the schema."}, status_code=422)


# ----------------------------------------------------------------------------------------------- dependencies


def get_settings() -> Settings:
    return load_settings()


def get_db(settings: Annotated[Settings, Depends(get_settings)]) -> SupabaseRest | None:
    if not settings.supabase_configured:
        return None
    return SupabaseRest(settings.supabase_url, settings.supabase_service_role_key)  # type: ignore[arg-type]


def get_mailer(settings: Annotated[Settings, Depends(get_settings)]) -> ResendMailer | None:
    if settings.resend_api_key is None:
        return None
    return ResendMailer(settings.resend_api_key, settings.from_header)


def require_admin(
    settings: Annotated[Settings, Depends(get_settings)],
    x_admin_token: Annotated[str | None, Header()] = None,
) -> None:
    """Constant-time comparison with ADMIN_TOKEN. Fails closed when ADMIN_TOKEN is unset."""
    expected = settings.admin_token
    if expected is None:
        log.warning("ADMIN_TOKEN is not configured; admin endpoints are closed")
    supplied = (x_admin_token or "").encode()
    if expected is None or not hmac.compare_digest(supplied, expected.encode()):
        raise ApiError(401, "Unauthorized.")


# ----------------------------------------------------------------------------------------------- models


class Health(BaseModel):
    status: str


class RunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    farm_id: FarmId | None


class RunAccepted(BaseModel):
    run_id: str
    farm_id: str | None
    accepted_at: str


class EmailTestResult(BaseModel):
    status: EmailStatus
    provider_id: str | None


# ----------------------------------------------------------------------------------------------- routes


@app.get("/health", response_model=Health)
def health() -> dict[str, str]:
    return {"status": "ok"}


def _run_publishing(db: SupabaseRest, mailer: ResendMailer | None, settings: Settings,
                    run_id: str, farm_id: str | None) -> None:
    if mailer is None:
        log.warning("run %s: RESEND_API_KEY not configured; Severe emails not published", run_id)
        return
    try:
        outcomes = publish_severe_alerts(db, mailer, settings, farm_id)
    except Exception as exc:  # noqa: BLE001 - background task: log the failure class, never the payload
        log.error("run %s: publishing failed (%s)", run_id, type(exc).__name__)
        return
    log.info("run %s: %d Severe event(s) processed", run_id, len(outcomes))


@app.post("/run", status_code=202, response_model=RunAccepted, dependencies=[Depends(require_admin)])
def trigger_run(
    body: RunRequest,
    background: BackgroundTasks,
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[SupabaseRest | None, Depends(get_db)],
    mailer: Annotated[ResendMailer | None, Depends(get_mailer)],
) -> dict[str, Any]:
    """Runs the backend's part of the cycle (Publishing: pending Severe emails) in process.

    Fetching, Processing and Scoring run in the hourly GitHub Actions pipeline (devops-engineer, T-029); dispatching
    that workflow from here is a follow-up agreed with devops (it needs a token and the workflow's inputs).
    """
    if db is None:
        raise ApiError(503, "Run is not configured (database connection missing).")
    if body.farm_id is not None:
        try:
            found = db.select("farms", {"select": "id", "id": f"eq.{body.farm_id}", "limit": "1"})
        except SupabaseError:
            raise ApiError(503, "Database is unavailable.") from None
        if not found:
            raise ApiError(404, "Unknown farm_id.")
    now = dt.datetime.now(dt.UTC)
    run_id = new_ulid(now)
    background.add_task(_run_publishing, db, mailer, settings, run_id, body.farm_id)
    log.info("run %s accepted (farm=%s)", run_id, body.farm_id or "all")
    return {"run_id": run_id, "farm_id": body.farm_id,
            "accepted_at": now.isoformat(timespec="seconds").replace("+00:00", "Z")}


@app.post("/email/test", response_model=EmailTestResult, dependencies=[Depends(require_admin)])
def email_test(
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[SupabaseRest | None, Depends(get_db)],
    mailer: Annotated[ResendMailer | None, Depends(get_mailer)],
) -> dict[str, Any]:
    """Same template and Resend call as the real email, marked TEST; never written to email_log.

    Uses the demo farm's most recent real Severe transition when Supabase has one; otherwise every value is shown
    as missing (Rule zero: nothing is made up for a test).
    """
    if mailer is None or settings.alert_email_to is None:
        raise ApiError(503, "Email is not configured.")
    if not email_test_throttle.allow():
        raise ApiError(429, "Too many test emails; wait a minute.")
    mail = SevereEmail(unit_id="-", unit_name="sin dato / missing", farm_name="sin dato / missing",
                       is_demo=False, w=None, test=True)
    if db is not None:
        try:
            found = latest_demo_severe(db)
            if found:
                event, state, farm = found
                mail = build_email(db, settings, event, state, farm, test=True)
        except Exception as exc:  # noqa: BLE001 - a broken row must not block the delivery test
            log.warning("email test: no Severe event used (%s)", type(exc).__name__)
    result = mailer.send(settings.alert_email_to, mail)
    return {"status": result.status, "provider_id": result.provider_id}


@app.post("/telegram/webhook", status_code=501)
def telegram_webhook() -> JSONResponse:
    """Telegram bot is T-043 (nice-to-have), not built yet."""
    return JSONResponse({"detail": "Not implemented."}, status_code=501)
