-- Demenova schema, migration 2 of 6: farms, lots, zones, field notes, user preferences.
-- Owner: database-engineer (T-015). Class A (PENDING.md P-009). Idempotent. No data.
-- Contracts: docs/contracts/schemas/entities/{farm,lot,zone,field_note,user_prefs}.schema.json; CONTRACTS.md §3.
-- Units SI (ha, months, fractions 0..1); timestamps timestamptz (UTC); geometry GeoJSON EPSG:4326.
-- Rule "null value <=> origin pending" (models.Contract._missing_values_are_pending) is enforced per <field>_origin.
-- Every table gets RLS and loses all client privileges in the same step it is created (grants: migration 5).

-- ---------------------------------------------------------------------------------------------------------
-- farms
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.farms (
  id              text primary key check (id ~ '^farm_[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name            text not null check (btrim(name) <> ''),
  -- ADR-003: auth user id from anonymous sign-in; null only for the public demo farm. Local-only farms never
  -- reach the database, so the contract's "null for local-only" case does not occur here.
  owner_id        uuid references auth.users (id) on delete cascade,
  country         text,  -- nullable: PENDING.md P-003 option (a)
  province        text,
  canton          text,
  location        jsonb not null check (private.is_geojson(location, array['Point'])),
  outline         jsonb check (outline is null or private.is_geojson(outline, array['Polygon'])),
  data_level      smallint not null check (data_level between 0 and 3),
  crop            text not null,
  variety         text,
  variety_origin  public.origin_kind not null,
  catchment_id    text,
  -- Personal data, readable only by the owner. Always null on the demo farm (recipient lives in backend env).
  -- v0: no client may write it (migration 5 column grants); only the service role.
  alert_email     text check (alert_email is null or alert_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- PENDING.md P-002 option (b): random, unguessable code for t.me/<bot>?start=<code>. Generated here, never
  -- written by clients; readable with the farm row (owner, or everyone for the demo farm). Contract addition.
  telegram_code   text not null unique default replace(gen_random_uuid()::text, '-', '')
                  check (telegram_code ~ '^[A-Za-z0-9_-]{16,64}$'),
  language        text not null check (language in ('en', 'es')),
  units           text not null check (units in ('metric', 'imperial')),
  mode            text not null check (mode in ('farmer', 'agronomist')),
  storage_mode    text not null check (storage_mode in ('full', 'saver')),
  is_demo         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  origin          jsonb not null check (private.is_origin_spec(origin)),
  constraint farms_variety_pending check ((variety is null) = (variety_origin = 'pending')),
  -- models.Farm._demo_farm_is_public, plus: every non-demo row in the database has an owner.
  constraint farms_demo_has_no_owner check ((is_demo and owner_id is null) or (not is_demo and owner_id is not null)),
  constraint farms_demo_has_no_email check (not is_demo or alert_email is null),
  -- User farms end in a random suffix of 6+ characters, so no device can squat a planned id (e.g. the demo's).
  constraint farms_user_id_has_suffix check (is_demo or id ~ '-[a-z0-9]{6,}$'),
  -- Target of telegram_subscribers' composite foreign key.
  constraint farms_id_telegram_code_key unique (id, telegram_code)
);
comment on table public.farms is 'Farm (CONTRACTS.md §3) + telegram_code. Demo farm: is_demo, no owner, public read. Others: owner = auth.uid().';
alter table public.farms enable row level security;
revoke all on table public.farms from public, anon, authenticated;

create index if not exists farms_owner_id_idx on public.farms (owner_id) where owner_id is not null;
create index if not exists farms_is_demo_idx on public.farms (id) where is_demo;

create or replace trigger farms_set_updated_at
  before update on public.farms
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------------------------------------
-- lots
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.lots (
  id                          text primary key check (id ~ '^lot_[a-z0-9]+(?:-[a-z0-9]+)*_[0-9]+$'),
  farm_id                     text not null references public.farms (id) on delete cascade,
  name                        text not null check (btrim(name) <> ''),
  geometry                    jsonb not null check (private.is_geojson(geometry, array['Polygon'])),
  area_ha                     public.finite_float check (area_ha > 0),
  area_ha_origin              public.origin_kind not null,
  plant_age_months            public.finite_float check (plant_age_months >= 0),
  plant_age_months_origin     public.origin_kind not null,
  variety                     text,
  variety_origin              public.origin_kind not null,
  drainage_class              text check (drainage_class in ('good', 'moderate', 'poor')),
  drainage_class_origin       public.origin_kind not null,
  drainage_works              text check (drainage_works in ('none', 'ditches', 'other')),
  drainage_works_origin       public.origin_kind not null,
  cover_crop                  text check (cover_crop in ('none', 'mani_forrajero', 'other')),
  cover_crop_origin           public.origin_kind not null,
  last_soil_analysis          jsonb check (last_soil_analysis is null or private.is_soil_analysis(last_soil_analysis)),
  last_soil_analysis_origin   public.origin_kind not null,
  nematode_incidence          text check (nematode_incidence in ('low', 'medium', 'high')),
  nematode_incidence_origin   public.origin_kind not null,
  disease_notes               text,
  bioinputs                   jsonb check (bioinputs is null or private.is_bioinputs(bioinputs)),
  bioinputs_origin            public.origin_kind not null,
  twi_mean                    public.finite_float,
  twi_max                     public.finite_float,
  twi_tercile                 text check (twi_tercile in ('low', 'mid', 'high')),
  defined_by                  text not null check (btrim(defined_by) <> ''),
  to_be_redefined_by          text,
  origin                      jsonb not null check (private.is_origin_spec(origin)),
  -- lot_<farm slug>_<n> belongs to farm_<farm slug> (models.FarmFile._lots_belong_to_farm)
  constraint lots_id_matches_farm check (private.unit_farm_id(id) = farm_id),
  constraint lots_area_ha_pending check ((area_ha is null) = (area_ha_origin = 'pending')),
  constraint lots_plant_age_pending check ((plant_age_months is null) = (plant_age_months_origin = 'pending')),
  constraint lots_variety_pending check ((variety is null) = (variety_origin = 'pending')),
  constraint lots_drainage_class_pending check ((drainage_class is null) = (drainage_class_origin = 'pending')),
  constraint lots_drainage_works_pending check ((drainage_works is null) = (drainage_works_origin = 'pending')),
  constraint lots_cover_crop_pending check ((cover_crop is null) = (cover_crop_origin = 'pending')),
  constraint lots_soil_analysis_pending check ((last_soil_analysis is null) = (last_soil_analysis_origin = 'pending')),
  constraint lots_nematode_pending check ((nematode_incidence is null) = (nematode_incidence_origin = 'pending')),
  constraint lots_bioinputs_pending check ((bioinputs is null) = (bioinputs_origin = 'pending')),
  -- models.Lot._synthetic_lots_name_their_redefiner
  constraint lots_synthetic_has_redefiner check (
    coalesce(private.default_origin(origin), '') <> 'synthetic' or coalesce(btrim(to_be_redefined_by), '') <> '')
);
comment on table public.lots is 'Lot (CONTRACTS.md §3). Readable with its farm; writable by the farm owner except twi_* (engine).';
alter table public.lots enable row level security;
revoke all on table public.lots from public, anon, authenticated;

create index if not exists lots_farm_id_idx on public.lots (farm_id);

-- ---------------------------------------------------------------------------------------------------------
-- zones (data level 1, engine output: TWI terciles)
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.zones (
  id         text primary key check (id ~ '^zone_[a-z0-9]+(?:-[a-z0-9]+)*_(?:low|mid|high)$'),
  farm_id    text not null references public.farms (id) on delete cascade,
  tercile    text not null check (tercile in ('low', 'mid', 'high')),
  twi_range  public.finite_float[] not null
             check (cardinality(twi_range) = 2 and array_position(twi_range, null) is null
                    and twi_range[1] <= twi_range[2]),
  origin     text not null check (origin in ('calibrated', 'sourced')),
  geometry   jsonb not null check (private.is_geojson(geometry, array['Polygon', 'MultiPolygon'])),
  -- zone_<farm slug>_<tercile> (models.ZoneProperties._id_matches_tercile)
  constraint zones_id_matches_farm check (id = 'zone_' || substring(farm_id from 6) || '_' || tercile)
);
comment on table public.zones is 'Zone (CONTRACTS.md §3). Written by the pipeline (service role).';
alter table public.zones enable row level security;
revoke all on table public.zones from public, anon, authenticated;

create index if not exists zones_farm_id_idx on public.zones (farm_id);

-- ---------------------------------------------------------------------------------------------------------
-- field_notes (data level 3)
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.field_notes (
  id          text primary key check (btrim(id) <> ''),
  lot_id      text not null references public.lots (id) on delete cascade
              check (lot_id ~ '^lot_[a-z0-9]+(?:-[a-z0-9]+)*_[0-9]+$'),
  -- Derived from lot_id for row-level security; not part of the contract (select columns explicitly).
  farm_id     text generated always as (private.unit_farm_id(lot_id)) stored not null,
  kind        text not null check (kind in ('soil_analysis', 'water_table', 'management', 'other')),
  date        date not null,
  value_json  jsonb not null check (jsonb_typeof(value_json) = 'object'),
  origin      public.origin_kind not null,
  created_at  timestamptz not null default now()
);
comment on table public.field_notes is 'FieldNote (CONTRACTS.md §3). Owner read/write; demo notes public read.';
alter table public.field_notes enable row level security;
revoke all on table public.field_notes from public, anon, authenticated;

create index if not exists field_notes_lot_date_idx on public.field_notes (lot_id, date);
create index if not exists field_notes_farm_created_idx on public.field_notes (farm_id, created_at);

-- ---------------------------------------------------------------------------------------------------------
-- user_prefs (one row per anonymous auth user; local-only devices keep theirs in IndexedDB)
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.user_prefs (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  device_id     text not null check (btrim(device_id) <> ''),
  language      text not null check (language in ('en', 'es')),
  units         text not null check (units in ('metric', 'imperial')),
  mode          text not null check (mode in ('farmer', 'agronomist')),
  storage_mode  text not null check (storage_mode in ('full', 'saver')),
  theme         text not null check (theme in ('system', 'light', 'dark'))
);
comment on table public.user_prefs is 'UserPrefs (CONTRACTS.md §3). Only the owning user reads or writes its row.';
alter table public.user_prefs enable row level security;
revoke all on table public.user_prefs from public, anon, authenticated;
