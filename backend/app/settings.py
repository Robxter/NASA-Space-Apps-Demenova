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

    @property
    def from_header(self) -> str:
        return f"{self.alert_email_from_name} <{RESEND_TEST_FROM_ADDRESS}>"

    @property
    def email_configured(self) -> bool:
        return self.resend_api_key is not None and self.alert_email_to is not None

    @property
    def supabase_configured(self) -> bool:
        return self.supabase_url is not None and self.supabase_service_role_key is not None


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    env = os.environ if env is None else env
    base = _get(env, "APP_BASE_URL")
    return Settings(
        admin_token=_get(env, "ADMIN_TOKEN"),
        resend_api_key=_get(env, "RESEND_API_KEY"),
        alert_email_to=_get(env, "ALERT_EMAIL_TO"),
        alert_email_from_name=_clean_display_name(_get(env, "ALERT_EMAIL_FROM_NAME")),
        supabase_url=(_get(env, "SUPABASE_URL") or "").rstrip("/") or None,
        supabase_service_role_key=_get(env, "SUPABASE_SERVICE_ROLE_KEY"),
        app_base_url=base.rstrip("/") if base and base.startswith("https://") else None,
    )
