// DEVELOPMENT AND TEST FIXTURE. Every value below is synthetic, tagged `origin: synthetic`, and exists only to exercise
// layouts and logic before the data-scientist's snapshots land. It is loaded by Vitest and, in `vite dev` only, when
// app/public/data/demo/manifest.json is missing. The production build never imports it (guarded by import.meta.env.DEV)
// and the UI shows a "Development fixture" notice plus the Demo label whenever it is used.
import type { AppManifest, FarmFile, HistoryFile, Lot, Provenance, ReplayDay } from '../../types/contracts';

export const FIXTURE_PROVENANCE: Provenance = {
  id: 'prov-app-test-fixture',
  dataset: null,
  version: null,
  provider: null,
  url: null,
  accessed: null,
  spatial_resolution: null,
  temporal_resolution: null,
  aoi: null,
  time_range: null,
  processing: [],
  code_commit: null,
  agent: 'frontend-engineer',
  notes: 'App test fixture: synthetic values invented for layout and logic tests only. Not data; never shipped.',
};

const ref = { ref: 'manifest.json', ids: [FIXTURE_PROVENANCE.id] };

export const fixtureManifest: AppManifest = {
  schema_version: '1.1.0',
  farm_id: 'farm_fixture',
  generated_at: '2026-02-23T15:00:00Z',
  engine_commit: null,
  replay_window: { start: '2026-02-15', end: '2026-03-05' },
  provenance: [FIXTURE_PROVENANCE],
};

const square = (lon: number, lat: number, d = 0.0022) => ({
  type: 'Polygon' as const,
  coordinates: [[[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d], [lon, lat]]],
});

const lot = (n: number, name: string, lon: number, lat: number, tercile: Lot['twi_tercile']): Lot => ({
  id: `lot_fixture_${n}`,
  farm_id: 'farm_fixture',
  name,
  geometry: square(lon, lat),
  area_ha: 5.5,
  area_ha_origin: 'synthetic',
  plant_age_months: 30,
  plant_age_months_origin: 'synthetic',
  variety: null,
  variety_origin: 'synthetic',
  drainage_class: n === 1 ? 'poor' : 'good',
  drainage_class_origin: 'synthetic',
  drainage_works: 'ditches',
  drainage_works_origin: 'synthetic',
  cover_crop: 'none',
  cover_crop_origin: 'synthetic',
  last_soil_analysis: null,
  last_soil_analysis_origin: 'synthetic',
  nematode_incidence: null,
  nematode_incidence_origin: 'synthetic',
  disease_notes: null,
  bioinputs: null,
  bioinputs_origin: 'synthetic',
  twi_mean: null,
  twi_max: null,
  twi_tercile: tercile,
  defined_by: 'frontend-engineer (test fixture)',
  to_be_redefined_by: 'data-scientist snapshots (T-024)',
  origin: 'synthetic',
});

export const fixtureFarm: FarmFile = {
  farm: {
    id: 'farm_fixture',
    name: 'Fixture farm',
    owner_id: null,
    country: null,
    province: null,
    canton: null,
    location: { type: 'Point', coordinates: [-79.785, -3.33] },
    outline: null,
    data_level: 2,
    crop: 'banana',
    variety: null,
    variety_origin: 'synthetic',
    catchment_id: null,
    alert_email: null,
    language: 'es',
    units: 'metric',
    mode: 'agronomist',
    storage_mode: 'full',
    is_demo: true,
    created_at: '2026-02-15T00:00:00Z',
    updated_at: '2026-02-15T00:00:00Z',
    origin: 'synthetic',
  },
  lots: [lot(1, 'Lote 1', -79.787, -3.332, 'high'), lot(2, 'Lote 2', -79.783, -3.328, 'low')],
  provenance: ref,
};

const unit = (id: string, level: ReplayDay['units'][number]['alert']['level'], w: number | null, date: string, rain: number | null) => ({
  unit_id: id,
  alert: {
    unit_id: id,
    level,
    w,
    factors: w === null ? [] : [{ name: 'upstream' as const, share: 0.5 }, { name: 'terrain' as const, share: 0.3 }],
    since: `${date}T05:00:00Z`,
    updated_at: `${date}T15:00:00Z`,
    newest_rain_data_at: `${date}T12:00:00Z`,
    confirmations: 0,
    confidence: 2,
    side: { sigatoka: null, cold: null },
    origin: 'synthetic' as const,
  },
  features: {
    unit_id: id,
    date,
    rain_local_mm: rain,
    rain_upstream_24h_mm: rain,
    rain_upstream_48h_mm: null,
    rain_upstream_72h_mm: null,
    runoff_upstream_mm: null,
    soil_moisture: null,
    soil_moisture_source: null,
    api_index: null,
    et0_mm: null,
    etc_mm: null,
    balance_mm: null,
    balance_7d_mm: null,
    positive_balance_days: null,
    percentiles: { upstream: null, saturation: null, local: null, balance: null },
    twi_rank: null,
    temp_mean_c: null,
    rh_mean: null,
    leaf_wet_hours: null,
    heat_units: null,
    ndvi: null,
    ndvi_date: null,
    provenance_ids: [FIXTURE_PROVENANCE.id],
    origin: 'synthetic' as const,
  },
});

export const fixtureReplay: Record<string, ReplayDay> = {
  '2026-02-21': {
    date: '2026-02-21',
    generated_at: '2026-02-21T15:00:00Z',
    provenance: ref,
    units: [unit('lot_fixture_1', 'watch', 0.45, '2026-02-21', 20), unit('lot_fixture_2', 'normal', 0.2, '2026-02-21', 20)],
    events: [],
  },
  '2026-02-22': {
    date: '2026-02-22',
    generated_at: '2026-02-22T15:00:00Z',
    provenance: ref,
    units: [unit('lot_fixture_1', 'severe', 0.85, '2026-02-22', 60), unit('lot_fixture_2', 'watch', 0.42, '2026-02-22', 60)],
    events: [
      {
        id: '01JFIXTURE0000000000000001',
        unit_id: 'lot_fixture_1',
        from_level: 'watch',
        to_level: 'severe',
        w: 0.85,
        factors: [{ name: 'upstream', share: 0.5 }],
        at: '2026-02-22T15:00:00Z',
        email_sent: false,
        telegram_sent: false,
        origin: 'synthetic',
      },
    ],
  },
  '2026-02-23': {
    date: '2026-02-23',
    generated_at: '2026-02-23T15:00:00Z',
    provenance: ref,
    units: [unit('lot_fixture_1', 'warning', 0.65, '2026-02-23', null), unit('lot_fixture_2', 'normal', null, '2026-02-23', null)],
    events: [],
  },
};

const days = ['2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23'];
const nulls = () => days.map(() => null);

export const fixtureHistory: Record<string, HistoryFile> = {
  lot_fixture_1: {
    unit_id: 'lot_fixture_1',
    generated_at: '2026-02-23T15:00:00Z',
    provenance: ref,
    dates: days,
    series: {
      origin: 'synthetic',
      soil_moisture_origin: null,
      rain_local_mm: [0, 2, null, 5, 20, 60, null],
      rain_upstream_24h_mm: nulls(),
      rain_upstream_48h_mm: nulls(),
      rain_upstream_72h_mm: nulls(),
      runoff_upstream_mm: nulls(),
      soil_moisture: nulls(),
      soil_moisture_source: nulls(),
      api_index: nulls(),
      et0_mm: nulls(),
      etc_mm: nulls(),
      balance_mm: nulls(),
      balance_7d_mm: nulls(),
      positive_balance_days: nulls(),
      percentiles: { upstream: nulls(), saturation: nulls(), local: nulls(), balance: nulls() },
      twi_rank: nulls(),
      temp_mean_c: [26, 26.5, 27, null, 25, 24.5, 25],
      rh_mean: nulls(),
      leaf_wet_hours: nulls(),
      heat_units: nulls(),
      ndvi: nulls(),
      ndvi_date: nulls(),
    },
  },
};
