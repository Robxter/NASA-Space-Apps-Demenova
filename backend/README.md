# backend/

Owner: api-engineer.

Purpose: FastAPI service on Render for background work only: protected pipeline re-runs, the Severe email via the
Resend REST API, and the Telegram bot webhook. Contract: `docs/contracts/openapi.yaml` (CONTRACTS.md §6). Nothing a
judge opens may depend on it, because free Render services sleep (CLAUDE.md §2).

Planned layout (CONTRACTS.md §1): `app/{main.py, email.py, telegram.py, settings.py, supabase.py}`, `tests/`.
Secrets come from environment variables only (`.env.example` lists the names); never log them.
Run from the repository root: `uv run uvicorn backend.app.main:app`; tests: `uv run pytest backend`.
