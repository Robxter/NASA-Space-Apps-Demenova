"""HTTP surface: health, admin-token checks, /run, /email/test, Telegram placeholder. Synthetic fixtures only."""

import pytest
from fastapi.testclient import TestClient

from backend.app import main
from backend.tests import fakes as f


@pytest.fixture
def ctx():
    db, resend = f.FakePostgrest(), f.FakeResend()
    state = {"settings": f.settings()}
    main.email_test_throttle.reset()
    main.app.dependency_overrides[main.get_settings] = lambda: state["settings"]
    main.app.dependency_overrides[main.get_db] = lambda: db.client() if state["settings"].supabase_configured else None
    main.app.dependency_overrides[main.get_mailer] = (
        lambda: resend.mailer(state["settings"]) if state["settings"].resend_api_key else None
    )
    yield TestClient(main.app), db, resend, state
    main.app.dependency_overrides.clear()
    main.email_test_throttle.reset()


ADMIN = {"X-Admin-Token": f.ADMIN}


def test_health(ctx):
    client, *_ = ctx
    r = client.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


@pytest.mark.parametrize("path", ["/run", "/email/test"])
@pytest.mark.parametrize("headers", [{}, {"X-Admin-Token": "wrong"}, {"X-Admin-Token": ""},
                                     {"Authorization": f"Bearer {f.ADMIN}"}])
def test_admin_endpoints_reject_missing_or_wrong_token(ctx, path, headers):
    client, _, resend, _ = ctx
    r = client.post(path, json={"farm_id": None}, headers=headers)
    assert r.status_code == 401
    assert "wrong" not in r.text and f.ADMIN not in r.text
    assert resend.requests == []


def test_admin_endpoints_closed_when_token_unset(ctx):
    client, _, _, state = ctx
    state["settings"] = f.settings(admin_token=None)
    assert client.post("/run", json={"farm_id": None}, headers=ADMIN).status_code == 401
    assert client.post("/email/test", headers=ADMIN).status_code == 401


def test_unauthorised_body_is_not_validated_first(ctx):
    client, *_ = ctx
    assert client.post("/run", json={"bogus": 1}).status_code == 401


def test_run_accepts_all_farms_and_publishes(ctx):
    client, db, resend, _ = ctx
    f.seed(db)
    f.add_event(db)
    f.add_state(db)
    r = client.post("/run", json={"farm_id": None}, headers=ADMIN)
    assert r.status_code == 202
    body = r.json()
    assert len(body["run_id"]) == 26 and body["farm_id"] is None and body["accepted_at"].endswith("Z")
    assert len(resend.requests) == 1  # background task ran after the response


def test_run_unknown_farm_404_and_bad_body_422(ctx):
    client, db, *_ = ctx
    f.seed(db)
    assert client.post("/run", json={"farm_id": "farm_nope"}, headers=ADMIN).status_code == 404
    assert client.post("/run", json={"farm_id": f.FARM}, headers=ADMIN).status_code == 202
    for bad in ({"farm_id": "farm_x'); drop"}, {}, {"farm_id": None, "extra": 1}):
        r = client.post("/run", json=bad, headers=ADMIN)
        assert r.status_code == 422 and "drop" not in r.text


def test_run_without_database_is_503(ctx):
    client, _, _, state = ctx
    state["settings"] = f.settings(supabase_url=None)
    assert client.post("/run", json={"farm_id": None}, headers=ADMIN).status_code == 503


def test_email_test_not_configured_is_503(ctx):
    client, _, _, state = ctx
    state["settings"] = f.settings(resend_api_key=None)
    r = client.post("/email/test", headers=ADMIN)
    assert r.status_code == 503 and f.RESEND_KEY not in r.text
    state["settings"] = f.settings(alert_email_to=None)
    assert client.post("/email/test", headers=ADMIN).status_code == 503


def test_email_test_uses_real_event_and_never_logs(ctx):
    client, db, resend, _ = ctx
    f.seed(db)
    f.add_event(db)
    f.add_state(db)
    r = client.post("/email/test", headers=ADMIN)
    assert r.status_code == 200 and r.json() == {"status": "sent", "provider_id": "fake-provider-id-1"}
    payload = resend.payloads[0]
    assert payload["subject"].startswith("[PRUEBA/TEST] [DEMO] ")
    assert "0.90" in payload["text"] and "Lote 1" in payload["text"]
    assert db.tables["email_log"] == [] and db.tables["alert_events"][0]["email_sent"] is False
    assert "Idempotency-Key" not in resend.requests[0].headers


def test_email_test_without_events_shows_missing_values(ctx):
    client, _, resend, _ = ctx
    r = client.post("/email/test", headers=ADMIN)
    assert r.status_code == 200
    text = resend.payloads[0]["text"]
    assert "W: sin dato" in text and "W: missing" in text


def test_email_test_provider_rejection(ctx):
    client, *_ = ctx
    rejecting = f.FakeResend(status=403)
    main.app.dependency_overrides[main.get_mailer] = lambda: rejecting.mailer()
    r = client.post("/email/test", headers=ADMIN)
    assert r.status_code == 200 and r.json() == {"status": "failed", "provider_id": None}


def test_telegram_webhook_not_built_yet(ctx):
    client, *_ = ctx
    assert client.post("/telegram/webhook", json={}).status_code == 501


def test_short_admin_token_counts_as_unset(ctx):
    """Security review L1: a configured token under 32 characters keeps the admin endpoints closed."""
    from backend.app.settings import load_settings

    client, _, _, state = ctx
    short = "x" * 31
    assert load_settings({"ADMIN_TOKEN": short}).admin_token is None
    assert load_settings({"ADMIN_TOKEN": "y" * 32}).admin_token == "y" * 32
    state["settings"] = load_settings({"ADMIN_TOKEN": short, "SUPABASE_URL": f.SUPABASE_URL,
                                       "SUPABASE_SERVICE_ROLE_KEY": f.SERVICE_KEY})
    assert client.post("/run", json={"farm_id": None}, headers={"X-Admin-Token": short}).status_code == 401


def test_email_test_is_throttled(ctx):
    """Security review L2: a second test email within the interval gets 429 and reaches no provider."""
    client, _, resend, _ = ctx
    assert client.post("/email/test", headers=ADMIN).status_code == 200
    r = client.post("/email/test", headers=ADMIN)
    assert r.status_code == 429 and len(resend.requests) == 1
    main.email_test_throttle.reset()
    assert client.post("/email/test", headers=ADMIN).status_code == 200


def test_httpx_request_logs_are_quiet():
    """Security review L3: httpx INFO lines (request URLs) are not emitted."""
    import logging

    assert logging.getLogger("httpx").getEffectiveLevel() >= logging.WARNING
