"""Email template rules: bilingual, colour AND word, Ecuador time, credit, disclaimer, escaping, no invented values."""

import datetime as dt

from backend.app.email import SevereEmail, hash_recipient, render
from backend.app.settings import load_settings
from pipeline.common.models import Factor

# SYNTHETIC test inputs (origin: synthetic), not data.
UTC = dt.UTC
MAIL = SevereEmail(
    unit_id="lot_test-demo_1", unit_name="Lote <script>", farm_name="Finca & Co", is_demo=True, w=0.9,
    factors=[Factor(name="local", share=0.2), Factor(name="upstream", share=0.5), Factor(name="saturation", share=0.3)],
    episode_start=dt.datetime(2026, 2, 22, 15, 0, tzinfo=UTC),
    updated_at=dt.datetime(2026, 2, 22, 18, 0, tzinfo=UTC),
    newest_rain_data_at=dt.datetime(2026, 2, 22, 17, 30, tzinfo=UTC),
    link="https://app.example.test/#lot/lot_test-demo_1?d=2026-02-22",
)


def test_subject_is_bilingual_and_single_line():
    subject, _, _ = render(SevereEmail(**{**MAIL.__dict__, "unit_name": "Lote\r\nBcc: x"}))
    assert "Riesgo SEVERO" in subject and "SEVERE risk" in subject and "[DEMO]" in subject
    assert "\n" not in subject and "\r" not in subject


def test_body_has_colour_word_factors_times_credit_and_disclaimer():
    _, html_body, text = render(MAIL)
    assert "ROJO — SEVERO" in text and "RED — SEVERE" in text and "#b91c1c" in html_body
    assert "Lluvia aguas arriba 50 %, Saturación del suelo 30 %" in text
    assert "Upstream rain 50%, Soil saturation 30%" in text and "Local rain" not in text
    assert "W: 0.90" in text
    assert "22/02/2026 10:00 (hora de Ecuador, UTC−5)" in text  # 15:00 UTC shown in America/Guayaquil
    assert "Built with NASA Earth observations." in text
    assert "Construido con observaciones de la Tierra de la NASA." in text
    assert "does not replace, your agronomist's judgment" in text and "no reemplaza" in text
    assert "DEMO: synthetic demonstration farm" in text
    assert MAIL.link in text


def test_html_escapes_user_text():
    _, html_body, _ = render(MAIL)
    assert "<script>" not in html_body and "&lt;script&gt;" in html_body and "Finca &amp; Co" in html_body


def test_missing_values_are_shown_missing_not_filled():
    _, _, text = render(SevereEmail(unit_id="farm_x", unit_name="X", farm_name="X", is_demo=False, w=None))
    assert "W: sin dato" in text and "W: missing" in text
    assert "(parte de W): sin dato" in text and "Data updated: missing" in text
    assert "DEMO" not in text


def test_recipient_hash_is_stable_and_hides_address():
    h = hash_recipient(" Owner@Example.test ")
    assert h == hash_recipient("owner@example.test") and "owner" not in h and h.startswith("sha256:")


def test_settings_from_env_only_and_sanitised():
    s = load_settings({"ADMIN_TOKEN": " ", "ALERT_EMAIL_FROM_NAME": "Evil <x@y>\r\n", "APP_BASE_URL": "http://x"})
    assert s.admin_token is None and s.alert_email_from_name == "Evil xy"
    assert s.app_base_url is None  # only https links go into emails
    assert load_settings({}).from_header == "Demenova Alerts <onboarding@resend.dev>"
