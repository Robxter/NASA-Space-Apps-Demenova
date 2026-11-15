"""Severe alert email: bilingual template (Spanish first, then English) and the Resend REST call.

Resend API checked on 2026-11-15: https://resend.com/docs/api-reference/emails/send-email (POST
https://api.resend.com/emails, bearer key, body from/to/subject/html/text, optional Idempotency-Key header, keys
expire after 24 h, max 256 characters; success returns {"id": ...}) and https://resend.com/docs/api-reference/errors
(403 validation_error when the test sender targets anyone but the account owner; 429 rate and quota limits).

Rule zero: every number in the email comes from an AlertState/AlertEvent row; a missing value is printed as missing,
never filled. Severity is colour AND word. Times are shown in America/Guayaquil.
"""

import datetime as dt
import hashlib
import html
import logging
import unicodedata
from dataclasses import dataclass, field

import httpx

from pipeline.common.models import EmailStatus, Factor

log = logging.getLogger("demenova.email")

RESEND_URL = "https://api.resend.com/emails"

try:
    from zoneinfo import ZoneInfo

    DISPLAY_TZ: dt.tzinfo = ZoneInfo("America/Guayaquil")
except Exception:  # noqa: BLE001 - no tz database (bare Windows): Ecuador has no DST, UTC-5 is exact for 2026
    DISPLAY_TZ = dt.timezone(dt.timedelta(hours=-5), "America/Guayaquil")

# Same wording as the app dictionaries (app/src/i18n/{es,en}.ts).
FACTOR_NAMES: dict[str, tuple[str, str]] = {
    "upstream": ("Lluvia aguas arriba", "Upstream rain"),
    "saturation": ("Saturación del suelo", "Soil saturation"),
    "terrain": ("Humedad del terreno", "Terrain wetness"),
    "local": ("Lluvia local", "Local rain"),
    "balance": ("Balance hídrico", "Water balance"),
}
ZONE_NAMES: dict[str, tuple[str, str]] = {
    "low": ("zona baja", "low zone"),
    "mid": ("zona media", "middle zone"),
    "high": ("zona alta", "high zone"),
}
MISSING = ("sin dato", "missing")
SEVERE_COLOUR = "#b91c1c"


@dataclass(frozen=True)
class SevereEmail:
    """Everything the template shows. Any None is printed as missing."""

    unit_id: str
    unit_name: str
    farm_name: str
    is_demo: bool
    w: float | None
    factors: list[Factor] = field(default_factory=list)
    episode_start: dt.datetime | None = None
    updated_at: dt.datetime | None = None
    newest_rain_data_at: dt.datetime | None = None
    link: str | None = None
    test: bool = False


@dataclass(frozen=True)
class SendResult:
    status: EmailStatus
    provider_id: str | None
    http_status: int | None


def hash_recipient(address: str) -> str:
    """email_log.to_hash: SHA-256 of the normalised address with a domain-separation prefix."""
    return "sha256:" + hashlib.sha256(f"demenova-email-v1:{address.strip().lower()}".encode()).hexdigest()


MAX_NAME_CHARS = 80


def _one_line(text: str) -> str:
    return " ".join(text.split())


def clean_name(text: str, limit: int = MAX_NAME_CHARS) -> str:
    """User-typed names: no control or format characters, one line, at most `limit` characters (review L4)."""
    kept = "".join(ch if unicodedata.category(ch) not in {"Cc", "Cf"} else " " for ch in text)
    kept = _one_line(kept)
    return kept if len(kept) <= limit else kept[: limit - 1].rstrip() + "…"


def format_time(value: dt.datetime | None) -> tuple[str, str]:
    """(es, en) display of a UTC timestamp in America/Guayaquil, DD/MM/YYYY HH:MM."""
    if value is None:
        return MISSING
    local = value.astimezone(DISPLAY_TZ).strftime("%d/%m/%Y %H:%M")
    return (f"{local} (hora de Ecuador, UTC−5)", f"{local} (Ecuador time, UTC−5)")


def top_factors(factors: list[Factor], n: int = 2) -> list[Factor]:
    return sorted(factors, key=lambda f: f.share, reverse=True)[:n]


def _factor_lines(factors: list[Factor]) -> tuple[str, str]:
    top = top_factors(factors)
    if not top:
        return MISSING
    es = ", ".join(f"{FACTOR_NAMES[f.name][0]} {round(f.share * 100)} %" for f in top)
    en = ", ".join(f"{FACTOR_NAMES[f.name][1]} {round(f.share * 100)}%" for f in top)
    return es, en


def unit_kind(unit_id: str) -> tuple[str, str]:
    if unit_id.startswith("lot_"):
        return "Lote", "Lot"
    if unit_id.startswith("zone_"):
        return "Zona", "Zone"
    return "Finca", "Farm"


def render(mail: SevereEmail) -> tuple[str, str, str]:
    """Return (subject, html, text)."""
    unit_name, farm_name = clean_name(mail.unit_name), clean_name(mail.farm_name)
    unit_id = clean_name(mail.unit_id)
    prefix = ("[PRUEBA/TEST] " if mail.test else "") + ("[DEMO] " if mail.is_demo else "")
    subject = _one_line(f"{prefix}Riesgo SEVERO / SEVERE risk: {unit_name} ({farm_name})")[:200]

    w_txt = f"{mail.w:.2f}" if mail.w is not None else None
    w_es, w_en = (w_txt, w_txt) if w_txt else MISSING
    f_es, f_en = _factor_lines(mail.factors)
    ep_es, ep_en = format_time(mail.episode_start)
    up_es, up_en = format_time(mail.updated_at)
    rain_es, rain_en = format_time(mail.newest_rain_data_at)

    kind_es, kind_en = unit_kind(mail.unit_id)
    lines_es = [
        "NIVEL: ROJO — SEVERO",
        f"{kind_es}: {unit_name} ({unit_id}) · Finca: {farm_name}",
        f"Índice de alerta W: {w_es}",
        f"Factores principales (parte de W): {f_es}",
        f"Severo desde: {ep_es}",
        f"Datos actualizados: {up_es}",
        f"Dato de lluvia más reciente: {rain_es}",
    ]
    lines_en = [
        "LEVEL: RED — SEVERE",
        f"{kind_en}: {unit_name} ({unit_id}) · Farm: {farm_name}",
        f"Alert index W: {w_en}",
        f"Main factors (share of W): {f_en}",
        f"Severe since: {ep_en}",
        f"Data updated: {up_en}",
        f"Newest rain data: {rain_en}",
    ]
    notes_es = [
        "Esta alerta apoya, y no reemplaza, el criterio de su agrónomo.",
        "Construido con observaciones de la Tierra de la NASA.",
    ]
    notes_en = [
        "This alert supports, and does not replace, your agronomist's judgment.",
        "Built with NASA Earth observations.",
    ]
    if mail.is_demo:
        notes_es.insert(0, "DEMO: finca y lotes sintéticos de demostración.")
        notes_en.insert(0, "DEMO: synthetic demonstration farm and lots.")
    if mail.test:
        notes_es.insert(0, "PRUEBA: correo de prueba enviado por un administrador; no es un episodio nuevo.")
        notes_en.insert(0, "TEST: test email sent by an administrator; not a new episode.")

    text_parts = [*lines_es, *notes_es, "", *lines_en, *notes_en]
    if mail.link:
        text_parts += ["", f"Ver lote / Open lot: {mail.link}"]
    text = "\n".join(text_parts)

    e = html.escape
    banner = (
        f'<p style="background:{SEVERE_COLOUR};color:#ffffff;padding:12px;font-weight:bold;font-size:18px">'
        "&#9679; ROJO — SEVERO / RED — SEVERE</p>"
    )

    def block(lines: list[str], notes: list[str], lang: str) -> str:
        items = "".join(f"<li>{e(line)}</li>" for line in lines[1:])
        small = "".join(f'<p style="color:#444444;font-size:13px">{e(n)}</p>' for n in notes)
        return f'<div lang="{lang}"><ul>{items}</ul>{small}</div>'

    link_html = (
        f'<p><a href="{e(mail.link, quote=True)}">Ver lote / Open lot</a></p>' if mail.link else ""
    )
    body = f"{banner}{block(lines_es, notes_es, 'es')}<hr>{block(lines_en, notes_en, 'en')}{link_html}"
    return subject, f"<!doctype html><html><body>{body}</body></html>", text


class ResendMailer:
    def __init__(self, api_key: str, from_header: str, client: httpx.Client | None = None) -> None:
        self._api_key = api_key
        self._from = from_header
        self._client = client or httpx.Client(timeout=10.0)

    def send(self, to: str, mail: SevereEmail, idempotency_key: str | None = None) -> SendResult:
        subject, html_body, text = render(mail)
        headers = {"Authorization": f"Bearer {self._api_key}", "User-Agent": "demenova-backend/0.1"}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key[:256]
        payload = {"from": self._from, "to": [to], "subject": subject, "html": html_body, "text": text}
        try:
            response = self._client.post(RESEND_URL, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            log.warning("resend call failed: unit=%s error=%s", mail.unit_id, type(exc).__name__)
            return SendResult(EmailStatus.failed, None, None)
        provider_id = None
        if response.status_code < 300:
            try:
                data = response.json()
                provider_id = data.get("id") if isinstance(data, dict) and isinstance(data.get("id"), str) else None
            except ValueError:
                provider_id = None
        if provider_id is None:
            log.warning("resend rejected: unit=%s http=%s", mail.unit_id, response.status_code)
            return SendResult(EmailStatus.failed, None, response.status_code)
        log.info("resend accepted: unit=%s provider_id=%s", mail.unit_id, provider_id)
        return SendResult(EmailStatus.sent, provider_id, response.status_code)
