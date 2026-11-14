-- Demenova schema, migration 5 of 6: privileges and row-level security on every table.
-- Owner: database-engineer (T-015). Class A (PENDING.md P-009). Idempotent (drop policy if exists + create).
-- Kept in migrations/ (not policies/) so the Supabase CLI applies it with the rest. ADR-003:
--   * demo farm rows (farms.is_demo): select for anon and authenticated; no client writes;
--   * device-owned rows: full access only where the farm's owner_id = auth.uid() (anonymous sign-in users
--     have the `authenticated` role, https://supabase.com/docs/guides/auth/auth-anonymous, read 2026-11-14);
--   * engine outputs (zones, daily_features, alert_states, alert_events), provenance and domain tables:
--     written only by the service role (pipeline, backend), which bypasses RLS;
--   * email_log, telegram_subscribers: service role only, no client privilege at all.
-- Defence in depth: table privileges are revoked first, then granted per role, then policies filter rows.

-- ---------------------------------------------------------------------------------------------------------
-- Policy helpers (security invoker: they only see what the caller's farms policy lets them see)
-- ---------------------------------------------------------------------------------------------------------
create or replace function private.can_read_farm(fid text)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.farms f
    where f.id = fid and (f.is_demo or f.owner_id = (select auth.uid())))
$$;

create or replace function private.owns_farm(fid text)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.farms f
    where f.id = fid and f.owner_id = (select auth.uid()))
$$;

-- Policies, constraints and generated columns call the private helpers as the requesting role.
grant execute on all functions in schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------------------------------------
revoke all on table
  public.farms, public.lots, public.zones, public.field_notes, public.user_prefs,
  public.provenance, public.daily_features, public.alert_states, public.alert_events, public.flood_memories,
  public.practices, public.strategies, public.email_log, public.telegram_subscribers
from anon, authenticated;

grant all on table
  public.farms, public.lots, public.zones, public.field_notes, public.user_prefs,
  public.provenance, public.daily_features, public.alert_states, public.alert_events, public.flood_memories,
  public.practices, public.strategies, public.email_log, public.telegram_subscribers
to service_role;

-- Public read (rows still filtered by policies).
grant select on table
  public.farms, public.lots, public.zones, public.field_notes,
  public.provenance, public.daily_features, public.alert_states, public.alert_events, public.flood_memories,
  public.practices, public.strategies
to anon, authenticated;

-- Device-owned writes (authenticated = anonymous sign-in users). anon never writes.
grant insert, update, delete on table public.farms, public.lots, public.field_notes, public.flood_memories
to authenticated;
grant select, insert, update, delete on table public.user_prefs to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- Row-level security on every table
-- ---------------------------------------------------------------------------------------------------------
alter table public.farms                enable row level security;
alter table public.lots                 enable row level security;
alter table public.zones                enable row level security;
alter table public.field_notes          enable row level security;
alter table public.user_prefs           enable row level security;
alter table public.provenance           enable row level security;
alter table public.daily_features       enable row level security;
alter table public.alert_states         enable row level security;
alter table public.alert_events         enable row level security;
alter table public.flood_memories       enable row level security;
alter table public.practices            enable row level security;
alter table public.strategies           enable row level security;
alter table public.email_log            enable row level security;  -- no policy: clients see nothing
alter table public.telegram_subscribers enable row level security;  -- no policy: clients see nothing

-- farms -------------------------------------------------------------------------------------------------
drop policy if exists farms_select on public.farms;
create policy farms_select on public.farms for select to anon, authenticated
  using (is_demo or owner_id = (select auth.uid()));

drop policy if exists farms_insert on public.farms;
create policy farms_insert on public.farms for insert to authenticated
  with check (owner_id = (select auth.uid()) and not is_demo);

drop policy if exists farms_update on public.farms;
create policy farms_update on public.farms for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and not is_demo);

drop policy if exists farms_delete on public.farms;
create policy farms_delete on public.farms for delete to authenticated
  using (owner_id = (select auth.uid()));

-- lots, field_notes, flood_memories: read with the farm, write by the farm owner ---------------------------
drop policy if exists lots_select on public.lots;
create policy lots_select on public.lots for select to anon, authenticated
  using (private.can_read_farm(farm_id));
drop policy if exists lots_insert on public.lots;
create policy lots_insert on public.lots for insert to authenticated
  with check (private.owns_farm(farm_id));
drop policy if exists lots_update on public.lots;
create policy lots_update on public.lots for update to authenticated
  using (private.owns_farm(farm_id)) with check (private.owns_farm(farm_id));
drop policy if exists lots_delete on public.lots;
create policy lots_delete on public.lots for delete to authenticated
  using (private.owns_farm(farm_id));

drop policy if exists field_notes_select on public.field_notes;
create policy field_notes_select on public.field_notes for select to anon, authenticated
  using (private.can_read_farm(farm_id));
drop policy if exists field_notes_insert on public.field_notes;
create policy field_notes_insert on public.field_notes for insert to authenticated
  with check (private.owns_farm(farm_id));
drop policy if exists field_notes_update on public.field_notes;
create policy field_notes_update on public.field_notes for update to authenticated
  using (private.owns_farm(farm_id)) with check (private.owns_farm(farm_id));
drop policy if exists field_notes_delete on public.field_notes;
create policy field_notes_delete on public.field_notes for delete to authenticated
  using (private.owns_farm(farm_id));

drop policy if exists flood_memories_select on public.flood_memories;
create policy flood_memories_select on public.flood_memories for select to anon, authenticated
  using (private.can_read_farm(farm_id));
drop policy if exists flood_memories_insert on public.flood_memories;
create policy flood_memories_insert on public.flood_memories for insert to authenticated
  with check (private.owns_farm(farm_id));
drop policy if exists flood_memories_update on public.flood_memories;
create policy flood_memories_update on public.flood_memories for update to authenticated
  using (private.owns_farm(farm_id)) with check (private.owns_farm(farm_id));
drop policy if exists flood_memories_delete on public.flood_memories;
create policy flood_memories_delete on public.flood_memories for delete to authenticated
  using (private.owns_farm(farm_id));

-- Engine outputs: read with the farm; writes only by the service role (no client write privilege) -----------
drop policy if exists zones_select on public.zones;
create policy zones_select on public.zones for select to anon, authenticated
  using (private.can_read_farm(farm_id));

drop policy if exists daily_features_select on public.daily_features;
create policy daily_features_select on public.daily_features for select to anon, authenticated
  using (private.can_read_farm(farm_id));

drop policy if exists alert_states_select on public.alert_states;
create policy alert_states_select on public.alert_states for select to anon, authenticated
  using (private.can_read_farm(farm_id));

drop policy if exists alert_events_select on public.alert_events;
create policy alert_events_select on public.alert_events for select to anon, authenticated
  using (private.can_read_farm(farm_id));

-- Strategies: regional defaults (farm_id null) are public; farm-scoped ones follow their farm -------------
drop policy if exists strategies_select on public.strategies;
create policy strategies_select on public.strategies for select to anon, authenticated
  using (farm_id is null or private.can_read_farm(farm_id));

-- Provenance and practices: public reference data, no personal content -----------------------------------
drop policy if exists provenance_select on public.provenance;
create policy provenance_select on public.provenance for select to anon, authenticated using (true);

drop policy if exists practices_select on public.practices;
create policy practices_select on public.practices for select to anon, authenticated using (true);

-- user_prefs: own row only ---------------------------------------------------------------------------------
drop policy if exists user_prefs_select on public.user_prefs;
create policy user_prefs_select on public.user_prefs for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists user_prefs_insert on public.user_prefs;
create policy user_prefs_insert on public.user_prefs for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists user_prefs_update on public.user_prefs;
create policy user_prefs_update on public.user_prefs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists user_prefs_delete on public.user_prefs;
create policy user_prefs_delete on public.user_prefs for delete to authenticated
  using (user_id = (select auth.uid()));
