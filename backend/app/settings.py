"""Backend configuration, read only from environment variables (names in `.env.example` and openapi.yaml).

Never log a value from here. Empty variables count as unset. Settings are read per request (not cached at
import), so a changed Render variable takes effect after a restart and tests can pass their own mapping.
"""

import os
import re
from collections.abc import Mapping
from dataclasses import dataclass

# Resend's shared test sender. Without a verified domain it reaches only the Resend account owner's inbox, which
# is accepted for the demo (docs/spec/13). Using the owned domain needs the product owner's approval (class A).
RESEND_TEST_FROM_ADDRESS = "onboarding@resend.dev"
DEFAULT_FROM_NAME = "Demenova Alerts"
# A shorter ADMIN_TOKEN counts as unset, so the admin endpoints stay closed (security review L1).
# Generate one with: python -c "import secrets;print(secrets.token_hex(32))"
MIN_ADMIN_TOKEN_LENGTH = 32
_TG_SECRET = re.compile(r"^[A-Za-z0-9_-]{1,256}$")


def _get(env: Mapping[str, str], name: str) -> str | None:
    value = env.get(name, "").strip()
    return value or None


def _clean_display_name(value: str | None) -> str:
    """A From display name without characters that could break the header."""
    if value is None:
        return DEFAULT_FROM_NAME
    cleaned = re.sub(r"[\r\n<>\"@,;]", "", value).strip()
    return cleaned or DEFAULT_FROM_NAME


@dataclass(frozen=True)
class Settings:
    admin_token: str | None
    resend_api_key: str | None
    alert_email_to: str | None
    alert_email_from_name: str
    supabase_url: str | None
    supabase_service_role_key: str | None
    app_base_url: str | None
    hcaptcha_secret: str | None = None
    hcaptcha_sitekey: str | None = None
    telegram_bot_token: str | None = None
    telegram_webhook_secret: str | None = None

    @property
    def from_header(self) -> str:
        return f"{self.alert_email_from_name} <{RESEND_TEST_FROM_ADDRESS}>"

    @property
    def email_configured(self) -> bool:
        return self.resend_api_key is not None and self.alert_email_to is not None

    @property
    def telegram_configured(self) -> bool:
        return self.telegram_bot_token is not None

    @property
    def supabase_configured(self) -> bool:
        return self.supabase_url is not None and self.supabase_service_role_key is not None


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    env = os.environ if env is None else env
    base = _get(env, "APP_BASE_URL")
    token = _get(env, "ADMIN_TOKEN")
    webhook_secret = _get(env, "TELEGRAM_WEBHOOK_SECRET")
    return Settings(
        admin_token=token if token and len(token) >= MIN_ADMIN_TOKEN_LENGTH else None,
        resend_api_key=_get(env, "RESEND_API_KEY"),
        alert_email_to=_get(env, "ALERT_EMAIL_TO"),
        alert_email_from_name=_clean_display_name(_get(env, "ALERT_EMAIL_FROM_NAME")),
        supabase_url=(_get(env, "SUPABASE_URL") or "").rstrip("/") or None,
        supabase_service_role_key=_get(env, "SUPABASE_SERVICE_ROLE_KEY"),
        app_base_url=base.rstrip("/") if base and base.startswith("https://") else None,
        hcaptcha_secret=_get(env, "HCAPTCHA_SECRET"),
        # Optional: hCaptcha recommends passing the expected site key so tokens from another key are rejected.
        hcaptcha_sitekey=_get(env, "HCAPTCHA_SITEKEY") or _get(env, "VITE_HCAPTCHA_SITEKEY"),
        telegram_bot_token=_get(env, "TELEGRAM_BOT_TOKEN"),
        # Telegram allows 1-256 characters A-Z a-z 0-9 _ - (setWebhook secret_token); anything else counts as unset.
        telegram_webhook_secret=webhook_secret if webhook_secret and _TG_SECRET.match(webhook_secret) else None,
    )
