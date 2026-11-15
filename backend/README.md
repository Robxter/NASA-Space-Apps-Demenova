# backend/

Owner: api-engineer.

Purpose: FastAPI service on Render for background work: protected re-runs, the Severe email via the Resend REST API,
the public test-email request from the app, and the Telegram bot. Contract: `docs/contracts/openapi.yaml`
(CONTRACTS.md §6). Nothing a judge needs may depend on it, because free Render services sleep (CLAUDE.md §2): the
app's test-email button is optional and must cope with a slow or absent answer.

## Layout
- `app/main.py`: routes `GET /health`; `POST /run`, `POST /email/test` (both need `X-Admin-Token`, compared in
  constant time; closed when `ADMIN_TOKEN` is unset); public `POST /alerts/test-email` (hCaptcha, rate limits, CORS
  for the app origins only); `POST /telegram/webhook` (Telegram secret header). Interactive docs are off.
- `app/alerts.py`: Publishing step. One email per unit per Severe episode (dedupe `(unit_id, episode_start)` in
  `email_log`) and one Telegram fan-out per episode (`alert_events.telegram_sent`, conditional claim). Stale or
  unconfirmed states never alert. CLI for the pipeline workflow: `uv run python -m backend.app.alerts [--farm farm_x]`.
- `app/email.py`: bilingual template and the Resend call. `app/telegram.py`: bot commands and messages.
- `app/captcha.py` (hCaptcha siteverify), `app/ratelimit.py`, `app/supabase.py` (PostgREST over httpx),
  `app/settings.py` (environment only), `app/ids.py` (ULIDs).
- `scripts/set_telegram_webhook.py`: one-time setWebhook (below).

## Environment (Render)
Required: `ADMIN_TOKEN`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`HCAPTCHA_SECRET` (public test-email; unset = 503), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (bot; unset
secret = webhook closed). Optional: `ALERT_EMAIL_FROM_NAME` (default "Demenova Alerts"), `APP_BASE_URL` (https; lot
link in alerts), `HCAPTCHA_SITEKEY` (public site key; recommended by hCaptcha so tokens from another key fail).
Never log them. `ADMIN_TOKEN` must be at least 32 characters, otherwise it counts as unset. Generate tokens with
`python -c "import secrets;print(secrets.token_hex(32))"`. `TELEGRAM_WEBHOOK_SECRET` should also be 32+ random
characters (the same command works; Telegram allows only A-Z a-z 0-9 _ -).
Sender: Resend's test sender `onboarding@resend.dev`, which reaches only the Resend account owner's inbox (accepted for
the demo). Using an owned domain needs the product owner's approval (class A).

## Public test email (`POST /alerts/test-email`)
Body `{"email", "captcha_token", "lang": "en"|"es"}`. After the captcha passes, only `ALERT_EMAIL_TO` receives the
TEST email (`{"status": "sent"}`); any other address gets `{"status": "limited_demo"}` and Resend is not called.
Limits per process: 10 attempts/hour per client IP (right-most X-Forwarded-For entry), 3/hour per address, and
global caps of 30 captcha checks/minute and 6 sent emails/hour; bodies over 4 KB get 413 (16 KB on the webhook) and
POSTs without Content-Length get 411. `/email/test` (admin) allows one per 60 s. The bot caps the demo farm at 200
active chats, and a Severe fan-out stops starting new sends after 60 s.

## Telegram bot
Commands: `/start` (demo farm), `/start <telegram_code>`, `/stop`, `/help`, `/estado` or `/status`. After deploy, run
once from the repository root (secrets come from the environment; the script prints only Telegram's ok/description):

    uv run --env-file .env python -m backend.scripts.set_telegram_webhook

## Run
From the repository root: `uv run uvicorn backend.app.main:app`; tests: `uv run pytest backend`.
Render (slim install): `uv sync --locked --no-default-groups --group backend`, then
`uv run --no-sync uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`.
