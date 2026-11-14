# supabase/

Owner: database-engineer. Every schema change is class A (CLAUDE.md §6) and is reviewed by database-reviewer.

Purpose: Postgres schema for farms, lots, zones, daily features, alert state and events, flood memories, field notes,
email log, Telegram subscribers and user preferences (entities in `docs/contracts/CONTRACTS.md` §3; JSON Schemas in
`docs/contracts/schemas/entities/`). Row-level security: public read-only for demo tables, device-owned rows via
anonymous sign-in (ADR-003). The service-role key lives only on the server.

Layout: `migrations/*.sql`, `policies/*.sql`, `seed/demo_farm.sql` (synthetic, labelled), `tests/*.sql`.
