-- Demenova schema, migration 3 of 6: provenance, engine outputs, flood memories, domain tables.
-- Owner: database-engineer (T-015). Class A (PENDING.md P-009). Idempotent. No data.
-- Contracts: docs/contracts/schemas/entities/{provenance,daily_feature,alert_state,alert_event,flood_memory,
-- practice,strategy}.schema.json. Written by the pipeline with the service role, except flood_memories (owner).
--
-- unit_id is a lot, zone or farm id. farm_id / lot_id / zone_id are generated from it (not contract fields; select
-- contract columns explicitly): farm_id drives row-level security, lot_id / zone_id give referential integrity so
-- deleting a lot or zone deletes its features, state and events.

-- ---------------------------------------------------------------------------------------------------------
-- provenance (docs/DATA_POLICY.md §3, CONTRACTS.md §8.2)
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.provenance (
  id                   text primary key check (id ~ '^prov-[A-Za-z0-9][A-Za-z0-9._-]*$'),
  dataset              text,
  version              text,
  provider             text,
  url                  text,
  -- date or date-time as written in the record (UTC); kept as text to preserve which of the two it is
  accessed             text check (accessed is null
                                   or accessed ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(?:[T ][0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]+)?)?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)?$'),
  spatial_resolution   text,
  temporal_resolution  text,
  aoi                  text,
  time_range           jsonb check (time_range is null
                                    or (jsonb_typeof(time_range) = 'array' and jsonb_array_length(time_range) = 2)),
  processing           text[] not null default '{}',
  code_commit          text,
  agent                text not null check (btrim(agent) <> ''),
  notes                text not null,
  -- models.Provenance._complete_or_explained (UNVERIFIED never ships; full citation or explained null dataset)
  constraint provenance_no_unverified check (
    concat_ws(' ', dataset, version, provider, url, spatial_resolution, temporal_resolution, aoi, agent) !~* 'unverified'),
  constraint provenance_complete_or_explained check (
    (dataset is null and btrim(notes) <> '')
    or (dataset is not null and coalesce(btrim(version), '') <> '' and coalesce(btrim(provider), '') <> ''
        and coalesce(btrim(url), '') <> '' and accessed is not null))
);
comment on table public.provenance is 'Provenance records (DATA_POLICY.md §3). Public read; service role writes.';
alter table public.provenance enable row level security;
revoke all on table public.provenance from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- daily_features (one row per unit per day; PK serves (unit_id, date) range reads)
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.daily_features (
  unit_id               text not null check (private.unit_farm_id(unit_id) is not null),
  date                  date not null,
  farm_id               text generated always as (private.unit_farm_id(unit_id)) stored not null
                        references public.farms (id) on delete cascade,
  lot_id                text generated always as (private.unit_lot_id(unit_id)) stored
                        references public.lots (id) on delete cascade,
  zone_id               text generated always as (private.unit_zone_id(unit_id)) stored
                        references public.zones (id) on delete cascade,
  rain_local_mm         public.finite_float check (rain_local_mm >= 0),
  rain_upstream_24h_mm  public.finite_float check (rain_upstream_24h_mm >= 0),
  rain_upstream_48h_mm  public.finite_float check (rain_upstream_48h_mm >= 0),
  rain_upstream_72h_mm  public.finite_float check (rain_upstream_72h_mm >= 0),
  runoff_upstream_mm    public.finite_float check (runoff_upstream_mm >= 0),
  soil_moisture         public.finite_float check (soil_moisture between 0 and 1),
  soil_moisture_source  text check (soil_moisture_source in ('smap', 'api')),
  api_index             public.finite_float check (api_index >= 0),
  et0_mm                public.finite_float,
  etc_mm                public.finite_float,
  balance_mm            public.finite_float,
  balance_7d_mm         public.finite_float,
  positive_balance_days integer check (positive_balance_days >= 0),
  percentiles           jsonb not null check (private.is_percentiles(percentiles)),
  twi_rank              public.finite_float check (twi_rank between 0 and 1),
  temp_mean_c           public.finite_float,
  rh_mean               public.finite_float check (rh_mean between 0 and 1),
  leaf_wet_hours        public.finite_float check (leaf_wet_hours between 0 and 24),
  heat_units            public.finite_float,
  ndvi                  public.finite_float check (ndvi between -1 and 1),
  ndvi_date             date,
  provenance_ids        text[] not null default '{}' check (private.are_provenance_ids(provenance_ids)),
  origin                jsonb not null check (private.is_origin_spec(origin)),
  primary key (unit_id, date),
  -- models.DailyFeature._soil_moisture_has_a_source
  constraint daily_features_soil_source check ((soil_moisture is null) = (soil_moisture_source is null)),
  constraint daily_features_ndvi_date check (ndvi is not null or ndvi_date is null)
);
comment on table public.daily_features is 'DailyFeature (CONTRACTS.md §3). Readable with its farm; service role writes.';
alter table public.daily_features enable row level security;
revoke all on table public.daily_features from public, anon, authenticated;

create index if not exists daily_features_farm_date_idx on public.daily_features (farm_id, date);
create index if not exists daily_features_lot_id_idx on public.daily_features (lot_id) where lot_id is not null;
create index if not exists daily_features_zone_id_idx on public.daily_features (zone_id) where zone_id is not null;

-- ---------------------------------------------------------------------------------------------------------
-- alert_states (current state per unit)
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.alert_states (
  unit_id              text primary key check (private.unit_farm_id(unit_id) is not null),
  farm_id              text generated always as (private.unit_farm_id(unit_id)) stored not null
                       references public.farms (id) on delete cascade,
  lot_id               text generated always as (private.unit_lot_id(unit_id)) stored
                       references public.lots (id) on delete cascade,
  zone_id              text generated always as (private.unit_zone_id(unit_id)) stored
                       references public.zones (id) on delete cascade,
  level                public.severity_level not null,
  w                    public.finite_float check (w between 0 and 1),
  factors              jsonb not null default '[]' check (private.is_factors(factors)),
  since                timestamptz not null,
  updated_at           timestamptz not null,
  newest_rain_data_at  timestamptz,
  confirmations        smallint not null check (confirmations between 0 and 2),
  confidence           smallint not null check (confidence between 0 and 3),
  side                 jsonb not null check (private.is_side(side)),
  origin               jsonb not null check (private.is_origin_spec(origin))
);
comment on table public.alert_states is 'AlertState (CONTRACTS.md §3). Readable with its farm; service role writes.';
alter table public.alert_states enable row level security;
revoke all on table public.alert_states from public, anon, authenticated;

create index if not exists alert_states_farm_id_idx on public.alert_states (farm_id);
create index if not exists alert_states_lot_id_idx on public.alert_states (lot_id) where lot_id is not null;
create index if not exists alert_states_zone_id_idx on public.alert_states (zone_id) where zone_id is not null;

-- ---------------------------------------------------------------------------------------------------------
-- alert_events (level transitions)
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.alert_events (
  id             text primary key check (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  unit_id        text not null check (private.unit_farm_id(unit_id) is not null),
  farm_id        text generated always as (private.unit_farm_id(unit_id)) stored not null
                 references public.farms (id) on delete cascade,
  lot_id         text generated always as (private.unit_lot_id(unit_id)) stored
                 references public.lots (id) on delete cascade,
  zone_id        text generated always as (private.unit_zone_id(unit_id)) stored
                 references public.zones (id) on delete cascade,
  from_level     public.severity_level not null,
  to_level       public.severity_level not null,
  w              public.finite_float check (w between 0 and 1),
  factors        jsonb not null default '[]' check (private.is_factors(factors)),
  at             timestamptz not null,
  email_sent     boolean not null default false,
  telegram_sent  boolean not null default false,
  origin         jsonb not null check (private.is_origin_spec(origin)),
  -- Target of flood_memories' composite foreign key: a memory can only match an event of its own farm.
  constraint alert_events_id_farm_id_key unique (id, farm_id)
);
comment on table public.alert_events is 'AlertEvent (CONTRACTS.md §3). Readable with its farm; service role writes.';
alter table public.alert_events enable row level security;
revoke all on table public.alert_events from public, anon, authenticated;

create index if not exists alert_events_farm_at_idx on public.alert_events (farm_id, at desc);
create index if not exists alert_events_unit_at_idx on public.alert_events (unit_id, at desc);
create index if not exists alert_events_lot_id_idx on public.alert_events (lot_id) where lot_id is not null;
create index if not exists alert_events_zone_id_idx on public.alert_events (zone_id) where zone_id is not null;

-- ---------------------------------------------------------------------------------------------------------
-- flood_memories (farmer-reported past floods; origin is always 'observed')
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.flood_memories (
  id                text primary key check (btrim(id) <> ''),
  farm_id           text not null references public.farms (id) on delete cascade
                    check (farm_id ~ '^farm_[a-z0-9]+(?:-[a-z0-9]+)*$'),
  date_or_month     text not null check (date_or_month ~ '^[0-9]{4}-[0-9]{2}(?:-[0-9]{2})?$'),
  lots_or_zone      text[] not null default '{}',
  days_with_water   public.finite_float check (days_with_water >= 0),
  damage_notes      text,
  reported_by       text not null check (btrim(reported_by) <> ''),
  origin            text not null default 'observed' check (origin = 'observed'),
  -- Set by the engine's verification (service role); clients cannot write it (migration 5 column grants).
  matched_event_id  text check (matched_event_id is null or matched_event_id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  created_at        timestamptz not null default now(),
  -- Same-farm match only; deleting the event clears the match, not the memory (column list: Postgres 15+).
  constraint flood_memories_matched_event_fkey foreign key (matched_event_id, farm_id)
    references public.alert_events (id, farm_id) on delete set null (matched_event_id)
);
comment on table public.flood_memories is 'FloodMemory (CONTRACTS.md §3). Owner read/write except matched_event_id; demo memories public read.';
alter table public.flood_memories enable row level security;
revoke all on table public.flood_memories from public, anon, authenticated;

create index if not exists flood_memories_farm_created_idx on public.flood_memories (farm_id, created_at);
create index if not exists flood_memories_matched_event_idx on public.flood_memories (matched_event_id, farm_id)
  where matched_event_id is not null;

-- ---------------------------------------------------------------------------------------------------------
-- practices and strategies (domain tables, agronomist; source of the app's strategy screens)
-- Nested values keep the contract shape: NumericValue / DomainValue / LocalizedText / SourceRef as jsonb.
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.practices (
  practice_id                  text primary key check (practice_id ~ '^[a-z][a-z0-9_]*$'),
  name_es                      text not null check (btrim(name_es) <> ''),
  name_en                      text not null check (btrim(name_en) <> ''),
  waterlogging_tolerance_days  jsonb not null check (private.is_domain_value(waterlogging_tolerance_days)),
  root_depth_cm                jsonb not null check (private.is_domain_value(root_depth_cm)),
  soil_benefits                jsonb not null check (private.is_domain_value(soil_benefits)),
  cost_usd_ha                  jsonb not null check (private.is_domain_value(cost_usd_ha)),
  labour                       jsonb not null check (private.is_domain_value(labour)),
  risks                        jsonb not null check (private.is_domain_value(risks)),
  sources                      jsonb not null default '[]' check (jsonb_typeof(sources) = 'array'),
  approved_by                  text
);
comment on table public.practices is 'PracticeTable row (domain/practices.yaml). Public read; service role writes.';
alter table public.practices enable row level security;
revoke all on table public.practices from public, anon, authenticated;

create table if not exists public.strategies (
  strategy_id  text not null check (strategy_id ~ '^[a-z][a-z0-9_]*$'),
  -- ["*"] = regional default (public); otherwise unit ids of a single farm
  lot_scope    text[] not null check (private.is_valid_scope(lot_scope)),
  -- Derived from lot_scope for row-level security; null for regional defaults. Not a contract field.
  farm_id      text generated always as (private.scope_farm_id(lot_scope)) stored
               references public.farms (id) on delete cascade,
  label        text not null check (label in ('A', 'B', 'C')),
  what         jsonb not null check (private.is_localized_text(what)),
  why          jsonb not null check (private.is_localized_text(why)),
  evidence     jsonb not null default '[]' check (jsonb_typeof(evidence) = 'array'),
  benefits     jsonb not null check (private.is_localized_text(benefits)),
  gaps         jsonb not null check (private.is_localized_text(gaps)),
  risks        jsonb not null check (private.is_localized_text(risks)),
  scores       jsonb not null check (
                 jsonb_typeof(scores) = 'object'
                 and private.is_domain_value(scores -> 'soil') and private.is_domain_value(scores -> 'water')
                 and private.is_domain_value(scores -> 'cost') and private.is_domain_value(scores -> 'labour')),
  approved_by  text,
  origin       public.origin_kind not null,
  primary key (strategy_id, lot_scope)
);
comment on table public.strategies is 'Strategy (domain/strategies.yaml). Regional/demo public read; farm-scoped owner read; service role writes.';
alter table public.strategies enable row level security;
revoke all on table public.strategies from public, anon, authenticated;

create index if not exists strategies_farm_id_idx on public.strategies (farm_id) where farm_id is not null;
