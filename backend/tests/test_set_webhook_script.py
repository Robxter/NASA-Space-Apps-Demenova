"""backend/scripts/set_telegram_webhook.py: env-only secrets, exact setWebhook payload, prints no secret."""

import json

import httpx

from backend.scripts.set_telegram_webhook import DEFAULT_URL, main

TOKEN = "123456:TEST-bot-token-only"  # synthetic
SECRET = "webhook-secret_test-only"
ENV = {"TELEGRAM_BOT_TOKEN": TOKEN, "TELEGRAM_WEBHOOK_SECRET": SECRET}


def fake(reply: dict, seen: list):
    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=reply)

    return httpx.Client(transport=httpx.MockTransport(handler))


def test_sets_webhook_and_prints_only_ok_and_description(capsys):
    seen: list[httpx.Request] = []
    code = main([], ENV, fake({"ok": True, "result": True, "description": "Webhook was set"}, seen))
    assert code == 0
    (req,) = seen
    assert req.url.path == f"/bot{TOKEN}/setWebhook"
    assert json.loads(req.content) == {"url": DEFAULT_URL, "secret_token": SECRET, "allowed_updates": ["message"]}
    out = capsys.readouterr().out
    assert out.strip() == "ok=True description=Webhook was set"
    assert TOKEN not in out and SECRET not in out


def test_failure_and_missing_or_bad_env(capsys):
    seen: list[httpx.Request] = []
    assert main([], ENV, fake({"ok": False, "description": f"bad token {TOKEN}"}, seen)) == 1
    assert TOKEN not in capsys.readouterr().out
    assert main([], {}, fake({}, seen)) == 2
    assert main([], {**ENV, "TELEGRAM_WEBHOOK_SECRET": "has space"}, fake({}, seen)) == 2
    assert main(["--url", "http://insecure.example/x"], ENV, fake({}, seen)) == 2
    assert len(seen) == 1
