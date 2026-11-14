-- Demenova schema, migration 1 of 6: private schema, shared types and validation helpers.
-- Owner: database-engineer (T-015). Class A: applied only after Roster approves PENDING.md P-009.
-- Mirrors docs/contracts/schemas/entities/*.schema.json (generated from pipeline/common/models.py, ADR-005).
-- Idempotent: safe to run again. No secrets, no data.
--
-- Geometry is stored as GeoJSON (jsonb) in EPSG:4326, [longitude, latitude], exactly as the contracts define it.
-- PostGIS is not needed: no spatial query runs in the database (reprojection and grid work live in pipeline/).

create schema if not exists private;
comment on schema private is 'Demenova helpers used by constraints, generated columns and policies. Not exposed by the Data API.';

-- Constraints and generated columns call these helpers as the writing role (authenticated, service_role).
-- anon never writes, so it gets no EXECUTE (see the end of this file); policies and views use no helper.
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------
-- Domains (contract enums). Created only when missing so the file can be re-run.
-- ---------------------------------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'origin_kind') then
    create domain public.origin_kind as text
      check (value in ('sourced', 'calibrated', 'provided', 'observed', 'estimated', 'synthetic', 'design', 'pending'));
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'severity_level') then
    create domain public.severity_level as text
      check (value in ('normal', 'watch', 'warning', 'severe', 'stale'));
  end if;
  -- Contract numbers reject NaN and Infinity (Contract: allow_inf_nan=False); float8 would accept them.
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'finite_float') then
    create domain public.finite_float as double precision
      check (value is null or (value <> 'NaN'::float8 and value <> 'Infinity'::float8 and value <> '-Infinity'::float8));
  end if;
end
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Origin helpers (CONTRACTS.md §8.1)
-- ---------------------------------------------------------------------------------------------------------
create or replace function private.is_origin(o text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select o in ('sourced', 'calibrated', 'provided', 'observed', 'estimated', 'synthetic', 'design', 'pending')
$$;

-- OriginSpec: one origin string, or a map field -> origin where '*' is the default.
create or replace function private.is_origin_spec(o jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case jsonb_typeof(o)
    when 'string' then coalesce(private.is_origin(o #>> '{}'), false)
    when 'object' then not exists (
      select 1 from jsonb_each(o) e
      where jsonb_typeof(e.value) <> 'string' or not coalesce(private.is_origin(e.value #>> '{}'), false))
    else false
  end
$$;

-- The origin an OriginSpec gives to fields it does not list (models.default_origin).
create or replace function private.default_origin(o jsonb)
returns text language sql immutable parallel safe set search_path = '' as $$
  select case jsonb_typeof(o) when 'string' then o #>> '{}' when 'object' then o ->> '*' else null end
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Unit ids (lot_<slug>_<n>, zone_<slug>_<low|mid|high>, farm_<slug>) and the farm they belong to
-- ---------------------------------------------------------------------------------------------------------
create or replace function private.unit_farm_id(unit_id text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select case
    when unit_id ~ '^farm_[a-z0-9]+(?:-[a-z0-9]+)*$' then unit_id
    when unit_id ~ '^lot_[a-z0-9]+(?:-[a-z0-9]+)*_[0-9]+$'
      then 'farm_' || substring(unit_id from '^lot_([a-z0-9-]+)_[0-9]+$')
    when unit_id ~ '^zone_[a-z0-9]+(?:-[a-z0-9]+)*_(?:low|mid|high)$'
      then 'farm_' || substring(unit_id from '^zone_([a-z0-9-]+)_(?:low|mid|high)$')
    else null
  end
$$;

create or replace function private.unit_lot_id(unit_id text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select case when unit_id ~ '^lot_[a-z0-9]+(?:-[a-z0-9]+)*_[0-9]+$' then unit_id else null end
$$;

create or replace function private.unit_zone_id(unit_id text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select case when unit_id ~ '^zone_[a-z0-9]+(?:-[a-z0-9]+)*_(?:low|mid|high)$' then unit_id else null end
$$;

-- Strategy lot_scope: ["*"] (regional default) or unit ids that all belong to one farm.
create or replace function private.scope_farm_id(scope text[])
returns text language sql immutable parallel safe set search_path = '' as $$
  select case when scope = array['*']::text[] then null else private.unit_farm_id(scope[1]) end
$$;

create or replace function private.is_valid_scope(scope text[])
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case
    when scope is null or cardinality(scope) = 0 then false
    when scope = array['*']::text[] then true
    else not exists (
      select 1 from unnest(scope) s
      where private.unit_farm_id(s) is null or private.unit_farm_id(s) <> private.unit_farm_id(scope[1]))
  end
$$;

create or replace function private.are_provenance_ids(ids text[])
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select ids is not null and not exists (
    select 1 from unnest(ids) i where i is null or i !~ '^prov-[A-Za-z0-9][A-Za-z0-9._-]*$')
$$;

-- ---------------------------------------------------------------------------------------------------------
-- GeoJSON (EPSG:4326, [lon, lat]); CASE keeps the casts from running on non-numbers
-- ---------------------------------------------------------------------------------------------------------
create or replace function private.is_position(p jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case
    when coalesce(jsonb_typeof(p), '') <> 'array' then false
    when jsonb_array_length(p) not in (2, 3) then false
    when jsonb_typeof(p -> 0) <> 'number' or jsonb_typeof(p -> 1) <> 'number' then false
    when jsonb_array_length(p) = 3 and jsonb_typeof(p -> 2) <> 'number' then false
    else (p ->> 0)::numeric between -180 and 180 and (p ->> 1)::numeric between -90 and 90
  end
$$;

-- A linear ring has at least 4 positions and is closed (first = last in lon, lat).
create or replace function private.is_ring(r jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case
    when coalesce(jsonb_typeof(r), '') <> 'array' then false
    when jsonb_array_length(r) < 4 then false
    when exists (select 1 from jsonb_array_elements(r) p where not private.is_position(p)) then false
    else (r -> 0 -> 0) = (r -> -1 -> 0) and (r -> 0 -> 1) = (r -> -1 -> 1)
  end
$$;

create or replace function private.is_polygon_coords(c jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case
    when coalesce(jsonb_typeof(c), '') <> 'array' then false
    when jsonb_array_length(c) < 1 then false
    else not exists (select 1 from jsonb_array_elements(c) r where not private.is_ring(r))
  end
$$;

create or replace function private.is_multipolygon_coords(c jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case
    when coalesce(jsonb_typeof(c), '') <> 'array' then false
    when jsonb_array_length(c) < 1 then false
    else not exists (select 1 from jsonb_array_elements(c) pc where not private.is_polygon_coords(pc))
  end
$$;

-- kinds: any of 'Point', 'Polygon', 'MultiPolygon'. Never returns null.
create or replace function private.is_geojson(g jsonb, kinds text[])
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case
    when coalesce(jsonb_typeof(g), '') <> 'object' then false
    when not coalesce((g ->> 'type') = any (kinds), false) then false
    when g ->> 'type' = 'Point' then private.is_position(g -> 'coordinates')
    when g ->> 'type' = 'Polygon' then private.is_polygon_coords(g -> 'coordinates')
    when g ->> 'type' = 'MultiPolygon' then private.is_multipolygon_coords(g -> 'coordinates')
    else false
  end
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Nested contract objects stored as jsonb
-- ---------------------------------------------------------------------------------------------------------
-- A number in [lo, hi] or JSON null. A missing key (SQL null) is invalid: the contracts require every key.
create or replace function private.is_num_or_null(v jsonb, lo numeric, hi numeric)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case
    when v is null then false
    when jsonb_typeof(v) = 'null' then true
    when jsonb_typeof(v) <> 'number' then false
    else (lo is null or (v #>> '{}')::numeric >= lo) and (hi is null or (v #>> '{}')::numeric <= hi)
  end
$$;

-- YYYY-MM-DD that is a real calendar day (2026-02-30 is false). ISO input does not depend on DateStyle.
create or replace function private.is_iso_date(t text)
returns boolean language plpgsql immutable parallel restricted set search_path = '' as $$
begin
  if t is null or t !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return false;
  end if;
  perform t::date;
  return true;
exception when others then
  return false;
end
$$;

create or replace function private.is_date_or_null(v jsonb)
returns boolean language sql immutable parallel restricted set search_path = '' as $$
  select case
    when v is null then false
    when jsonb_typeof(v) = 'null' then true
    when jsonb_typeof(v) <> 'string' then false
    else private.is_iso_date(v #>> '{}')
  end
$$;

-- Every validator below returns false (never null) for missing input: a null CHECK result would let a row pass.
-- The CASE guard keeps jsonb_object_keys / jsonb_array_elements from running on the wrong JSON type.

-- Lot.last_soil_analysis {date, ph 0..14, organic_matter_pct 0..1 fraction}
create or replace function private.is_soil_analysis(v jsonb)
returns boolean language sql immutable parallel restricted set search_path = '' as $$
  select case when coalesce(jsonb_typeof(v), '') <> 'object' then false else coalesce(
    (select count(*) from jsonb_object_keys(v)) = 3
    and private.is_date_or_null(v -> 'date')
    and private.is_num_or_null(v -> 'ph', 0, 14)
    and private.is_num_or_null(v -> 'organic_matter_pct', 0, 1), false) end
$$;

-- Lot.bioinputs {mycorrhizae_last, mm_last} (dates)
create or replace function private.is_bioinputs(v jsonb)
returns boolean language sql immutable parallel restricted set search_path = '' as $$
  select case when coalesce(jsonb_typeof(v), '') <> 'object' then false else coalesce(
    (select count(*) from jsonb_object_keys(v)) = 2
    and private.is_date_or_null(v -> 'mycorrhizae_last')
    and private.is_date_or_null(v -> 'mm_last'), false) end
$$;

-- DailyFeature.percentiles {upstream, saturation, local, balance}, each 0..1 or null
create or replace function private.is_percentiles(v jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case when coalesce(jsonb_typeof(v), '') <> 'object' then false else coalesce(
    (select count(*) from jsonb_object_keys(v)) = 4
    and private.is_num_or_null(v -> 'upstream', 0, 1)
    and private.is_num_or_null(v -> 'saturation', 0, 1)
    and private.is_num_or_null(v -> 'local', 0, 1)
    and private.is_num_or_null(v -> 'balance', 0, 1), false) end
$$;

-- [{name: upstream|saturation|terrain|local|balance, share: 0..1}]
create or replace function private.is_factors(v jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case when coalesce(jsonb_typeof(v), '') <> 'array' then false else not exists (
    select 1 from jsonb_array_elements(v) f
    where case
      when jsonb_typeof(f) <> 'object' then true
      when (select count(*) from jsonb_object_keys(f)) <> 2 then true
      when coalesce(f ->> 'name', '') not in ('upstream', 'saturation', 'terrain', 'local', 'balance') then true
      when coalesce(jsonb_typeof(f -> 'share'), '') <> 'number' then true
      else not private.is_num_or_null(f -> 'share', 0, 1)
    end) end
$$;

-- AlertState.side {sigatoka: severity|null, cold: severity|null}
create or replace function private.is_side(v jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case when coalesce(jsonb_typeof(v), '') <> 'object' then false else coalesce(
    (select count(*) from jsonb_object_keys(v)) = 2
    and v ? 'sigatoka' and v ? 'cold'
    and not exists (
      select 1 from jsonb_each(v) e
      where not (jsonb_typeof(e.value) = 'null'
                 or (jsonb_typeof(e.value) = 'string'
                     and (e.value #>> '{}') in ('normal', 'watch', 'warning', 'severe', 'stale')))), false) end
$$;

-- Domain NumericValue / DomainValue: {origin, value, ...metadata}
create or replace function private.is_domain_value(v jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select coalesce(jsonb_typeof(v) = 'object' and v ? 'value'
    and jsonb_typeof(v -> 'origin') = 'string' and private.is_origin(v ->> 'origin'), false)
$$;

-- LocalizedText {es, en}: each a string or null, at least one non-blank
create or replace function private.is_localized_text(v jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select case when coalesce(jsonb_typeof(v), '') <> 'object' then false else coalesce(
    (select count(*) from jsonb_object_keys(v)) = 2
    and jsonb_typeof(v -> 'es') in ('string', 'null') and jsonb_typeof(v -> 'en') in ('string', 'null')
    and (coalesce(btrim(v ->> 'es'), '') <> '' or coalesce(btrim(v ->> 'en'), '') <> ''), false) end
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Function privileges: nothing for PUBLIC (functions default to EXECUTE for PUBLIC); only the writing roles.
-- ---------------------------------------------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon;
alter default privileges in schema private revoke execute on functions from public;
grant execute on all functions in schema private to authenticated, service_role;
