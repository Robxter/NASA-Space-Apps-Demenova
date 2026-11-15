// CSV import of lots (block 4): the columns of app/public/templates/demenova-lots-template.csv, one row per lot, SI
// units. Hand-written parser (no dependency): comma delimiter, RFC 4180 quoting ("" escapes, commas and line breaks
// inside quotes), optional UTF-8 BOM, LF or CRLF. Every value a user gives becomes `provided` in addLot; nothing is
// estimated or filled in. Each rejected row is reported with its line number and a reason key (en/es in the app).
import type { Polygon, Position } from '../types/contracts';
import { isPosition, polygonFrom } from './farmSetup';

export const CSV_COLUMNS = ['lot_name', 'area_ha', 'plant_age_months', 'latitude', 'longitude', 'polygon_wkt'] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];

/** Same limit as the GeoJSON import. */
export const CSV_MAX_BYTES = 2_000_000;

export type CsvReason =
  | 'columns'
  | 'name_missing'
  | 'name_long'
  | 'number'
  | 'decimal_comma'
  | 'range'
  | 'latlon_pair'
  | 'wkt'
  | 'not_closed'
  | 'outside';

export interface CsvLot {
  line: number;
  name: string;
  area_ha: number | null;
  plant_age_months: number | null;
  geometry: Polygon | null;
}

export interface CsvResult {
  lots: CsvLot[];
  rejected: { line: number; reason: CsvReason; column?: CsvColumn }[];
  /** File-level problem: nothing was read. */
  error: 'empty' | 'header' | null;
  /** Header names that are not template columns. */
  unknownColumns: string[];
}

const RANGES: Partial<Record<CsvColumn, [number, number]>> = {
  area_ha: [0, 10_000],
  plant_age_months: [0, 600],
  latitude: [-90, 90],
  longitude: [-180, 180],
};

/** Splits CSV text into records of fields, keeping the line number where each record starts. */
export function splitCsv(text: string): { line: number; cells: string[] }[] {
  const src = text.replace(/^﻿/, '');
  const out: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let start = 1;
  for (let i = 0; i < src.length; i++) {
    const c = src[i] as string;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else {
        if (c === '\n') line++;
        cell += c;
      }
      continue;
    }
    if (c === '"' && cell === '') quoted = true;
    else if (c === ',') {
      cells.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      cells.push(cell);
      out.push({ line: start, cells });
      cells = [];
      cell = '';
      line++;
      start = line;
    } else cell += c;
  }
  if (cell !== '' || cells.length) {
    cells.push(cell);
    out.push({ line: start, cells });
  }
  return out.filter((r) => r.cells.some((c) => c.trim() !== ''));
}

type Num = { value: number | null } | { reason: 'number' | 'decimal_comma' | 'range' };

function number(raw: string | undefined, column: CsvColumn): Num {
  const s = (raw ?? '').trim();
  if (s === '') return { value: null };
  if (/^-?\d+,\d+$/.test(s)) return { reason: 'decimal_comma' };
  if (!/^-?\d+(\.\d+)?$/.test(s)) return { reason: 'number' };
  const v = Number(s);
  const r = RANGES[column];
  if (r && (v < r[0] || v > r[1] || (column === 'area_ha' && v === 0))) return { reason: 'range' };
  return { value: v };
}

/** POLYGON((lon lat, lon lat, ...)) with one closed ring; holes are not accepted. */
export function parseWkt(raw: string): { polygon: Polygon } | { reason: 'wkt' | 'not_closed' } {
  const m = /^\s*POLYGON\s*\(\s*\(([^()]*)\)\s*\)\s*$/i.exec(raw);
  if (!m) return { reason: 'wkt' };
  const pts: Position[] = [];
  for (const pair of (m[1] as string).split(',')) {
    const nums = pair.trim().split(/\s+/);
    if (nums.length !== 2 || !nums.every((n) => /^-?\d+(\.\d+)?$/.test(n))) return { reason: 'wkt' };
    pts.push([Number(nums[0]), Number(nums[1])]);
  }
  if (pts.length < 3 || !pts.every(isPosition)) return { reason: 'wkt' };
  const a = pts[0] as Position;
  const b = pts[pts.length - 1] as Position;
  if (a[0] !== b[0] || a[1] !== b[1]) return { reason: 'not_closed' };
  if (pts.length < 4) return { reason: 'wkt' };
  const poly = polygonFrom(pts);
  return poly ? { polygon: poly } : { reason: 'wkt' };
}

/** Ray casting on the outer ring ([lon, lat]). */
export function pointInPolygon(lon: number, lat: number, poly: Polygon): boolean {
  const ring = poly.coordinates[0] ?? [];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function parseLotsCsv(text: string): CsvResult {
  const records = splitCsv(text);
  const result: CsvResult = { lots: [], rejected: [], error: null, unknownColumns: [] };
  const head = records[0];
  if (!head) return { ...result, error: 'empty' };
  const names = head.cells.map((c) => c.trim().toLowerCase());
  if (!names.includes('lot_name')) return { ...result, error: 'header' };
  result.unknownColumns = names.filter((n) => n !== '' && !(CSV_COLUMNS as readonly string[]).includes(n));
  const col = (cells: string[], c: CsvColumn) => {
    const i = names.indexOf(c);
    return i === -1 ? undefined : cells[i];
  };
  for (const { line, cells } of records.slice(1)) {
    const reject = (reason: CsvReason, column?: CsvColumn) => result.rejected.push({ line, reason, ...(column ? { column } : {}) });
    if (cells.length > names.length) {
      reject('columns');
      continue;
    }
    const name = (col(cells, 'lot_name') ?? '').trim();
    if (!name) {
      reject('name_missing', 'lot_name');
      continue;
    }
    if (name.length > 80) {
      reject('name_long', 'lot_name');
      continue;
    }
    const nums: Partial<Record<CsvColumn, number | null>> = {};
    let bad = false;
    for (const c of ['area_ha', 'plant_age_months', 'latitude', 'longitude'] as const) {
      const n = number(col(cells, c), c);
      if ('reason' in n) {
        reject(n.reason, c);
        bad = true;
        break;
      }
      nums[c] = n.value;
    }
    if (bad) continue;
    if ((nums.latitude === null) !== (nums.longitude === null)) {
      reject('latlon_pair', nums.latitude === null ? 'latitude' : 'longitude');
      continue;
    }
    let geometry: Polygon | null = null;
    const wkt = (col(cells, 'polygon_wkt') ?? '').trim();
    if (wkt) {
      const w = parseWkt(wkt);
      if ('reason' in w) {
        reject(w.reason, 'polygon_wkt');
        continue;
      }
      geometry = w.polygon;
      if (nums.latitude != null && nums.longitude != null && !pointInPolygon(nums.longitude, nums.latitude, geometry)) {
        reject('outside', 'latitude');
        continue;
      }
    }
    result.lots.push({ line, name, area_ha: nums.area_ha ?? null, plant_age_months: nums.plant_age_months ?? null, geometry });
  }
  return result;
}
