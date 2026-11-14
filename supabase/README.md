# supabase/

Owner: database-engineer. Every schema change is class A (CLAUDE.md §6) and is reviewed by database-reviewer.
Status: written for T-015, **not applied**. Apply only after Roster approves PENDING.md **P-009**.

Postgres schema for farms, lots, zones, daily features, alert state and events, flood memories, field notes,
practices, strategies, provenance, email log, Telegram subscribers and user preferences (entities in
`docs/contracts/CONTRACTS.md` §3; JSON Schemas in `docs/contracts/schemas/entities/`, mirrored by hand, ADR-005).

## Layout

| Path | Content |
| --- | --- |
| `migrations/20261114000100_private_helpers.sql` | `private` schema, domains (`origin_kind`, `severity_level`, `finite_float`), validators (GeoJSON, OriginSpec, nested objects) |
| `migrations/20261114000200_core_tables.sql` | `farms`, `lots`, `zones`, `field_notes`, `user_prefs` |
| `migrations/20261114000300_engine_tables.sql` | `provenance`, `daily_features`, `alert_states`, `alert_events`, `flood_memories`, `practices`, `strategies` |
| `migrations/20261114000400_service_tables.sql` | `email_log`, `telegram_subscribers` (service role only) |
| `migrations/20261114000500_rls_policies.sql` | privileges + row-level security on all 14 tables (policies live here, not in `policies/`, so the CLI applies them) |
| `migrations/20261114000600_views.sql` | `v_farm_status`, `v_lot_history_7d`, `v_lot_history_90d`, `v_alert_log` (`security_invoker`) |
| `tests/rls_test.sql` | RLS and constraint tests in one transaction that is rolled back |
| `seed/` | empty: the demo farm is loaded from `app/public/data/demo/farm.json` by a follow-up task (no hand-typed values) |

Design: SI units; `timestamptz` (UTC); GeoJSON in EPSG:4326 as `jsonb` (no PostGIS: no spatial query runs in the
database). Every `<field>_origin` of the contracts is a column; `origin` (OriginSpec) is `jsonb`. A null value has
origin `pending` and a `pending` origin has a null value (enforced). NaN/Infinity are rejected.
`farm_id` / `lot_id` / `zone_id` generated columns (not contract fields) drive RLS and cascade deletes: read contract
columns explicitly, not `select *`.

## Access model (ADR-003)

| Table | anon | authenticated (anonymous sign-in user) | service_role |
| --- | --- | --- | --- |
| farms | read demo | read demo + own; write own (`owner_id = auth.uid()`, never `is_demo`) | all |
| lots, field_notes, flood_memories | read demo | read demo + own farm; write own farm | all |
| zones, daily_features, alert_states, alert_events | read demo | read demo + own farm; no write | all |
| strategies | read regional (`["*"]`) + demo | + own farm | all |
| provenance, practices | read all | read all | all |
| user_prefs | none | own row only | all |
| email_log, telegram_subscribers | none | none | all |
| 4 views | read (base-table RLS applies) | read (base-table RLS applies) | all |

## Apply from the Supabase SQL editor (Windows, no CLI)

1. Dashboard > Authentication > Sign In / Providers: turn on **Allow anonymous sign-ins** (ADR-003;
   https://supabase.com/docs/guides/auth/auth-anonymous). Recommended there: enable CAPTCHA/Turnstile against abuse.
2. Dashboard > SQL Editor > New query. Open `supabase/migrations/20261114000100_private_helpers.sql` in VS Code,
   copy all, paste, **Run**. Expect "Success. No rows returned".
3. Same for `20261114000200_core_tables.sql`.
4. Same for `20261114000300_engine_tables.sql`.
5. Same for `20261114000400_service_tables.sql`.
6. Same for `20261114000500_rls_policies.sql`.
7. Same for `20261114000600_views.sql`.
8. Paste `supabase/tests/rls_test.sql`, **Run**. Pass = "Success. No rows returned" (it rolls itself back). An error
   starting `FAIL` names the broken check; then run `rollback;` once and report it. If the first insert into
   `auth.users` is refused, report that too (the tests need two throw-away auth users).
9. Dashboard > Advisors > Security Advisor: expect no RLS or `security_definer view` warnings for these objects.

All files are idempotent: running one again is harmless. Never paste the service-role key anywhere in SQL.

## Apply with the Supabase CLI (if installed; not a project dependency)

```powershell
supabase link --project-ref <your-project-ref>
supabase db push            # applies supabase/migrations in order
psql "<connection string from Dashboard > Connect>" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
```

`supabase test db` is not used: it expects pgTAP output.
