"""Telegram bot (T-043): webhook commands and Severe alert messages.

Telegram Bot API checked 2026-11-15 at https://core.telegram.org/bots/api: requests go to
https://api.telegram.org/bot<token>/METHOD (JSON accepted); replies hold `ok` and optional `description`;
`sendMessage` takes `chat_id` and `text` (1-4096 characters) and `link_preview_options`; webhook calls carry the
`secret_token` of setWebhook in the X-Telegram-Bot-Api-Secret-Token header; a non-2xx answer makes Telegram retry, and
`update_id` lets a webhook ignore repeated updates. Bots cannot start a chat: the farmer presses Start once.

Never log the bot token (it is part of the URL; httpx request logs are silenced) or a full chat id.
"""

import datetime as dt
import logging
import re
import threading
from collections import OrderedDict
from typing import Any

import httpx

from backend.app.email import SevereEmail, alert_lines, clean_name
from backend.app.settings import Settings
from backend.app.supabase import SupabaseRest

log = logging.getLogger("demenova.telegram")

API_BASE = "https://api.telegram.org"
MAX_TEXT = 4096
CODE_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")  # TelegramCode (pipeline/common/models.py)

LEVEL_WORDS = {
    "es": {"severe": "Severo (rojo)", "warning": "Aviso (naranja)", "watch": "Vigilancia (amarillo)",
           "normal": "Normal (verde)", "stale": "Desactualizado (gris)"},
    "en": {"severe": "Severe (red)", "warning": "Warning (orange)", "watch": "Watch (yellow)",
           "normal": "Normal (green)", "stale": "Out of date (grey)"},
}

TEXTS = {
    "es": {
        "subscribed": "Listo: recibirá aquí las alertas Severas de {farm}. Así se ve una alerta (prueba):",
        "subscribed_demo": "Listo: está suscrito a la finca DEMO {farm}. Así se ve una alerta (prueba):",
        "no_event": "Todavía no hay ningún episodio Severo para mostrar como prueba.",
        "unknown_code": "Código de finca no reconocido; no se cambió nada. Envíe /start para la finca de demostración.",
        "unavailable": "El servicio no está disponible ahora mismo. Inténtelo más tarde.",
        "stopped": "Listo: ya no recibirá alertas aquí. Envíe /start para volver a suscribirse.",
        "help": ("Comandos:\n/start - suscribirse a la finca de demostración\n/start <código> - suscribirse a su finca\n"
                 "/estado - nivel actual de cada lote\n/stop - dejar de recibir alertas\n/help - esta ayuda\n\n"
                 "Solo se envían alertas Severas, una vez por episodio. Demenova apoya, y no reemplaza, el criterio "
                 "de su agrónomo. Construido con observaciones de la Tierra de la NASA."),
        "not_subscribed": "Este chat no está suscrito. Envíe /start.",
        "status_head": "Estado de {farm}:",
        "status_none": "Sin estado de alerta todavía.",
        "open_app": "Abrir la app: {url}",
    },
    "en": {
        "subscribed": "Done: Severe alerts for {farm} will arrive here. This is what an alert looks like (test):",
        "subscribed_demo": "Done: you are subscribed to the DEMO farm {farm}. This is what an alert looks like (test):",
        "no_event": "There is no Severe episode to show as a test yet.",
        "unknown_code": "Farm code not recognised; nothing changed. Send /start for the demonstration farm.",
        "unavailable": "The service is not available right now. Please try again later.",
        "stopped": "Done: you will no longer receive alerts here. Send /start to subscribe again.",
        "help": ("Commands:\n/start - subscribe to the demonstration farm\n/start <code> - subscribe to your farm\n"
                 "/status - current level of each lot\n/stop - stop receiving alerts\n/help - this help\n\n"
                 "Only Severe alerts are sent, once per episode. Demenova supports, and does not replace, your "
                 "agronomist's judgment. Built with NASA Earth observations."),
        "not_subscribed": "This chat is not subscribed. Send /start.",
        "status_head": "Status of {farm}:",
        "status_none": "No alert state yet.",
        "open_app": "Open the app: {url}",
    },
}


def mask_chat(chat_id: Any) -> str:
    text = str(chat_id)
    return f"...{text[-3:]}" if len(text) > 3 else "..."


def lang_of(message: dict[str, Any]) -> str:
    sender = message.get("from")
    code = sender.get("language_code") if isinstance(sender, dict) else None
    return "es" if isinstance(code, str) and code.lower().startswith("es") else "en"


def render_telegram(mail: SevereEmail, lang: str = "both") -> str:
    """Plain text (no parse_mode, so nothing needs escaping). lang: "es", "en" or "both" (Spanish first)."""
    parts = alert_lines(mail)
    langs = ["es", "en"] if lang == "both" else [lang]
    out: list[str] = []
    for i, code in enumerate(langs):
        lines, notes = parts[code]
        tags = ("[PRUEBA] " if code == "es" else "[TEST] ") if mail.test else ""
        tags += "[DEMO] " if mail.is_demo else ""
        out += ([""] if i else []) + [tags + lines[0], *lines[1:], *notes]
    if mail.link:
        out += ["", mail.link]
    return "\n".join(out)[:MAX_TEXT]


class TelegramClient:
    def __init__(self, token: str, client: httpx.Client | None = None) -> None:
        self._token = token
        self._client = client or httpx.Client(timeout=8.0)

    def call(self, method: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Call a Bot API method. Returns the JSON reply, or {"ok": False} when unreachable. Never raises."""
        try:
            response = self._client.post(f"{API_BASE}/bot{self._token}/{method}", json=payload)
            data = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            log.warning("telegram %s failed: %s", method, type(exc).__name__)
            return {"ok": False}
        return data if isinstance(data, dict) else {"ok": False}

    def send(self, chat_id: Any, text: str) -> bool:
        data = self.call("sendMessage", {"chat_id": chat_id, "text": text[:MAX_TEXT],
                                         "link_preview_options": {"is_disabled": True}})
        if data.get("ok") is not True:
            log.warning("telegram sendMessage rejected: chat=%s code=%s", mask_chat(chat_id), data.get("error_code"))
            return False
        return True


class UpdateDeduper:
    """Remembers recent update_ids so Telegram's retries (e.g. while a sleeping Render instance wakes) are no-ops."""

    def __init__(self, size: int = 5000) -> None:
        self._seen: OrderedDict[int, None] = OrderedDict()
        self._size = size
        self._lock = threading.Lock()

    def first_time(self, update_id: int) -> bool:
        with self._lock:
            if update_id in self._seen:
                return False
            self._seen[update_id] = None
            if len(self._seen) > self._size:
                self._seen.popitem(last=False)
            return True

    def reset(self) -> None:
        with self._lock:
            self._seen.clear()


def _command(text: str) -> tuple[str, list[str]]:
    words = text.strip().split()
    if not words or not words[0].startswith("/"):
        return "", words
    return words[0].split("@", 1)[0].lower(), words[1:]


def _farm_for(db: SupabaseRest, code: str | None) -> dict[str, Any] | None:
    columns = "id,name,is_demo,telegram_code"
    if code is None:
        rows = db.select("farms", {"select": columns, "is_demo": "is.true", "limit": "1"})
    elif CODE_RE.match(code):
        rows = db.select("farms", {"select": columns, "telegram_code": f"eq.{code}", "limit": "1"})
    else:
        rows = []
    return rows[0] if rows and rows[0].get("telegram_code") else None


def _test_alert(db: SupabaseRest, settings: Settings, farm: dict[str, Any], lang: str) -> str:
    from backend.app.alerts import build_email, latest_severe

    found = latest_severe(db, farm["id"])
    if found is None:
        return TEXTS[lang]["no_event"]
    event, state, farm_row = found
    return render_telegram(build_email(db, settings, event, state, farm_row, test=True), lang)


def _status(db: SupabaseRest, chat: str, lang: str) -> str:
    subs = db.select("telegram_subscribers", {"select": "farm_id", "chat_id": f"eq.{chat}", "active": "is.true"})
    if not subs:
        return TEXTS[lang]["not_subscribed"]
    out: list[str] = []
    for sub in subs[:3]:
        farm_id = str(sub.get("farm_id"))
        farms = db.select("farms", {"select": "id,name", "id": f"eq.{farm_id}", "limit": "1"})
        name = clean_name(str(farms[0].get("name") or farm_id)) if farms else farm_id
        states = db.select("alert_states", {"select": "unit_id,level", "farm_id": f"eq.{farm_id}",
                                            "order": "unit_id.asc", "limit": "30"})
        out.append(TEXTS[lang]["status_head"].format(farm=name))
        if not states:
            out.append(TEXTS[lang]["status_none"])
        for st in states:
            word = LEVEL_WORDS[lang].get(str(st.get("level")), str(st.get("level")))
            out.append(f"- {clean_name(str(st.get('unit_id')), 40)}: {word}")
        out.append("")
    return "\n".join(out).strip()


def handle_update(update: dict[str, Any], db: SupabaseRest | None, tg: TelegramClient, settings: Settings) -> str:
    """Handle one webhook update. Returns a short action label (for logs and tests). Never raises on bad input."""
    message = update.get("message")
    if not isinstance(message, dict) or not isinstance(message.get("text"), str):
        return "ignored"
    chat = message.get("chat")
    chat_id = chat.get("id") if isinstance(chat, dict) else None
    if not isinstance(chat_id, int) or isinstance(chat_id, bool):
        return "ignored"
    lang = lang_of(message)
    t = TEXTS[lang]
    command, args = _command(message["text"][:300])
    link = t["open_app"].format(url=settings.app_base_url) if settings.app_base_url else ""

    if command == "/help" or command not in {"/start", "/stop", "/estado", "/status"}:
        tg.send(chat_id, t["help"] + (f"\n\n{link}" if link else ""))
        return "help"
    if db is None:
        tg.send(chat_id, t["unavailable"])
        return "unavailable"
    if command == "/stop":
        db.update("telegram_subscribers", {"chat_id": f"eq.{chat_id}"}, {"active": False})
        tg.send(chat_id, t["stopped"])
        return "stopped"
    if command in {"/estado", "/status"}:
        tg.send(chat_id, _status(db, str(chat_id), lang))
        return "status"

    farm = _farm_for(db, args[0] if args else None)
    if farm is None:
        tg.send(chat_id, t["unknown_code"])
        return "unknown_code"
    db.upsert("telegram_subscribers", {
        "chat_id": str(chat_id), "farm_id": farm["id"], "telegram_code": farm["telegram_code"],
        "started_at": dt.datetime.now(dt.UTC).isoformat().replace("+00:00", "Z"), "active": True,
    }, on_conflict="chat_id,farm_id")
    farm_name = clean_name(str(farm.get("name") or farm["id"]))
    head = (t["subscribed_demo"] if farm.get("is_demo") is True else t["subscribed"]).format(farm=farm_name)
    tg.send(chat_id, head)
    tg.send(chat_id, _test_alert(db, settings, farm, lang))
    log.info("telegram subscribed: chat=%s farm=%s", mask_chat(chat_id), farm["id"])
    return "subscribed"
