// Records by default (SPEC "Data modes"): every replay day the app loads is kept on the device (IndexedDB) and can be
// exported as CSV. Values are written as stored (SI units in the column names), each with its origin; missing stays empty.
import type { DailyFeature, ReplayDay } from '../types/contracts';
import { fromSpec, resolveOrigin } from './origin';

const FEATURES: (keyof DailyFeature)[] = [
  'rain_local_mm',
  'rain_upstream_24h_mm',
  'rain_upstream_72h_mm',
  'soil_moisture',
  'api_index',
  'et0_mm',
  'balance_mm',
  'balance_7d_mm',
  'temp_mean_c',
  'rh_mean',
  'ndvi',
];

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function recordsCsv(
  days: readonly string[],
  replay: Readonly<Record<string, ReplayDay | null>>,
  unitName: (id: string) => string,
  keep: (unitId: string) => boolean = () => true,
): string {
  const header = ['date', 'unit_id', 'unit_name', 'level', 'w', 'w_origin', 'alert_updated_at_utc'];
  for (const f of FEATURES) header.push(f, `${f}_origin`);
  const rows = [header.join(',')];
  for (const d of days) {
    for (const u of replay[d]?.units ?? []) {
      if (!keep(u.unit_id)) continue;
      const row: unknown[] = [d, u.unit_id, unitName(u.unit_id), u.alert.level, u.alert.w, u.alert.w === null ? null : fromSpec(u.alert.origin, 'w'), u.alert.updated_at];
      for (const f of FEATURES) {
        const v = u.features ? u.features[f] : null;
        row.push(v, v === null || v === undefined ? null : resolveOrigin(u.features, f));
      }
      rows.push(row.map(csvCell).join(','));
    }
  }
  return `${rows.join('\n')}\n`;
}

/** Number of replay days whose file is on hand (saved on the device after the first load). */
export function savedDays(replay: Readonly<Record<string, ReplayDay | null>>): number {
  return Object.values(replay).filter(Boolean).length;
}
