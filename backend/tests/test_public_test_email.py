"""Public POST /alerts/test-email: hCaptcha, rate limits, owner-only demo delivery, scoped CORS. Synthetic fixtures."""

import logging
from urllib.parse import parse_qs

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app import main
from backend.app.captcha import SITEVERIFY_URL, HCaptchaVerifier
from backend.tests import fakes as f

GOOD = "good-captcha-token"
HC_SECRET = "hcaptcha-secret-test-only"
APP_ORIGIN = "https://demenova-app.onrender.com"
PATH = "/alerts/test-email"


class FakeHCaptcha:
    def __init__(self, mode: str = "ok") -> None:
        self.mode = mode
        self.forms: list[dict[str, list[str]]] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        assert str(request.url) == SITEVERIFY_URL
        assert request.headers["content-type"].startswith("application/x-www-form-urlencoded")
        form = parse_qs(request.content.decode())
        self.forms.append(form)
        if self.mode == "down":
            return httpx.Response(500, text="<html>oops</html>")
        if self.mode == "badsecret":
            return httpx.Response(200, json={"success": False, "error-codes": ["invalid-input-secret"]})
        ok = form.get("response") == [GOOD] and form.get("secret") == [HC_SECRET]
        return httpx.Response(200, json={"success": ok} if ok else {"success": False,
                                                                 "error-codes": ["invalid-input-response"]})

    def verifier(self) -> HCaptchaVerifier:
        return HCaptchaVerifier(HC_SECRET, "site-key-test", httpx.Client(transport=httpx.MockTransport(self.handler)))


@pytest.fixture
def ctx():
    db, resend, hc = f.FakePostgrest(), f.FakeResend(), FakeHCaptcha()
    state = {"settings": f.settings(hcaptcha_secret=HC_SECRET), "hc": hc}
    for limiter in (main.test_email_ip_limiter, main.test_email_address_limiter,
                    main.captcha_verify_limiter, main.test_email_send_limiter):
        limiter.reset()
    main.app.dependency_overrides[main.get_settings] = lambda: state["settings"]
    main.app.dependency_overrides[main.get_db] = lambda: db.client()
    main.app.dependency_overrides[main.get_mailer] = (
        lambda: resend.mailer(state["settings"]) if state["settings"].resend_api_key else None
    )
    main.app.dependency_overrides[main.get_captcha] = (
        lambda: state["hc"].verifier() if state["settings"].hcaptcha_secret else None
    )
    yield TestClient(main.app), db, resend, state
    main.app.dependency_overrides.clear()
    for limiter in (main.test_email_ip_limiter, main.test_email_address_limiter,
                    main.captcha_verify_limiter, main.test_email_send_limiter):
        limiter.reset()


def body(email: str = "someone@example.test", token: str = GOOD, lang: str = "en") -> dict:
    return {"email": email, "captcha_token": token, "lang": lang}


def test_not_configured_without_hcaptcha_secret(ctx):
    client, _, resend, state = ctx
    state["settings"] = f.settings(hcaptcha_secret=None)
    r = client.post(PATH, json=body())
    assert r.status_code == 503 and r.json() == {"detail": "Test alerts are not configured."}
    assert resend.requests == []


def test_bad_captcha_is_400_and_sends_nothing(ctx):
    client, _, resend, state = ctx
    r = client.post(PATH, json=body(email=f.INBOX, token="forged"), headers={"X-Forwarded-For": "192.0.2.4"})
    assert r.status_code == 400 and "captcha" in r.json()["detail"]
    assert resend.requests == []
    form = state["hc"].forms[0]
    assert form["secret"] == [HC_SECRET] and form["sitekey"] == ["site-key-test"] and form["remoteip"] == ["192.0.2.4"]


@pytest.mark.parametrize("mode", ["down", "badsecret"])
def test_captcha_service_or_config_problem_is_503(ctx, mode):
    client, _, resend, state = ctx
    state["hc"] = FakeHCaptcha(mode)
    assert client.post(PATH, json=body(email=f.INBOX)).status_code == 503
    assert resend.requests == []


@pytest.mark.parametrize("payload", [
    body(email="not-an-address"), body(email="a b@c.d"),
    {"email": "x@y.zz", "captcha_token": GOOD}, {**body(), "lang": "fr"}, {**body(), "extra": 1},
    {**body(), "captcha_token": ""}, body(email="x" * 250 + "@y.zz"),
])
def test_invalid_bodies_are_422(ctx, payload):
    client, _, resend, _ = ctx
    r = client.post(PATH, json=payload)
    assert r.status_code == 422 and "not-an-address" not in r.text
    assert resend.requests == []


def test_other_address_gets_limited_demo_without_calling_resend(ctx):
    client, db, resend, _ = ctx
    r = client.post(PATH, json=body(email="farmer@example.test"))
    assert r.status_code == 200 and r.json() == {"status": "limited_demo"}
    assert resend.requests == [] and db.tables["email_log"] == []


def test_owner_address_is_sent_case_insensitive_and_never_logged(ctx, caplog):
    caplog.set_level(logging.DEBUG)
    client, db, resend, _ = ctx
    f.seed(db)
    f.add_event(db)
    f.add_state(db)
    r = client.post(PATH, json=body(email="  " + f.INBOX.upper() + " ", lang="en"))
    assert r.status_code == 200 and r.json() == {"status": "sent"}
    (payload,) = resend.payloads
    assert payload["to"] == [f.INBOX]
    assert payload["subject"].startswith("[PRUEBA/TEST] [DEMO] ")
    assert payload["text"].index("LEVEL: RED") < payload["text"].index("NIVEL: ROJO")  # lang=en goes first
    assert "W: 0.90" in payload["text"]
    assert db.tables["email_log"] == [] and db.tables["alert_events"][0]["email_sent"] is False
    assert f.INBOX not in caplog.text and f.INBOX.upper() not in caplog.text


def test_owner_without_events_shows_missing_values(ctx):
    client, _, resend, _ = ctx
    assert client.post(PATH, json=body(email=f.INBOX, lang="es")).json() == {"status": "sent"}
    assert "W: sin dato" in resend.payloads[0]["text"]


def test_provider_rejection_is_502(ctx):
    client, *_ = ctx
    rejecting = f.FakeResend(status=403)
    main.app.dependency_overrides[main.get_mailer] = lambda: rejecting.mailer()
    assert client.post(PATH, json=body(email=f.INBOX)).status_code == 502


def test_rate_limit_per_address(ctx):
    client, *_ = ctx
    for i in range(3):
        hdr = {"X-Forwarded-For": f"203.0.113.{i + 1}"}
        assert client.post(PATH, json=body(email="farmer@example.test"), headers=hdr).status_code == 200
    r = client.post(PATH, json=body(email="FARMER@example.test"), headers={"X-Forwarded-For": "203.0.113.9"})
    assert r.status_code == 429 and "address" in r.json()["detail"]
    assert client.post(PATH, json=body(email="other@example.test")).status_code == 200


def test_rate_limit_per_ip_counts_every_attempt(ctx):
    client, *_ = ctx
    hdr = {"X-Forwarded-For": "198.51.100.7, 10.0.0.1"}
    for i in range(10):
        client.post(PATH, json=body(email=f"user{i}@example.test", token="forged" if i % 2 else GOOD), headers=hdr)
    r = client.post(PATH, json=body(email="new@example.test"), headers=hdr)
    assert r.status_code == 429 and "network" in r.json()["detail"]
    assert client.post(PATH, json=body(email="new@example.test"),
                       headers={"X-Forwarded-For": "198.51.100.8"}).status_code == 200


def test_failed_captcha_does_not_consume_the_address_budget(ctx):
    client, *_ = ctx
    for i in range(5):
        client.post(PATH, json=body(email="farmer@example.test", token="forged"),
                    headers={"X-Forwarded-For": f"203.0.113.{i + 1}"})
    assert client.post(PATH, json=body(email="farmer@example.test")).status_code == 200


def test_cors_preflight_and_response_scoped_to_allowed_origins(ctx):
    client, *_ = ctx
    pre = client.options(PATH, headers={"Origin": APP_ORIGIN, "Access-Control-Request-Method": "POST"})
    assert pre.status_code == 204 and pre.headers["access-control-allow-origin"] == APP_ORIGIN
    assert pre.headers["access-control-allow-methods"] == "POST, OPTIONS"
    for origin in ("http://127.0.0.1:4173", "http://localhost:5173"):
        assert client.options(PATH, headers={"Origin": origin}).status_code == 204
    bad = client.options(PATH, headers={"Origin": "https://evil.example"})
    assert bad.status_code == 403 and "access-control-allow-origin" not in bad.headers
    r = client.post(PATH, json=body(), headers={"Origin": APP_ORIGIN})
    assert r.headers["access-control-allow-origin"] == APP_ORIGIN and r.headers["vary"] == "Origin"
    r = client.post(PATH, json=body(), headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers
    h = client.get("/health", headers={"Origin": APP_ORIGIN})
    assert "access-control-allow-origin" not in h.headers  # no CORS anywhere else
    assert client.options("/run", headers={"Origin": APP_ORIGIN}).status_code in (404, 405)



# ------------------------------------------------------------------- security review block 4 regressions


def test_client_ip_uses_the_right_most_valid_forwarded_entry():
    from starlette.requests import Request

    def req(xff: str | None) -> Request:
        headers = [(b"x-forwarded-for", xff.encode())] if xff is not None else []
        return Request({"type": "http", "headers": headers, "client": ("192.0.2.200", 1)})

    assert main.client_ip(req("1.2.3.4, 5.6.7.8")) == "5.6.7.8"
    assert main.client_ip(req("1.2.3.4, 5.6.7.8, junk")) == "5.6.7.8"
    assert main.client_ip(req("junk")) == "192.0.2.200"
    assert main.client_ip(req(None)) == "192.0.2.200"


def test_rotating_the_forged_left_entry_does_not_escape_the_ip_limit(ctx):
    """M1: the caller controls only the left-most entries."""
    client, *_ = ctx
    for i in range(10):
        hdr = {"X-Forwarded-For": f"10.9.{i}.1, 203.0.113.50"}
        client.post(PATH, json=body(email=f"user{i}@example.test"), headers=hdr)
    r = client.post(PATH, json=body(email="new@example.test"), headers={"X-Forwarded-For": "10.99.0.1, 203.0.113.50"})
    assert r.status_code == 429 and "network" in r.json()["detail"]


def test_global_captcha_cap_stops_outbound_verifications(ctx):
    """M1: at most CAPTCHA_VERIFY_PER_MINUTE siteverify calls per minute, whatever the IPs and addresses."""
    client, _, _, state = ctx
    cap = main.CAPTCHA_VERIFY_PER_MINUTE
    for i in range(cap):
        client.post(PATH, json=body(email=f"u{i}@example.test", token="forged"),
                    headers={"X-Forwarded-For": f"198.51.{i // 200}.{i % 200 + 1}"})
    r = client.post(PATH, json=body(email="last@example.test"), headers={"X-Forwarded-For": "192.0.2.77"})
    assert r.status_code == 429 and "minute" in r.json()["detail"]
    assert len(state["hc"].forms) == cap


def test_global_send_cap_survives_key_eviction(ctx):
    """M3: total Resend calls from the public endpoint are capped, even if the address key is reset or evicted."""
    client, _, resend, _ = ctx
    cap = main.TEST_EMAIL_SENDS_PER_HOUR
    for i in range(cap):
        main.test_email_address_limiter.reset()  # as if a flood had evicted the owner's address key
        r = client.post(PATH, json=body(email=f.INBOX), headers={"X-Forwarded-For": f"203.0.113.{i + 1}"})
        assert r.json() == {"status": "sent"}
    main.test_email_address_limiter.reset()
    r = client.post(PATH, json=body(email=f.INBOX), headers={"X-Forwarded-For": "203.0.113.99"})
    assert r.status_code == 429 and "demo inbox" in r.json()["detail"]
    assert len(resend.requests) == cap


def test_oversized_or_unsized_bodies_are_rejected_before_any_work(ctx):
    """M1 and L4: 4 KB cap with CORS headers kept, and no chunked bodies."""
    client, _, resend, state = ctx
    big = body(token="x" * 5000)
    r = client.post(PATH, json=big, headers={"Origin": APP_ORIGIN})
    assert r.status_code == 413 and r.headers["access-control-allow-origin"] == APP_ORIGIN
    chunked = client.post(PATH, content=iter([b'{"email": "a@b.cc", ', b'"captcha_token": "t", "lang": "en"}']),
                          headers={"Content-Type": "application/json"})
    assert chunked.status_code == 411
    assert state["hc"].forms == [] and resend.requests == []
