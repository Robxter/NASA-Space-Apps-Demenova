# backend/

Owner: api-engineer.

Purpose: FastAPI service on Render for background work only: protected re-runs, the Severe email via the Resend REST
API, and (later, T-043) the Telegram bot webhook. Contract: `docs/contracts/openapi.yaml` (CONTRACTS.md §6). Nothing a
judge opens may depend on it, because free Render services sleep (CLAUDE.md §2).

## Layout
- `app/main.py`: routes `GET /health`, `POST /run`, `POST /email/test` (both need `X-Admin-Token`, compared in constant
  time; closed when `ADMIN_TOKEN` is unset), `POST /telegram/webhook` (501 until T-043). Interactive docs are off.
- `app/alerts.py`: Publishing step. Sends one email per unit per Severe episode; dedupe key
  `(unit_id, episode_start)` in `email_log`. Stale or unconfirmed states never email. Also a CLI:
  `uv run python -m backend.app.alerts [--farm farm_x]` (for the pipeline workflow).
- `app/email.py`: bilingual template (es, then en) and the Resend call. `app/supabase.py`: PostgREST over httpx.
- `app/settings.py`: environment variables only. `app/ids.py`: ULIDs.

## Environment (Render)
`ADMIN_TOKEN`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; optional
`ALERT_EMAIL_FROM_NAME` (default "Demenova Alerts") and `APP_BASE_URL` (https; lot link in the email). Never log them.
Sender: Resend's test sender `onboarding@resend.dev`, which reaches only the Resend account owner's inbox (accepted for
the demo). Using an owned domain needs the product owner's approval (class A).

## Run
From the repository root: `uv run uvicorn backend.app.main:app`; tests: `uv run pytest backend`.
Render (slim install): `uv sync --locked --no-default-groups --group backend`, then
`uv run uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`.
