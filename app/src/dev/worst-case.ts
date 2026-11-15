// DEV ONLY (break-ui, D-033). Worst-case datasets for stress-testing layouts. Every value is synthetic, tagged
// `origin: synthetic`, and shown with the Demo label. Loaded only by state/data.tsx when import.meta.env.DEV and the URL
// has ?data=worst|empty|one|offline; never part of a production build (checked after each build).
// Values are plausible or schema-backed (break-ui Hard Rule 1): long Spanish names a farm could really type, the
// contract bounds of W (0 and 1), every optional value missing, stale units, 40 lots (no limit in the contract).
import type { DemoData } from '../data/demo';
import type { AlertEvent, AppManifest, FactorName, FarmFile, Lot, Provenance, ReplayDay, ReplayUnit, Severity } from '../types/contracts';

export type WorstKind = 'worst' | 'empty' | 'one' | 'offline' | 'calm';
export const WORST_KINDS: readonly WorstKind[] = ['worst', 'empty', 'one', 'offline', 'calm'];

const PROV: Provenance = {
  id: 'prov-dev-worst-case',
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
  agent: 'frontend-engineer (break-ui)',
  notes: 'Dev-only worst-case fixture for layout stress tests (break-ui). Synthetic values, not data; never shipped.',
};
const ref = { ref: 'manifest.json', ids: [PROV.id] };
const DAYS = ['2026-02-21', '2026-02-22', '2026-02-23', '2026-02-24', '2026-02-25'];

/** Names a farm could really type: long Spanish compounds, accents, a two-letter one, a code-like one. */
const LONG_NAMES = [
  'Lote 12 — Bajío junto al canal de drenaje principal (sector inundable)',
  'L1',
  'Lote San José de las Mercedes – Nueva Siembra Williams 2026',
  'Lote 7B',
  'Parcela experimental de cobertura con maní forrajero y micorrizas',
  'Lote Ñuque–Guayacán',
];

function name(n: number): string {
  return n <= LONG_NAMES.length ? (LONG_NAMES[n - 1] as string) : `Lote ${n}`;
}

function square(n: number) {
  const lon = -79.83 + (n % 8) * 0.0025;
  const lat = -3.37 + Math.floor(n / 8) * 0.0025;
  const d = 0.002;
  return { type: 'Polygon' as const, coordinates: [[[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d], [lon, lat]]] };
}

function lot(n: number): Lot {
  const missing = n % 3 === 0;
  return {
    id: `lot_dev-worst_${n}`,
    farm_id: 'farm_dev-worst',
    name: name(n),
    geometry: square(n),
    area_ha: missing ? null : n === 2 ? 0.08 : 248.75,
    area_ha_origin: missing ? 'pending' : 'synthetic',
    plant_age_months: missing ? null : 0,
    plant_age_months_origin: missing ? 'pending' : 'synthetic',
    variety: null,
    variety_origin: 'pending',
    drainage_class: missing ? null : 'poor',
    drainage_class_origin: missing ? 'pending' : 'synthetic',
    drainage_works: null,
    drainage_works_origin: 'pending',
    cover_crop: missing ? null : 'mani_forrajero',
    cover_crop_origin: missing ? 'pending' : 'synthetic',
    last_soil_analysis: missing ? null : { date: '2019-06-30', ph: 4.2, organic_matter_pct: 0.0005 },
    last_soil_analysis_origin: missing ? 'pending' : 'synthetic',
    nematode_incidence: null,
    nematode_incidence_origin: 'pending',
    disease_notes: null,
    bioinputs: null,
    bioinputs_origin: 'pending',
    twi_mean: null,
    twi_max: null,
    twi_tercile: missing ? null : ((['low', 'mid', 'high'] as const)[n % 3] ?? null),
    defined_by: 'frontend-engineer (break-ui)',
    to_be_redefined_by: 'nobody: dev fixture',
    origin: 'synthetic',
  };
}

const LEVELS: Severity[] = ['severe', 'stale', 'warning', 'normal', 'watch'];
const ALL_FACTORS: FactorName[] = ['upstream', 'saturation', 'terrain', 'local', 'balance'];

function unit(id: string, n: number, date: string): ReplayUnit {
  const level = LEVELS[n % LEVELS.length] as Severity;
  // W at the contract bounds (1 and 0), missing, and ordinary values.
  const w = level === 'stale' ? null : n === 2 ? 1 : n === 4 ? 0 : Number((0.4 + ((n * 37) % 60) / 100).toFixed(4));
  const allMissing = n % 3 === 0;
  return {
    unit_id: id,
    alert: {
      unit_id: id,
      level,
      w,
      factors: w === null ? [] : ALL_FACTORS.map((f, i) => ({ name: f, share: [0.31, 0.27, 0.2, 0.12, 0.1][i] as number })),
      since: '2025-11-02T05:00:00Z',
      updated_at: level === 'stale' ? '2026-02-19T04:00:00Z' : `${date}T04:00:00Z`,
      newest_rain_data_at: level === 'stale' ? '2026-02-18T00:00:00Z' : null,
      confirmations: 2,
      confidence: 0,
      side: { sigatoka: n % 4 === 0 ? 'severe' : null, cold: null },
      origin: 'synthetic',
    },
    features: allMissing
      ? null
      : {
          unit_id: id,
          date,
          rain_local_mm: n === 1 ? 412.7 : 0,
          rain_upstream_24h_mm: n === 1 ? 1288.4 : null,
          rain_upstream_48h_mm: null,
          rain_upstream_72h_mm: null,
          runoff_upstream_mm: null,
          soil_moisture: n === 1 ? 1 : null,
          soil_moisture_source: null,
          api_index: null,
          et0_mm: null,
          etc_mm: null,
          balance_mm: null,
          balance_7d_mm: n === 1 ? -148.35 : null,
          positive_balance_days: null,
          percentiles: { upstream: null, saturation: null, local: null, balance: null },
          twi_rank: null,
          temp_mean_c: n === 1 ? -0.4 : null,
          rh_mean: null,
          leaf_wet_hours: null,
          heat_units: null,
          ndvi: null,
          ndvi_date: null,
          provenance_ids: [PROV.id],
          origin: 'synthetic',
        },
  };
}

/** The all-Normal day (CL-31 calm state): every lot Normal with a low W. */
function calmUnit(u: ReplayUnit): ReplayUnit {
  return { ...u, alert: { ...u.alert, level: 'normal', w: 0.18, newest_rain_data_at: null } };
}

function events(lots: Lot[], date: string): AlertEvent[] {
  return lots.slice(0, 12).map((l, i) => ({
    id: `01JDEVWORST${String(i).padStart(15, '0')}`,
    unit_id: l.id,
    from_level: 'watch',
    to_level: i % 2 ? 'severe' : 'warning',
    w: i % 3 ? 0.9999 : null,
    factors: ALL_FACTORS.map((f) => ({ name: f, share: 0.2 })),
    at: `${date}T0${i % 10}:00:00Z`,
    email_sent: false,
    telegram_sent: false,
    origin: 'synthetic',
  }));
}

export function worstCase(kind: WorstKind): DemoData {
  const count = kind === 'empty' ? 0 : kind === 'one' ? 1 : kind === 'calm' ? 3 : 40;
  const lots = Array.from({ length: count }, (_, i) => lot(i + 1));
  const manifest: AppManifest = {
    schema_version: '1.2.0',
    farm_id: 'farm_dev-worst',
    generated_at: '2026-02-25T04:00:00Z',
    engine_commit: null,
    replay_window: { start: DAYS[0] as string, end: DAYS[DAYS.length - 1] as string },
    provenance: [PROV],
  };
  const farm: FarmFile = {
    farm: {
      id: 'farm_dev-worst',
      name: 'Hacienda Bananera Nuestra Señora del Perpetuo Socorro — Sector Buenavista Bajo',
      owner_id: null,
      country: null,
      province: null,
      canton: null,
      location: { type: 'Point', coordinates: [-79.82, -3.36] },
      outline: null,
      data_level: 2,
      crop: 'banana',
      variety: null,
      variety_origin: 'pending',
      catchment_id: null,
      alert_email: null,
      language: 'es',
      units: 'metric',
      mode: 'agronomist',
      storage_mode: 'full',
      is_demo: true,
      created_at: '2026-02-21T00:00:00Z',
      updated_at: '2026-02-21T00:00:00Z',
      origin: 'synthetic',
    },
    lots,
    provenance: ref,
  };
  const replay: Record<string, ReplayDay | null> = {};
  DAYS.forEach((date, d) => {
    // One missing day in the middle of the window: the strip must show "no data" there.
    replay[date] =
      d === 2
        ? null
        : { date, generated_at: `${date}T04:00:00Z`, provenance: ref, units: lots.map((l, i) => (kind === 'calm' ? calmUnit(unit(l.id, i + 1, date)) : unit(l.id, i + 1, date))), events: d === 3 ? events(lots, date) : [] };
  });
  return {
    manifest,
    farm,
    days: [...DAYS],
    replay,
    source: kind === 'offline' ? 'cache' : 'fixture',
    cachedAt: kind === 'offline' ? '2026-02-22T13:07:00Z' : null,
  };
}

/** The worst-case kind asked for in the URL (?data=...), or null. */
export function worstKindFromUrl(search: string): WorstKind | null {
  const v = new URLSearchParams(search).get('data');
  return v && (WORST_KINDS as readonly string[]).includes(v) ? (v as WorstKind) : null;
}
