-- Demenova schema, migration 5 of 6: client privileges and row-level security policies.
-- Owner: database-engineer (T-015). Class A (PENDING.md P-009). Idempotent (drop policy if exists + create).
-- Kept in migrations/ (not policies/) so the Supabase CLI applies it with the rest. RLS is already enabled and
-- every client privilege revoked by migrations 2-4 at table creation. ADR-003:
--   * demo farm rows (farms.is_demo): select for anon and authenticated; no client writes;
--   * device-owned rows: writable only where the farm's owner_id = auth.uid() (anonymous sign-in users have the
--     `authenticated` role, https://supabase.com/docs/guides/auth/auth-anonymous, read 2026-11-14);
--   * engine outputs (zones, daily_features, alert_states, alert_events, lots.twi_*, flood_memories.matched_event_id),
--     provenance and domain tables: written only by the service role, which bypasses RLS;
--   * farms.telegram_code (P-002 b) and farms.alert_email (v0): never written by clients;
--   * email_log, telegram_subscribers: no client privilege, no policy.
-- Policies use set-based subqueries on farms (evaluated once per statement, filtered by the farms policy) instead
-- of a per-row helper function.

-- Helpers of an earlier draft, never applied; dropped in case a partial run created them.
drop function if exists private.can_read_farm(text);
drop function if exists private.owns_farm(text);

-- ---------------------------------------------------------------------------------------------------------
-- Privileges (column lists exclude engine-computed, server-only and generated columns)
-- ---------------------------------------------------------------------------------------------------------
grant all on table
  public.farms, public.lots, public.zones, public.field_notes, public.user_prefs,
  public.provenance, public.daily_features, public.alert_states, public.alert_events, public.flood_memories,
  public.practices, public.strategies, public.email_log, public.telegram_subscribers
to service_role;

-- Public read (rows still filtered by policies). Owners also read alert_email / telegram_code of their own farms.
grant select on table
  public.farms, public.lots, public.zones, public.field_notes,
  public.provenance, public.daily_features, public.alert_states, public.alert_events, public.flood_memories,
  public.practices, public.strategies
to anon, authenticated;

-- farms: not writable by clients: is_demo, telegram_code, alert_email, catchment_id (engine), created_at, updated_at;
-- owner_id only at insert (the policy pins it to auth.uid()); id only at insert.
grant insert (id, name, owner_id, country, province, canton, location, outline, data_level, crop, variety,
              variety_origin, language, units, mode, storage_mode, origin)
  on public.farms to authenticated;
grant update (name, country, province, canton, location, outline, data_level, crop, variety, variety_origin,
              language, units, mode, storage_mode, origin)
  on public.farms to authenticated;
grant delete on public.farms to authenticated;

-- lots: twi_mean, twi_max, twi_tercile are engine outputs.
grant insert (id, farm_id, name, geometry, area_ha, area_ha_origin, plant_age_months, plant_age_months_origin,
              variety, variety_origin, drainage_class, drainage_class_origin, drainage_works, drainage_works_origin,
              cover_crop, cover_crop_origin, last_soil_analysis, last_soil_analysis_origin, nematode_incidence,
              nematode_incidence_origin, disease_notes, bioinputs, bioinputs_origin, defined_by, to_be_redefined_by,
              origin)
  on public.lots to authenticated;
grant update (name, geometry, area_ha, area_ha_origin, plant_age_months, plant_age_months_origin,
              variety, variety_origin, drainage_class, drainage_class_origin, drainage_works, drainage_works_origin,
              cover_crop, cover_crop_origin, last_soil_analysis, last_soil_analysis_origin, nematode_incidence,
              nematode_incidence_origin, disease_notes, bioinputs, bioinputs_origin, defined_by, to_be_redefined_by,
              origin)
  on public.lots to authenticated;
grant delete on public.lots to authenticated;

grant insert (id, lot_id, kind, date, value_json, origin) on public.field_notes to authenticated;
grant update (kind, date, value_json, origin) on public.field_notes to authenticated;
grant delete on public.field_notes to authenticated;

-- flood_memories: matched_event_id is set by the engine's verification; origin is always 'observed' (default).
grant insert (id, farm_id, date_or_month, lots_or_zone, days_with_water, damage_notes, reported_by)
  on public.flood_memories to authenticated;
grant update (date_or_month, lots_or_zone, days_with_water, damage_notes, reported_by)
  on public.flood_memories to authenticated;
grant delete on public.flood_memories to authenticated;

-- user_prefs: user_id fixed after insert.
grant select, delete on public.user_prefs to authenticated;
grant insert (user_id, device_id, language, units, mode, storage_mode, theme) on public.user_prefs to authenticated;
grant update (device_id, language, units, mode, storage_mode, theme) on public.user_prefs to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------------------------------------
-- farms
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

-- lots, field_notes, flood_memories: read with the farm, write by the farm owner
drop policy if exists lots_select on public.lots;
create policy lots_select on public.lots for select to anon, authenticated
  using (farm_id in (select f.id from public.farms f));
drop policy if exists lots_insert on public.lots;
create policy lots_insert on public.lots for insert to authenticated
  with check (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())));
drop policy if exists lots_update on public.lots;
create policy lots_update on public.lots for update to authenticated
  using (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())))
  with check (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())));
drop policy if exists lots_delete on public.lots;
create policy lots_delete on public.lots for delete to authenticated
  using (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())));

drop policy if exists field_notes_select on public.field_notes;
create policy field_notes_select on public.field_notes for select to anon, authenticated
  using (farm_id in (select f.id from public.farms f));
drop policy if exists field_notes_insert on public.field_notes;
create policy field_notes_insert on public.field_notes for insert to authenticated
  with check (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())));
drop policy if exists field_notes_update on public.field_notes;
create policy field_notes_update on public.field_notes for update to authenticated
  using (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())))
  with check (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())));
drop policy if exists field_notes_delete on public.field_notes;
create policy field_notes_delete on public.field_notes for delete to authenticated
  using (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())));

drop policy if exists flood_memories_select on public.flood_memories;
create policy flood_memories_select on public.flood_memories for select to anon, authenticated
  using (farm_id in (select f.id from public.farms f));
drop policy if exists flood_memories_insert on public.flood_memories;
create policy flood_memories_insert on public.flood_memories for insert to authenticated
  with check (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())));
drop policy if exists flood_memories_update on public.flood_memories;
create policy flood_memories_update on public.flood_memories for update to authenticated
  using (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())))
  with check (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())));
drop policy if exists flood_memories_delete on public.flood_memories;
create policy flood_memories_delete on public.flood_memories for delete to authenticated
  using (farm_id in (select f.id from public.farms f where f.owner_id = (select auth.uid())));

-- Engine outputs: read with the farm; no client write privilege
drop policy if exists zones_select on public.zones;
create policy zones_select on public.zones for select to anon, authenticated
  using (farm_id in (select f.id from public.farms f));

drop policy if exists daily_features_select on public.daily_features;
create policy daily_features_select on public.daily_features for select to anon, authenticated
  using (farm_id in (select f.id from public.farms f));

drop policy if exists alert_states_select on public.alert_states;
create policy alert_states_select on public.alert_states for select to anon, authenticated
  using (farm_id in (select f.id from public.farms f));

drop policy if exists alert_events_select on public.alert_events;
create policy alert_events_select on public.alert_events for select to anon, authenticated
  using (farm_id in (select f.id from public.farms f));

-- Strategies: regional defaults (farm_id null) are public; farm-scoped ones follow their farm
drop policy if exists strategies_select on public.strategies;
create policy strategies_select on public.strategies for select to anon, authenticated
  using (farm_id is null or farm_id in (select f.id from public.farms f));

-- Provenance and practices: public reference data, no personal content
drop policy if exists provenance_select on public.provenance;
create policy provenance_select on public.provenance for select to anon, authenticated using (true);

drop policy if exists practices_select on public.practices;
create policy practices_select on public.practices for select to anon, authenticated using (true);

-- user_prefs: own row only
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

-- email_log, telegram_subscribers: RLS on, no policy, no client privilege (migration 4).
