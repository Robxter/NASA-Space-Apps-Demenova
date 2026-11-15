"""Publishing step of the pipeline cycle (docs/spec/16): send the Severe email once per unit per Severe episode.

An email goes out only when ALL hold (docs/spec/12, 13, 16):
- an alert_events row is a transition into `severe` from another level (`email_sent` still false);
- the unit's current alert_states row is still `severe` and its `since` equals the event time (same episode; the
  engine only writes that transition after two agreeing updates, i.e. a confirmed Severe);
- the state is not stale: newest rain data exists and is at most `stale_after_hours` (config/alerts.yaml) older
  than the state's update time. Stale never emails; a missing or unreadable threshold fails closed (no email);
- no `queued` or `sent` row exists in email_log for (unit_id, episode_start = event time).

Dedupe uses only existing tables (no schema change): this process inserts a `queued` claim, re-reads the claims for
the key and keeps going only if its claim is the oldest (ULIDs sort by time), so two concurrent runs send once.
A failed send is logged `failed` and does not block a later retry. Resend also gets an Idempotency-Key per episode.
"""

import argparse
import datetime as dt
import logging
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from pydantic import ValidationError

from backend.app.email import DISPLAY_TZ, ResendMailer, SevereEmail, hash_recipient
from backend.app.ids import new_ulid
from backend.app.settings import Settings
from backend.app.supabase import SupabaseError, SupabaseRest
from backend.app.telegram import TelegramClient, mask_chat, render_telegram
from pipeline.common.models import AlertEvent, AlertState, EmailStatus, Severity

log = logging.getLogger("demenova.alerts")

ALERTS_CONFIG = Path(__file__).resolve().parents[2] / "config" / "alerts.yaml"
FARM_ID_RE = re.compile(r"^farm_[a-z0-9]+(?:-[a-z0-9]+)*$")
EVENT_COLUMNS = ",".join([*AlertEvent.model_fields, "farm_id"])
STATE_COLUMNS = ",".join(AlertState.model_fields)
BATCH_LIMIT = 200
# Security review block 4 (L5): the Telegram fan-out is sequential (5 s timeout per call); stop starting new sends
# after this many seconds. Chats not reached are logged; there is no per-chat log to retry them (PENDING P-021).
TELEGRAM_FANOUT_BUDGET_S = 60.0
_clock = time.monotonic


@dataclass(frozen=True)
class Outcome:
    event_id: str
    unit_id: str
    result: str  # sent | failed | skipped:<reason>
    provider_id: str | None = None
    channel: str = "email"  # email | telegram


def quiet_http_logs() -> None:
    """httpx logs every request URL at INFO (security review L3); keep only warnings."""
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def load_stale_after_hours(path: Path = ALERTS_CONFIG) -> float | None:
    """stale_after_hours from config/alerts.yaml, or None when missing or invalid (callers fail closed)."""
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        value = data["stale_after_hours"]["value"]
    except (OSError, yaml.YAMLError, KeyError, TypeError):
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
        return None
    return float(value)


def iso(value: dt.datetime) -> str:
    return value.astimezone(dt.UTC).isoformat().replace("+00:00", "Z")


def skip_reason(event: AlertEvent, state: AlertState | None, stale_after_hours: float | None) -> str | None:
    """None when the event may email; otherwise the reason it must not."""
    if event.to_level != Severity.severe:
        return "not_severe"
    if event.from_level == Severity.severe:
        return "not_a_transition"
    if state is None:
        return "no_state"
    if state.level == Severity.stale:
        return "stale"
    if state.level != Severity.severe:
        return "no_longer_severe"
    if state.since != event.at:
        return "other_episode"
    if stale_after_hours is None:
        return "stale_threshold_unavailable"
    if state.newest_rain_data_at is None:
        return "stale"
    if (state.updated_at - state.newest_rain_data_at).total_seconds() > stale_after_hours * 3600:
        return "stale"
    return None


def _model(cls: type, row: dict[str, Any]) -> Any:
    return cls.model_validate({k: row[k] for k in cls.model_fields if k in row})


def unit_display_name(db: SupabaseRest, unit_id: str, farm_name: str) -> str:
    if unit_id.startswith("lot_"):
        rows = db.select("lots", {"select": "name", "id": f"eq.{unit_id}", "limit": "1"})
        return str(rows[0].get("name") or unit_id) if rows else unit_id
    if unit_id.startswith("zone_"):
        tercile = unit_id.rsplit("_", 1)[-1]
        names = {"low": "Zona baja / Low zone", "mid": "Zona media / Middle zone", "high": "Zona alta / High zone"}
        return names.get(tercile, unit_id)
    return farm_name


def lot_link(settings: Settings, unit_id: str, episode_start: dt.datetime | None, is_demo: bool) -> str | None:
    """Hash route of the app (app/src/state/nav.ts): #lot/<id>; the demo also pins the replay day (?d=)."""
    if settings.app_base_url is None:
        return None
    route = f"#lot/{unit_id}" if unit_id.startswith("lot_") else "#home"
    if is_demo and episode_start is not None:
        route += f"?d={episode_start.astimezone(DISPLAY_TZ).date().isoformat()}"
    return f"{settings.app_base_url}/{route}"


def build_email(db: SupabaseRest, settings: Settings, event: AlertEvent, state: AlertState | None,
                farm: dict[str, Any], test: bool = False) -> SevereEmail:
    farm_name = str(farm.get("name") or farm.get("id"))
    is_demo = farm.get("is_demo") is True
    return SevereEmail(
        unit_id=event.unit_id,
        unit_name=unit_display_name(db, event.unit_id, farm_name),
        farm_name=farm_name,
        is_demo=is_demo,
        w=event.w,
        factors=list(event.factors),
        episode_start=event.at,
        updated_at=state.updated_at if state else None,
        newest_rain_data_at=state.newest_rain_data_at if state else None,
        link=lot_link(settings, event.unit_id, event.at, is_demo),
        test=test,
    )


def recipient_for(farm: dict[str, Any], settings: Settings) -> str | None:
    """The farm's alert_email; the demo farm (alert_email always null) uses ALERT_EMAIL_TO."""
    address = farm.get("alert_email")
    if isinstance(address, str) and address.strip():
        return address.strip()
    if farm.get("is_demo") is True:
        return settings.alert_email_to
    return None


def _claims(db: SupabaseRest, unit_id: str, episode: str) -> list[dict[str, Any]]:
    return db.select("email_log", {
        "select": "id,status", "unit_id": f"eq.{unit_id}", "episode_start": f"eq.{episode}",
        "status": "in.(queued,sent)", "order": "id.asc",
    })


def publish_one(db: SupabaseRest, mailer: ResendMailer, settings: Settings, event: AlertEvent,
                farm: dict[str, Any], stale_after_hours: float | None) -> Outcome:
    states = db.select("alert_states", {"select": STATE_COLUMNS, "unit_id": f"eq.{event.unit_id}", "limit": "1"})
    try:
        state = _model(AlertState, states[0]) if states else None
    except ValidationError:
        return Outcome(event.id, event.unit_id, "skipped:invalid_state")
    reason = skip_reason(event, state, stale_after_hours)
    if reason:
        return Outcome(event.id, event.unit_id, f"skipped:{reason}")
    to = recipient_for(farm, settings)
    if to is None:
        return Outcome(event.id, event.unit_id, "skipped:no_recipient")

    # Everything that can fail on a lookup happens before the claim exists (security review M1).
    mail = build_email(db, settings, event, state, farm)
    episode = iso(event.at)
    if _claims(db, event.unit_id, episode):
        return Outcome(event.id, event.unit_id, "skipped:duplicate")
    claim_id = new_ulid()  # created right after the check: the narrowest race window without a schema change (M2)
    try:
        db.insert("email_log", {
            "id": claim_id, "unit_id": event.unit_id, "episode_start": episode, "to_hash": hash_recipient(to),
            "provider_id": None, "status": EmailStatus.queued.value,
        })
        claims = _claims(db, event.unit_id, episode)
        if not claims or claims[0].get("id") != claim_id:
            db.delete("email_log", {"id": f"eq.{claim_id}"})
            return Outcome(event.id, event.unit_id, "skipped:duplicate")
        # Stable key per episode: if a crash below leads to a retry within 24 h, Resend does not deliver twice.
        result = mailer.send(to, mail, idempotency_key=f"demenova-severe-{event.unit_id}-{episode}")
        db.update("email_log", {"id": f"eq.{claim_id}"},
                  {"status": result.status.value, "provider_id": result.provider_id})
    except Exception as exc:  # noqa: BLE001 - never leave a `queued` claim behind, it would block the episode
        log.warning("claim released: unit=%s error=%s", event.unit_id, type(exc).__name__)
        _release_claim(db, claim_id)
        return Outcome(event.id, event.unit_id, "failed")
    if result.status != EmailStatus.sent:
        return Outcome(event.id, event.unit_id, "failed")
    try:
        db.update("alert_events", {"id": f"eq.{event.id}"}, {"email_sent": True})
    except Exception as exc:  # noqa: BLE001 - email_log already records the send, so dedupe still holds
        log.warning("email_sent flag not set: unit=%s error=%s", event.unit_id, type(exc).__name__)
    return Outcome(event.id, event.unit_id, "sent", result.provider_id)


def _release_claim(db: SupabaseRest, claim_id: str) -> None:
    """Mark a claim `failed` (so the next run retries); delete it if that fails too; never raise."""
    try:
        db.update("email_log", {"id": f"eq.{claim_id}"}, {"status": EmailStatus.failed.value})
        return
    except Exception:  # noqa: BLE001
        pass
    try:
        db.delete("email_log", {"id": f"eq.{claim_id}"})
    except Exception:  # noqa: BLE001
        log.error("claim %s could not be released; that episode stays blocked until it is cleared", claim_id)


def publish_telegram(db: SupabaseRest, tg: TelegramClient, settings: Settings, event: AlertEvent,
                     farm: dict[str, Any], stale_after_hours: float | None) -> Outcome:
    """Mirror a Severe email to the farm's active Telegram subscribers, once per episode.

    Same eligibility as the email (skip_reason). Dedupe without a schema change: `alert_events.telegram_sent` is
    claimed with one conditional UPDATE (telegram_sent false -> true), so concurrent runs fan out once. If no chat
    received it, the claim is undone so the next run retries; partial failures are not retried (there is no
    per-chat log table; PENDING.md).
    """
    def out(result: str) -> Outcome:
        return Outcome(event.id, event.unit_id, result, channel="telegram")

    states = db.select("alert_states", {"select": STATE_COLUMNS, "unit_id": f"eq.{event.unit_id}", "limit": "1"})
    try:
        state = _model(AlertState, states[0]) if states else None
    except ValidationError:
        return out("skipped:invalid_state")
    reason = skip_reason(event, state, stale_after_hours)
    if reason:
        return out(f"skipped:{reason}")
    subs = db.select("telegram_subscribers", {"select": "chat_id", "farm_id": f"eq.{farm['id']}",
                                              "active": "is.true", "limit": "500"})
    if not subs:
        return out("skipped:no_subscribers")
    text = render_telegram(build_email(db, settings, event, state, farm))
    claimed = db.update_returning("alert_events", {"id": f"eq.{event.id}", "telegram_sent": "is.false"},
                                  {"telegram_sent": True})
    if not claimed:
        return out("skipped:duplicate")
    delivered = attempted = 0
    deadline = _clock() + TELEGRAM_FANOUT_BUDGET_S
    for sub in subs:
        if _clock() > deadline:
            log.warning("telegram fan-out stopped at the time budget: unit=%s reached %d of %d",
                        event.unit_id, attempted, len(subs))
            break
        attempted += 1
        try:
            delivered += tg.send(sub["chat_id"], text)
        except Exception as exc:  # noqa: BLE001 - one chat never stops the others
            log.warning("telegram send failed: chat=%s error=%s", mask_chat(sub.get("chat_id")), type(exc).__name__)
    if delivered == 0:
        try:
            db.update("alert_events", {"id": f"eq.{event.id}"}, {"telegram_sent": False})
        except Exception as exc:  # noqa: BLE001
            log.warning("telegram claim not undone: unit=%s error=%s", event.unit_id, type(exc).__name__)
        return out("failed")
    log.info("telegram fan-out: unit=%s delivered=%d of %d", event.unit_id, delivered, len(subs))
    return out("sent")


def publish_severe_alerts(db: SupabaseRest, mailer: ResendMailer | None, settings: Settings,
                          farm_id: str | None = None, stale_after_hours: float | None = None,
                          telegram: TelegramClient | None = None) -> list[Outcome]:
    """Send every pending Severe email and Telegram mirror (optionally for one farm). Never raises for one row.

    Newest events first: old events that never qualified (stale, superseded episodes) stay unflagged forever and
    must not crowd new ones out of the batch.
    """
    if farm_id is not None and not FARM_ID_RE.match(farm_id):
        raise ValueError("invalid farm id")
    if stale_after_hours is None:
        stale_after_hours = load_stale_after_hours()
    params = {"select": EVENT_COLUMNS, "to_level": "eq.severe",
              "or": "(email_sent.is.false,telegram_sent.is.false)", "order": "at.desc", "limit": str(BATCH_LIMIT)}
    if farm_id:
        params["farm_id"] = f"eq.{farm_id}"
    outcomes: list[Outcome] = []
    farms: dict[str, dict[str, Any]] = {}
    for row in db.select("alert_events", params):
        row_id = str(row.get("id", "?"))
        try:
            event = _model(AlertEvent, row)
        except ValidationError:
            outcomes.append(Outcome(row_id, str(row.get("unit_id", "?")), "skipped:invalid_event"))
            continue
        channels = []
        if mailer is not None and not event.email_sent:
            channels.append("email")
        if telegram is not None and not event.telegram_sent:
            channels.append("telegram")
        for channel in channels:
            try:
                fid = str(row.get("farm_id", ""))
                if fid not in farms:
                    found = db.select("farms", {"select": "id,name,is_demo,alert_email", "id": f"eq.{fid}",
                                                "limit": "1"})
                    farms[fid] = found[0] if found else {}
                if not farms[fid]:
                    outcomes.append(Outcome(event.id, event.unit_id, "skipped:no_farm", channel=channel))
                    continue
                if channel == "email":
                    outcomes.append(publish_one(db, mailer, settings, event, farms[fid], stale_after_hours))  # type: ignore[arg-type]
                else:
                    outcomes.append(publish_telegram(db, telegram, settings, event, farms[fid], stale_after_hours))  # type: ignore[arg-type]
            except SupabaseError as exc:
                log.warning("publish failed: unit=%s channel=%s error=%s", event.unit_id, channel, exc)
                outcomes.append(Outcome(event.id, event.unit_id, "skipped:supabase_error", channel=channel))
            except Exception as exc:  # noqa: BLE001 - one bad row never aborts the batch; log the class only
                log.warning("publish failed: unit=%s channel=%s error=%s", event.unit_id, channel, type(exc).__name__)
                outcomes.append(Outcome(event.id, event.unit_id, "skipped:error", channel=channel))
    for o in outcomes:
        log.info("severe %s: event=%s unit=%s result=%s", o.channel, o.event_id, o.unit_id, o.result)
    return outcomes


def latest_severe(db: SupabaseRest, farm_id: str | None = None
                  ) -> tuple[AlertEvent, AlertState | None, dict[str, Any]] | None:
    """Most recent real Severe transition of a farm (default: the demo farm), for test alerts. None if none."""
    columns = "id,name,is_demo"
    if farm_id is None:
        farms = db.select("farms", {"select": columns, "is_demo": "is.true", "limit": "1"})
    elif FARM_ID_RE.match(farm_id):
        farms = db.select("farms", {"select": columns, "id": f"eq.{farm_id}", "limit": "1"})
    else:
        return None
    if not farms:
        return None
    rows = db.select("alert_events", {"select": EVENT_COLUMNS, "farm_id": f"eq.{farms[0]['id']}",
                                      "to_level": "eq.severe", "order": "at.desc", "limit": "1"})
    if not rows:
        return None
    event = _model(AlertEvent, rows[0])
    states = db.select("alert_states", {"select": STATE_COLUMNS, "unit_id": f"eq.{event.unit_id}", "limit": "1"})
    state = _model(AlertState, states[0]) if states else None
    if state is not None and state.since != event.at:
        state = None  # the state's timestamps belong to another episode; show them as missing
    return event, state, farms[0]


def latest_demo_severe(db: SupabaseRest) -> tuple[AlertEvent, AlertState | None, dict[str, Any]] | None:
    return latest_severe(db)


def main(argv: list[str] | None = None) -> int:
    """CLI for the pipeline workflow's Publishing step: `uv run python -m backend.app.alerts [--farm farm_x]`."""
    from backend.app.settings import load_settings

    parser = argparse.ArgumentParser(description="Send pending Severe alerts (once per unit per episode).")
    parser.add_argument("--farm", type=str, default=None)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    quiet_http_logs()
    settings = load_settings()
    if not settings.supabase_configured or not (settings.resend_api_key or settings.telegram_configured):
        log.error("Supabase, or both Resend and Telegram, are not configured; nothing sent")
        return 2
    db = SupabaseRest(settings.supabase_url, settings.supabase_service_role_key)  # type: ignore[arg-type]
    mailer = ResendMailer(settings.resend_api_key, settings.from_header) if settings.resend_api_key else None
    tg = TelegramClient(settings.telegram_bot_token) if settings.telegram_bot_token else None
    outcomes = publish_severe_alerts(db, mailer, settings, args.farm, telegram=tg)
    return 1 if any(o.result == "failed" for o in outcomes) else 0


if __name__ == "__main__":
    sys.exit(main())
