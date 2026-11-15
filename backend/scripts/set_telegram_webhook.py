"""One-time: point @DemenovaBot's webhook at the deployed backend (Telegram Bot API setWebhook).

Run once after deploy, from the repository root, with the secrets loaded from the environment only:

    uv run --env-file .env python -m backend.scripts.set_telegram_webhook

Reads TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from the environment (never from a file it opens itself) and
prints only Telegram's `ok` and `description`. setWebhook parameters checked 2026-11-15 at
https://core.telegram.org/bots/api#setwebhook: url, secret_token (1-256 characters A-Z a-z 0-9 _ -),
allowed_updates. The same TELEGRAM_WEBHOOK_SECRET must be set on Render, or the webhook answers 401.
"""

import argparse
import os
import re
import sys
from collections.abc import Mapping

import httpx

DEFAULT_URL = "https://demenova-api.onrender.com/telegram/webhook"
SECRET_RE = re.compile(r"^[A-Za-z0-9_-]{1,256}$")


def main(argv: list[str] | None = None, env: Mapping[str, str] | None = None,
         client: httpx.Client | None = None) -> int:
    parser = argparse.ArgumentParser(description="Set the Telegram webhook of the Demenova bot (run once).")
    parser.add_argument("--url", default=DEFAULT_URL, help="https URL of POST /telegram/webhook")
    args = parser.parse_args(argv)
    env = os.environ if env is None else env
    token = env.get("TELEGRAM_BOT_TOKEN", "").strip()
    secret = env.get("TELEGRAM_WEBHOOK_SECRET", "").strip()
    if not token or not secret:
        print("TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET must be set in the environment.")
        return 2
    if not SECRET_RE.match(secret):
        print("TELEGRAM_WEBHOOK_SECRET may only use A-Z a-z 0-9 _ - (1-256 characters).")
        return 2
    if not args.url.startswith("https://"):
        print("The webhook URL must be https.")
        return 2
    client = client or httpx.Client(timeout=15.0)
    payload = {"url": args.url, "secret_token": secret, "allowed_updates": ["message"]}
    try:
        data = client.post(f"https://api.telegram.org/bot{token}/setWebhook", json=payload).json()
    except (httpx.HTTPError, ValueError) as exc:
        print(f"ok=False description=request failed ({type(exc).__name__})")
        return 1
    ok = isinstance(data, dict) and data.get("ok") is True
    description = data.get("description", "") if isinstance(data, dict) else ""
    print(f"ok={ok} description={str(description).replace(token, '***')[:300]}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
