# supabase/

Owner: database-engineer. Every schema change is class A (CLAUDE.md §6) and is reviewed by database-reviewer.
Status: written for T-015, revised after the database-review, approved by Roberto (P-009, DECISIONS.md D-018) and
tested on a local PostgreSQL 18.7 (see "Run locally"); **not yet applied to Supabase**. Needs Postgres 15 or newer
(new Supabase projects are).

Postgres schema for farms, lots, zones, daily features, alert state and events, flood memories, field notes,
practices, strategies, provenance, email log, Telegram subscribers and user preferences (entities in
`docs/contracts/CONTRACTS.md` §3; JSON Schemas in `docs/contracts/schemas/entities/`, mirrored by hand, ADR-005).

## Layout

| Path | Content |
| --- | --- |
| `migrations/20261114000100_private_helpers.sql` | `private` schema, domains (`origin_kind`, `severity_level`, `finite_float`), validators; EXECUTE revoked from PUBLIC |
| `migrations/20261114000200_core_tables.sql` | `farms` (+ `telegram_code`), `lots`, `zones`, `field_notes`, `user_prefs` |
| `migrations/20261114000300_engine_tables.sql` | `provenance`, `daily_features`, `alert_states`, `alert_events`, `flood_memories`, `practices`, `strategies` |
| `migrations/20261114000400_service_tables.sql` | `email_log`, `telegram_subscribers` (service role only) |
| `migrations/20261114000500_rls_policies.sql` | column-level client grants + RLS policies (here, not in `policies/`, so the CLI applies them) |
| `migrations/20261114000600_views.sql` | `v_farm_status`, `v_lot_history_7d`, `v_lot_history_90d`, `v_alert_log` (`security_invoker`) |
| `tests/rls_test.sql` | 79 checks (74 labelled `FAIL` checks + 5 positive owner writes) in one transaction that is rolled back |
| `seed/seed_demo.py` | idempotent upsert of the synthetic demo farm from `app/public/data/demo/` (no hand-typed values); see "Seed the demo farm" |
| `tests/test_seed_demo.py` | pytest for the snapshot-to-row mapping (no network): `uv run pytest supabase/tests/test_seed_demo.py` |

Design: SI units; `timestamptz` (UTC); GeoJSON in EPSG:4326 as `jsonb` (no PostGIS: no spatial query runs in the
database). Every `<field>_origin` of the contracts is a column; `origin` (OriginSpec) is `jsonb`. A null value has
origin `pending` and a `pending` origin has a null value (enforced). NaN/Infinity and impossible dates are rejected.
Every table has RLS enabled and all client privileges revoked in the statement right after `create table`.
`farm_id` / `lot_id` / `zone_id` generated columns (not contract fields) drive RLS and cascade deletes: read contract
columns explicitly, not `select *`. User farm ids must end in a random suffix of 6+ characters (`farm_<slug>-x7k2q9`);
only the demo farm is exempt.

## Access model (ADR-003)

| Table | anon | authenticated (anonymous sign-in user) | service_role |
| --- | --- | --- | --- |
| farms | read demo | read demo + own; write own, except `is_demo`, `telegram_code`, `alert_email`, `catchment_id`, `owner_id` after insert | all |
| lots | read demo | read demo + own farm; write own farm except `twi_mean`, `twi_max`, `twi_tercile` | all |
| field_notes | read demo | read demo + own farm; write own farm | all |
| flood_memories | read demo | read demo + own farm; write own farm except `matched_event_id`, `origin` | all |
| zones, daily_features, alert_states, alert_events | read demo | read demo + own farm; no write | all |
| strategies | read regional (`["*"]`) + demo | + own farm | all |
| provenance, practices | read all | read all | all |
| user_prefs | none | own row only (`user_id` fixed) | all |
| email_log, telegram_subscribers | none | none | all |
| 4 views | read (base-table RLS applies) | read (base-table RLS applies) | all |

Telegram (P-002 b): each farm gets a random `telegram_code`; `/start <code>` subscribes, and
`telegram_subscribers (farm_id, telegram_code)` must match the farm's current code. Rotating a code needs the backend
to delete that farm's subscriptions first. `email_log` has no foreign key to `farms`, so it outlives a deleted farm.

## Apply from the Supabase SQL editor (Windows, no CLI): one transaction

1. Dashboard > Authentication > Sign In / Providers: turn on **Allow anonymous sign-ins** (ADR-003;
   https://supabase.com/docs/guides/auth/auth-anonymous). Recommended there: enable CAPTCHA/Turnstile against abuse.
2. In PowerShell at the repo root, copy all six migrations, in order, wrapped in `begin; … commit;`:

   ```powershell
   $sql = Get-ChildItem supabase/migrations/*.sql | Sort-Object Name | ForEach-Object { Get-Content $_.FullName -Raw -Encoding UTF8 }
   ("begin;`n" + ($sql -join "`n") + "`ncommit;`n") | Set-Clipboard
   ```

3. Dashboard > SQL Editor > New query: paste, **Run**. Expect "Success. No rows returned". On any error nothing is
   kept (run `rollback;` once, then report the error).
4. Right away, before sharing the app URL: load the demo farm with the service role ("Seed the demo farm" below; its
   id `farm_demo-el-oro` ends in a segment shorter than 6 characters, so no user id can ever take it).
5. New query: paste `supabase/tests/rls_test.sql`, **Run**. Pass = "Success. No rows returned" (it rolls itself back).
   An error starting `FAIL` names the broken check; run `rollback;` once and report it. If the insert into
   `auth.users` is refused, report that too (the tests need two throw-away auth users).
6. Dashboard > Advisors > Security Advisor: expect no RLS or `security_definer view` warnings for these objects.

All files are idempotent: running them again is harmless. Never paste the service-role key anywhere in SQL.

## Seed the demo farm (after the schema is applied)

`supabase/seed/seed_demo.py` upserts the synthetic demo farm `farm_demo-el-oro` from the committed snapshots in
`app/public/data/demo/`, validated against `pipeline/common/models.py` first. Values, nulls, every `origin` and every
provenance id are copied as they are; it stops with `seed failed: ...` instead of guessing. Re-running is harmless.
It uses the Supabase REST API with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment or `.env`
(never printed). Only httpx and pydantic, both already locked. From the repo root, in PowerShell:

```powershell
$env:PYTHONUTF8='1'; uv run python supabase/seed/seed_demo.py --dry-run   # validates, writes nothing
$env:PYTHONUTF8='1'; uv run python supabase/seed/seed_demo.py             # writes to the project in .env
```

Expected output (the second number is what the database holds for the demo farm afterwards):

```text
demo seed: farm_demo-el-oro from app/public/data/demo (replay 2026-01-20..2026-03-05, alert states as of 2026-03-05)
  provenance        13 rows upserted,   13 in the database
  farms              1 rows upserted,    1 in the database
  lots               8 rows upserted,    8 in the database
  zones              3 rows upserted,    3 in the database
  daily_features   495 rows upserted,  495 in the database
  alert_states      11 rows upserted,   11 in the database
  alert_events      18 rows upserted,   18 in the database
done
```

What goes where: `alert_states` holds each unit's state on the last replay day (the frozen demo's "current" state);
`alert_events` holds all 18 transitions of the replay; `daily_features` every unit-day of `replay/*.json`.
Not sent, so the database keeps its own: `telegram_code`, `created_at`, `updated_at` (defaults) and `alert_email`
(always null on the demo farm; the backend mails `ALERT_EMAIL_TO`). On a re-run `email_sent` / `telegram_sent` of an
existing event are never reset. `side.experimental` is dropped from `alert_states.side` (the column accepts only
`sigatoka` and `cold`; contract note in `models.SideIndicators`); the app still reads it from the snapshots.

After seeding, the backend's Publish step (`python -m backend.app.alerts`, hourly in `pipeline.yml` when its secrets are
set) finds 4 Severe transitions whose unit is still Severe in the same episode and mails each once to `ALERT_EMAIL_TO`
(lot 1, lot 2, zone high, lot 7). `/email/test` uses the latest one (lot 7, 2026-02-25 04:00 UTC).

Other targets: `--emit-sql <file>` writes the same upserts as one SQL transaction (`set local role service_role`, also
pasteable in the SQL editor); `--dsn <postgres url>` runs that SQL through `psql` (no Python driver).

## Run locally (plain PostgreSQL 15+, throwaway database; never touches Supabase)

Needs a local PostgreSQL (tested on 18.7) and `LOCAL_PG_PASSWORD=<postgres password>` in `.env`. From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/run_local.ps1            # add -KeepDb to inspect afterwards
powershell -ExecutionPolicy Bypass -File supabase/tests/run_local.ps1 -Seed      # also seeds the demo farm twice
```

With `-Seed`, the demo seed runs twice through `--dsn` (as `service_role`) before the RLS tests; the second run must keep
`telegram_code` and a backend-set `email_sent`, anon must read the demo through the four views and must not write it.

It drops and re-creates `demenova_rls_test`, applies `supabase/tests/local_shim.sql` (Supabase roles `anon`,
`authenticated`, `service_role` with BYPASSRLS; `auth.users`, `auth.uid()`, `auth.jwt()`; Supabase's default grants on
`public`; local only, never run it on Supabase), applies the six migrations in one `begin; … commit;` exactly as in
step 2 above, applies them a second time (re-runnable), runs `rls_test.sql`, then drops the database and the roles it
created. The password goes into `PGPASSWORD` for that process only and is never printed. Exit code 0 = all passed.

## Apply with the Supabase CLI (if installed; not a project dependency)

```powershell
supabase link --project-ref <your-project-ref>
supabase db push            # applies supabase/migrations in order, each file in its own transaction
psql "<connection string from Dashboard > Connect>" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
```

`supabase test db` is not used: it expects pgTAP output.
