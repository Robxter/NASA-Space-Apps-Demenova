-- Demenova schema, migration 6 of 6: the views the app reads.
-- Owner: database-engineer (T-015). Class A (PENDING.md P-009). Idempotent (create or replace).
-- security_invoker = true: every view runs with the caller's privileges, so the table policies of migration 5
-- apply (a plain view would run as its owner and bypass row-level security).
-- ADR-004: data-saver reads v_farm_status + v_lot_history_7d; full mode reads v_lot_history_90d.
-- History windows end at the newest stored date of each unit (not at today), so a replayed or lagging unit
-- still returns its last 7 / 90 days. Clients filter by farm_id or unit_id and order by date / at.

-- Current alert state per unit, with the names the Home and Map screens show.
create or replace view public.v_farm_status with (security_invoker = true) as
select
  s.farm_id,
  f.name            as farm_name,
  f.is_demo,
  f.data_level,
  s.unit_id,
  case when s.lot_id is not null then 'lot' when s.zone_id is not null then 'zone' else 'farm' end as unit_kind,
  l.name            as lot_name,
  z.tercile         as zone_tercile,
  s.level,
  s.w,
  s.factors,
  s.since,
  s.updated_at,
  s.newest_rain_data_at,
  s.confirmations,
  s.confidence,
  s.side,
  s.origin
from public.alert_states s
join public.farms f on f.id = s.farm_id
left join public.lots l on l.id = s.lot_id
left join public.zones z on z.id = s.zone_id;

comment on view public.v_farm_status is 'Current AlertState per unit with farm and unit names. RLS of the base tables applies.';

-- DailyFeature columns exactly as the contract names them, plus farm_id for filtering.
create or replace view public.v_lot_history_7d with (security_invoker = true) as
select
  d.unit_id, d.farm_id, d.date,
  d.rain_local_mm, d.rain_upstream_24h_mm, d.rain_upstream_48h_mm, d.rain_upstream_72h_mm, d.runoff_upstream_mm,
  d.soil_moisture, d.soil_moisture_source, d.api_index, d.et0_mm, d.etc_mm, d.balance_mm, d.balance_7d_mm,
  d.positive_balance_days, d.percentiles, d.twi_rank, d.temp_mean_c, d.rh_mean, d.leaf_wet_hours, d.heat_units,
  d.ndvi, d.ndvi_date, d.provenance_ids, d.origin
from public.daily_features d
where d.date > (select max(m.date) from public.daily_features m where m.unit_id = d.unit_id) - 7;

comment on view public.v_lot_history_7d is 'Last 7 stored days of DailyFeature per unit (data-saver mode). RLS applies.';

create or replace view public.v_lot_history_90d with (security_invoker = true) as
select
  d.unit_id, d.farm_id, d.date,
  d.rain_local_mm, d.rain_upstream_24h_mm, d.rain_upstream_48h_mm, d.rain_upstream_72h_mm, d.runoff_upstream_mm,
  d.soil_moisture, d.soil_moisture_source, d.api_index, d.et0_mm, d.etc_mm, d.balance_mm, d.balance_7d_mm,
  d.positive_balance_days, d.percentiles, d.twi_rank, d.temp_mean_c, d.rh_mean, d.leaf_wet_hours, d.heat_units,
  d.ndvi, d.ndvi_date, d.provenance_ids, d.origin
from public.daily_features d
where d.date > (select max(m.date) from public.daily_features m where m.unit_id = d.unit_id) - 90;

comment on view public.v_lot_history_90d is 'Last 90 stored days of DailyFeature per unit (full mode). RLS applies.';

-- Alert log: AlertEvent columns plus unit names.
create or replace view public.v_alert_log with (security_invoker = true) as
select
  e.id,
  e.farm_id,
  e.unit_id,
  case when e.lot_id is not null then 'lot' when e.zone_id is not null then 'zone' else 'farm' end as unit_kind,
  l.name     as lot_name,
  z.tercile  as zone_tercile,
  e.from_level,
  e.to_level,
  e.w,
  e.factors,
  e."at",
  e.email_sent,
  e.telegram_sent,
  e.origin
from public.alert_events e
left join public.lots l on l.id = e.lot_id
left join public.zones z on z.id = e.zone_id;

comment on view public.v_alert_log is 'AlertEvent log with unit names; order by at desc on the client. RLS applies.';

-- Views are read-only for clients (simple views are auto-updatable; RLS would still block, this is belt and braces).
revoke all on table public.v_farm_status, public.v_lot_history_7d, public.v_lot_history_90d, public.v_alert_log
  from anon, authenticated;
grant select on table public.v_farm_status, public.v_lot_history_7d, public.v_lot_history_90d, public.v_alert_log
  to anon, authenticated;
grant all on table public.v_farm_status, public.v_lot_history_7d, public.v_lot_history_90d, public.v_alert_log
  to service_role;
