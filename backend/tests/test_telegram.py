"""Telegram bot: webhook secret, /start /stop /help /estado, update_id idempotency, Severe fan-out with dedupe.

All rows, chat ids and tokens are SYNTHETIC test fixtures (origin: synthetic).
"""

import json
import logging

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app import main
from backend.app.alerts import publish_severe_alerts, publish_telegram
from backend.app.telegram import TelegramClient
from backend.tests import fakes as f

TOKEN = "123456:TEST-bot-token-only"
SECRET = "webhook-secret_test-only"
CODE = "0123456789abcdef0123456789abcdef"  # synthetic telegram_code (32 hex characters)
CHAT = 987654321
STALE_H = 12.0


class FakeTelegram:
    def __init__(self, ok: bool = True) -> None:
        self.ok = ok
        self.calls: list[tuple[str, dict]] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        prefix = f"/bot{TOKEN}/"
        assert request.url.host == "api.telegram.org" and request.url.path.startswith(prefix)
        self.calls.append((request.url.path[len(prefix):], json.loads(request.content)))
        if not self.ok:
            return httpx.Response(403, json={"ok": False, "error_code": 403, "description": "Forbidden"})
        return httpx.Response(200, json={"ok": True, "result": {}})

    def client(self) -> TelegramClient:
        return TelegramClient(TOKEN, httpx.Client(transport=httpx.MockTransport(self.handler)))

    @property
    def texts(self) -> list[str]:
        return [payload["text"] for method, payload in self.calls if method == "sendMessage"]


def seed_demo(db: f.FakePostgrest) -> None:
    f.seed(db)
    db.tables["farms"][0]["telegram_code"] = CODE
    f.add_event(db)
    f.add_state(db)


def update(text: str, update_id: int = 1, lang: str | None = "en", chat: int = CHAT) -> dict:
    sender = {"id": chat, "is_bot": False, "first_name": "Synthetic"}
    if lang:
        sender["language_code"] = lang
    return {"update_id": update_id, "message": {"message_id": update_id, "date": 0, "text": text,
                                                "chat": {"id": chat, "type": "private"}, "from": sender}}


@pytest.fixture
def ctx():
    db, tg = f.FakePostgrest(), FakeTelegram()
    state = {"settings": f.settings(telegram_bot_token=TOKEN, telegram_webhook_secret=SECRET), "tg": tg}
    main.telegram_updates.reset()
    main.app.dependency_overrides[main.get_settings] = lambda: state["settings"]
    main.app.dependency_overrides[main.get_db] = lambda: db.client()
    main.app.dependency_overrides[main.get_telegram] = (
        lambda: state["tg"].client() if state["settings"].telegram_bot_token else None
    )
    client = TestClient(main.app)

    def post(body: dict, secret: str | None = SECRET):
        headers = {"X-Telegram-Bot-Api-Secret-Token": secret} if secret is not None else {}
        return client.post("/telegram/webhook", json=body, headers=headers)

    yield post, db, tg, state
    main.app.dependency_overrides.clear()
    main.telegram_updates.reset()


@pytest.mark.parametrize("secret", [None, "", "wrong", SECRET + "x"])
def test_webhook_rejects_missing_or_wrong_secret(ctx, secret):
    post, db, tg, _ = ctx
    seed_demo(db)
    r = post(update("/start"), secret=secret)
    assert r.status_code == 401 and SECRET not in r.text
    assert tg.calls == [] and db.tables["telegram_subscribers"] == []


def test_webhook_closed_when_secret_unset(ctx):
    post, _, tg, state = ctx
    state["settings"] = f.settings(telegram_bot_token=TOKEN, telegram_webhook_secret=None)
    assert post(update("/start")).status_code == 401 and tg.calls == []


def test_start_subscribes_demo_farm_and_sends_test_alert(ctx):
    post, db, tg, _ = ctx
    seed_demo(db)
    r = post(update("/start"))
    assert r.status_code == 200 and r.json() == {"ok": True}
    (sub,) = db.tables["telegram_subscribers"]
    assert sub["chat_id"] == str(CHAT) and sub["farm_id"] == f.FARM and sub["telegram_code"] == CODE
    assert sub["active"] is True
    confirm, alert = tg.texts
    assert "DEMO farm" in confirm
    assert alert.startswith("[TEST] [DEMO] LEVEL: RED — SEVERE")
    assert "Lote 1" in alert and "W: 0.90" in alert and "Upstream rain 50%" in alert
    assert "22/02/2026 10:00 (Ecuador time, UTC−5)" in alert
    assert "Built with NASA Earth observations." in alert and "does not replace" in alert
    assert "https://app.example.test/#lot/lot_test-demo_1?d=2026-02-22" in alert
    assert all(p.get("link_preview_options") == {"is_disabled": True} for _, p in tg.calls)


def test_start_in_spanish(ctx):
    post, db, tg, _ = ctx
    seed_demo(db)
    post(update("/start", lang="es-419"))
    confirm, alert = tg.texts
    assert "finca DEMO" in confirm and alert.startswith("[PRUEBA] [DEMO] NIVEL: ROJO — SEVERO")
    assert "Construido con observaciones de la Tierra de la NASA." in alert


def test_start_with_code_and_unknown_code(ctx):
    post, db, tg, _ = ctx
    seed_demo(db)
    post(update(f"/start {CODE}", update_id=1))
    assert [s["farm_id"] for s in db.tables["telegram_subscribers"]] == [f.FARM]
    post(update("/start ZZZZZZZZZZZZZZZZZZZZ", update_id=2, chat=111))
    post(update("/start bad;code", update_id=3, chat=222))
    assert len(db.tables["telegram_subscribers"]) == 1
    assert "not recognised" in tg.texts[-1] and "not recognised" in tg.texts[-2]


def test_start_without_events_says_so_and_never_invents(ctx):
    post, db, tg, _ = ctx
    f.seed(db)
    db.tables["farms"][0]["telegram_code"] = CODE
    post(update("/start"))
    assert tg.texts[-1] == "There is no Severe episode to show as a test yet."


def test_stop_and_restart_reuse_one_row(ctx):
    post, db, tg, _ = ctx
    seed_demo(db)
    post(update("/start", update_id=1))
    post(update("/stop", update_id=2))
    assert db.tables["telegram_subscribers"][0]["active"] is False
    assert "no longer receive" in tg.texts[-1]
    post(update("/start@DemenovaBot", update_id=3))
    assert len(db.tables["telegram_subscribers"]) == 1 and db.tables["telegram_subscribers"][0]["active"] is True


def test_help_and_free_text(ctx):
    post, db, tg, _ = ctx
    post(update("/help", update_id=1))
    post(update("hola", update_id=2, lang="es"))
    assert "/stop" in tg.texts[0] and "Built with NASA Earth observations" in tg.texts[0]
    assert tg.texts[1].startswith("Comandos:") and db.tables["telegram_subscribers"] == []


def test_status_lists_levels_with_colour_and_word(ctx):
    post, db, tg, _ = ctx
    seed_demo(db)
    post(update("/estado", update_id=1, lang="es"))
    assert "no está suscrito" in tg.texts[-1]
    post(update("/start", update_id=2, lang="es"))
    post(update("/estado", update_id=3, lang="es"))
    assert "lot_test-demo_1: Severo (rojo)" in tg.texts[-1]


def test_repeated_update_id_is_handled_once(ctx):
    post, db, tg, _ = ctx
    seed_demo(db)
    for _ in range(3):
        assert post(update("/start", update_id=42)).status_code == 200
    assert len(tg.texts) == 2


@pytest.mark.parametrize("body", [
    {"update_id": 5, "edited_message": {"text": "/start"}},
    {"update_id": "5", "message": {"text": "/start", "chat": {"id": 1}}},
    {"update_id": 6, "message": {"text": "/start", "chat": {"id": "abc"}}},
    {"update_id": 7, "message": {"photo": [], "chat": {"id": 1}}},
    {"message": {"text": "/start"}},
])
def test_irrelevant_or_malformed_updates_are_ignored(ctx, body):
    post, db, tg, _ = ctx
    seed_demo(db)
    assert post(body).status_code == 200 and tg.calls == []


def test_no_token_or_failing_database_still_answers_200(ctx):
    post, db, tg, state = ctx
    seed_demo(db)
    state["settings"] = f.settings(telegram_bot_token=None, telegram_webhook_secret=SECRET)
    assert post(update("/start", update_id=1)).status_code == 200 and tg.calls == []
    state["settings"] = f.settings(telegram_bot_token=TOKEN, telegram_webhook_secret=SECRET)
    db.fail_tables.add("farms")
    assert post(update("/start", update_id=2)).status_code == 200


def test_logs_hold_no_token_and_no_full_chat_id(ctx, caplog):
    caplog.set_level(logging.DEBUG)
    post, db, _, state = ctx
    seed_demo(db)
    state["tg"] = FakeTelegram(ok=False)
    post(update("/start"))
    assert TOKEN not in caplog.text and str(CHAT) not in caplog.text and SECRET not in caplog.text


# ------------------------------------------------------------------------------------------- Severe fan-out


def subscribe(db: f.FakePostgrest, chat: int, active: bool = True) -> None:
    db.tables["telegram_subscribers"].append({"chat_id": str(chat), "farm_id": f.FARM, "telegram_code": CODE,
                                              "started_at": f.T0, "active": active})


def fan_out(db: f.FakePostgrest, tg: FakeTelegram, mailer=None):
    s = f.settings()
    return publish_severe_alerts(db.client(), mailer, s, stale_after_hours=STALE_H, telegram=tg.client())


def test_fan_out_reaches_active_subscribers_once_per_episode():
    db, tg = f.FakePostgrest(), FakeTelegram()
    seed_demo(db)
    subscribe(db, 1001)
    subscribe(db, 1002, active=False)
    outcomes = fan_out(db, tg)
    assert [(o.channel, o.result) for o in outcomes] == [("telegram", "sent")]
    assert [p["chat_id"] for _, p in tg.calls] == ["1001"]
    assert tg.texts[0].startswith("[DEMO] NIVEL: ROJO — SEVERO") and "LEVEL: RED — SEVERE" in tg.texts[0]
    assert "[TEST]" not in tg.texts[0] and "[PRUEBA]" not in tg.texts[0]
    assert db.tables["alert_events"][0]["telegram_sent"] is True
    assert fan_out(db, tg) == [] and len(tg.calls) == 1  # flagged: not selected again


def test_fan_out_and_email_are_independent():
    db, tg, resend = f.FakePostgrest(), FakeTelegram(), f.FakeResend()
    seed_demo(db)
    subscribe(db, 1001)
    outcomes = fan_out(db, tg, mailer=resend.mailer())
    assert sorted((o.channel, o.result) for o in outcomes) == [("email", "sent"), ("telegram", "sent")]
    assert len(resend.requests) == 1 and len(tg.calls) == 1


def test_stale_never_reaches_telegram():
    db, tg = f.FakePostgrest(), FakeTelegram()
    f.seed(db)
    f.add_event(db)
    f.add_state(db, level="stale")
    subscribe(db, 1001)
    assert [o.result for o in fan_out(db, tg)] == ["skipped:stale"] and tg.calls == []
    assert db.tables["alert_events"][0]["telegram_sent"] is False


def test_all_sends_failing_undoes_the_claim_for_a_retry():
    db = f.FakePostgrest()
    seed_demo(db)
    subscribe(db, 1001)
    assert [o.result for o in fan_out(db, FakeTelegram(ok=False))] == ["failed"]
    assert db.tables["alert_events"][0]["telegram_sent"] is False
    ok = FakeTelegram()
    assert [o.result for o in fan_out(db, ok)] == ["sent"] and len(ok.calls) == 1


def test_no_subscribers_leaves_event_unflagged():
    db, tg = f.FakePostgrest(), FakeTelegram()
    seed_demo(db)
    assert [o.result for o in fan_out(db, tg)] == ["skipped:no_subscribers"]
    assert db.tables["alert_events"][0]["telegram_sent"] is False


def test_conditional_claim_prevents_a_second_fan_out():
    """Another run flagged the event between our read and our claim: we send nothing."""
    from backend.app.alerts import AlertEvent, _model

    db, tg = f.FakePostgrest(), FakeTelegram()
    seed_demo(db)
    subscribe(db, 1001)
    event = _model(AlertEvent, db.tables["alert_events"][0])
    db.tables["alert_events"][0]["telegram_sent"] = True
    farm = db.tables["farms"][0]
    out = publish_telegram(db.client(), tg.client(), f.settings(), event, farm, STALE_H)
    assert out.result == "skipped:duplicate" and tg.calls == []
