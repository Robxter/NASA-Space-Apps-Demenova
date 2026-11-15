// Farm setup, data levels 0-2 (SPEC "Data modes"): pin, outline, exact lots (drawn, imported or typed).
// Pure functions: every value the user gives is tagged `provided` (a GPS fix is `observed`); anything not given stays
// null with origin `pending`. Nothing is estimated here (no area from shapes, no zones invented for a new outline).
import type { DataLevel, Farm, Lot, Origin, Point, Polygon, Position, UserPrefs } from '../types/contracts';

/** A lot kept on the device. A typed lot may have no shape yet; it syncs once it has one (lots.geometry is required). */
export type LocalLot = Omit<Lot, 'geometry'> & { geometry: Polygon | null };

export interface LocalFarmRecord {
  farm: Farm;
  lots: LocalLot[];
  /** Last successful sync to Supabase (UTC), or null while only on this device. */
  synced_at: string | null;
  sync_error: string | null;
}

export type Confidence = 'low' | 'medium_low' | 'medium' | 'high';

/** SPEC "Data modes" table: confidence badge per data level. */
export const CONFIDENCE_BY_LEVEL: Record<DataLevel, Confidence> = { 0: 'low', 1: 'medium_low', 2: 'medium', 3: 'high' };

export function dataLevelOf(farm: Pick<Farm, 'outline'>, lots: readonly LocalLot[]): DataLevel {
  if (lots.length > 0) return 2;
  if (farm.outline) return 1;
  return 0;
}

export function slugify(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');
  return s || 'farm';
}

export function randomSuffix(rand: () => number = Math.random): string {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => abc[Math.floor(rand() * abc.length)] ?? 'a').join('');
}

/** farm_<slug>-<suffix>: matches the database checks (user farm ids end in a 6+ character suffix). */
export function makeFarmId(name: string, suffix: string): string {
  return `farm_${slugify(name)}-${suffix}`;
}

export function isPosition(p: unknown): p is Position {
  return (
    Array.isArray(p) &&
    p.length >= 2 &&
    typeof p[0] === 'number' &&
    typeof p[1] === 'number' &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1]) &&
    Math.abs(p[0]) <= 180 &&
    Math.abs(p[1]) <= 90
  );
}

/** A polygon from tapped or imported points: [lon, lat], closed, at least 3 distinct corners. */
export function polygonFrom(points: readonly Position[]): Polygon | null {
  if (!points.every(isPosition)) return null;
  const ring = points.map((p) => [p[0] as number, p[1] as number]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && first[0] === last[0] && first[1] === last[1]) ring.pop();
  const distinct = new Set(ring.map((p) => p.join(',')));
  if (distinct.size < 3) return null;
  return { type: 'Polygon', coordinates: [[...ring, [...(ring[0] as number[])]]] };
}

export function newFarm(input: {
  name: string;
  location: Point;
  locationOrigin: Extract<Origin, 'provided' | 'observed'>;
  prefs: Pick<UserPrefs, 'language' | 'units' | 'mode' | 'storage_mode'>;
  ownerId: string | null;
  now: string;
  suffix?: string;
}): LocalFarmRecord {
  const name = input.name.trim();
  return {
    farm: {
      id: makeFarmId(name, input.suffix ?? randomSuffix()),
      name,
      owner_id: input.ownerId,
      country: null,
      province: null,
      canton: null,
      location: input.location,
      outline: null,
      data_level: 0,
      // Demenova is built for banana farms (SPEC); the farm did not state a variety.
      crop: 'banana',
      variety: null,
      variety_origin: 'pending',
      catchment_id: null,
      alert_email: null,
      language: input.prefs.language,
      units: input.prefs.units,
      mode: input.prefs.mode,
      storage_mode: input.prefs.storage_mode,
      is_demo: false,
      created_at: input.now,
      updated_at: input.now,
      origin: { '*': 'provided', location: input.locationOrigin },
    },
    lots: [],
    synced_at: null,
    sync_error: null,
  };
}

function touch(rec: LocalFarmRecord, farm: Partial<Farm>, lots: LocalLot[], now: string): LocalFarmRecord {
  const next = { ...rec.farm, ...farm, updated_at: now };
  return { ...rec, farm: { ...next, data_level: dataLevelOf(next, lots) }, lots, synced_at: null, sync_error: null };
}

export function setOutline(rec: LocalFarmRecord, outline: Polygon | null, now: string): LocalFarmRecord {
  return touch(rec, { outline }, rec.lots, now);
}

export function setPin(rec: LocalFarmRecord, location: Point, origin: 'provided' | 'observed', now: string): LocalFarmRecord {
  const base = typeof rec.farm.origin === 'object' ? rec.farm.origin : { '*': rec.farm.origin };
  return touch(rec, { location, origin: { ...base, location: origin } }, rec.lots, now);
}

export interface LotInput {
  name: string;
  geometry: Polygon | null;
  /** Hectares (SI), as typed; null when not given. Never computed from the shape. */
  area_ha: number | null;
  plant_age_months: number | null;
}

const given = (v: number | null): Origin => (v === null ? 'pending' : 'provided');

export function nextLotNumber(lots: readonly LocalLot[]): number {
  return lots.reduce((n, l) => Math.max(n, Number(/_(\d+)$/.exec(l.id)?.[1] ?? 0)), 0) + 1;
}

export function addLot(rec: LocalFarmRecord, input: LotInput, now: string): LocalFarmRecord {
  const area = input.area_ha !== null && Number.isFinite(input.area_ha) && input.area_ha > 0 ? input.area_ha : null;
  const age =
    input.plant_age_months !== null && Number.isFinite(input.plant_age_months) && input.plant_age_months >= 0
      ? input.plant_age_months
      : null;
  const n = nextLotNumber(rec.lots);
  const lot: LocalLot = {
    id: `lot_${rec.farm.id.replace(/^farm_/, '')}_${n}`,
    farm_id: rec.farm.id,
    name: input.name.trim() || `#${n}`,
    geometry: input.geometry,
    area_ha: area,
    area_ha_origin: given(area),
    plant_age_months: age,
    plant_age_months_origin: given(age),
    variety: null,
    variety_origin: 'pending',
    drainage_class: null,
    drainage_class_origin: 'pending',
    drainage_works: null,
    drainage_works_origin: 'pending',
    cover_crop: null,
    cover_crop_origin: 'pending',
    last_soil_analysis: null,
    last_soil_analysis_origin: 'pending',
    nematode_incidence: null,
    nematode_incidence_origin: 'pending',
    disease_notes: null,
    bioinputs: null,
    bioinputs_origin: 'pending',
    twi_mean: null,
    twi_max: null,
    twi_tercile: null,
    defined_by: 'farm user (app)',
    to_be_redefined_by: null,
    origin: { '*': 'provided' },
  };
  return touch(rec, {}, [...rec.lots, lot], now);
}

export function removeLot(rec: LocalFarmRecord, id: string, now: string): LocalFarmRecord {
  return touch(rec, {}, rec.lots.filter((l) => l.id !== id), now);
}

export interface ImportResult {
  lots: { name: string; geometry: Polygon }[];
  /** Feature numbers (1-based) that were skipped, with the reason key. */
  skipped: { index: number; reason: 'not_polygon' | 'bad_coordinates' }[];
  error: 'not_json' | 'not_geojson' | null;
}

/** GeoJSON import (FeatureCollection, Feature or bare Polygon/MultiPolygon). Each polygon becomes one lot. */
export function parseLotsGeoJson(text: string): ImportResult {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { lots: [], skipped: [], error: 'not_json' };
  }
  const o = doc as { type?: string; features?: unknown[]; geometry?: unknown; properties?: Record<string, unknown> };
  const features: { geometry: unknown; properties?: Record<string, unknown> }[] =
    o?.type === 'FeatureCollection' && Array.isArray(o.features)
      ? (o.features as { geometry: unknown; properties?: Record<string, unknown> }[])
      : o?.type === 'Feature'
        ? [{ geometry: o.geometry, properties: o.properties }]
        : o?.type === 'Polygon' || o?.type === 'MultiPolygon'
          ? [{ geometry: o }]
          : [];
  if (!features.length) return { lots: [], skipped: [], error: 'not_geojson' };
  const out: ImportResult = { lots: [], skipped: [], error: null };
  features.forEach((f, i) => {
    const g = f?.geometry as { type?: string; coordinates?: unknown } | undefined;
    const label = f?.properties?.name ?? f?.properties?.nombre ?? f?.properties?.lot ?? f?.properties?.lote;
    const name = typeof label === 'string' || typeof label === 'number' ? String(label) : '';
    const rings: unknown[] =
      g?.type === 'Polygon' ? [g.coordinates] : g?.type === 'MultiPolygon' && Array.isArray(g.coordinates) ? g.coordinates : [];
    if (!rings.length) {
      out.skipped.push({ index: i + 1, reason: 'not_polygon' });
      return;
    }
    rings.forEach((poly, j) => {
      const outer = Array.isArray(poly) ? (poly[0] as Position[] | undefined) : undefined;
      const p = Array.isArray(outer) ? polygonFrom(outer) : null;
      if (!p) out.skipped.push({ index: i + 1, reason: 'bad_coordinates' });
      else out.lots.push({ name: rings.length > 1 && name ? `${name} (${j + 1})` : name, geometry: p });
    });
  });
  return out;
}

type BBox = [number, number, number, number];

export function bboxOf(coords: unknown): BBox | null {
  let b: BBox | null = null;
  const walk = (c: unknown) => {
    if (isPosition(c)) {
      const [x, y] = c as [number, number];
      b = b ? [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)] : [x, y, x, y];
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(coords);
  return b;
}

/** Whether two shapes' bounding boxes overlap (used to show sourced zones only where they exist). */
export function bboxesOverlap(a: BBox | null, b: BBox | null): boolean {
  return !!a && !!b && a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}
