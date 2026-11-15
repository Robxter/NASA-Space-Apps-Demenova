// The device's own farm: saved to IndexedDB on every change (records by default, ADR-004), then synced to Supabase
// when the device has an identity (ADR-003). If sync is unavailable the farm stays on the device and the UI says so.
import type { SupabaseClient } from '@supabase/supabase-js';
import { getKV, type KV } from './idb';
import type { LocalFarmRecord } from './farmSetup';

const KEY = 'current';

export async function loadLocalFarm(kv: KV = getKV()): Promise<LocalFarmRecord | null> {
  return (await kv.get<LocalFarmRecord>('farms', KEY).catch(() => undefined)) ?? null;
}

export async function saveLocalFarm(rec: LocalFarmRecord, kv: KV = getKV()): Promise<void> {
  await kv.put('farms', KEY, rec);
}

export async function deleteLocalFarm(kv: KV = getKV()): Promise<void> {
  await kv.del('farms', KEY);
}

export type SyncOutcome =
  | { status: 'synced'; at: string; skippedLots: number }
  | { status: 'local'; reason: 'no-identity' }
  | { status: 'error'; message: string };

/**
 * Upserts the farm and every lot that has a shape. `telegram_code` is never sent (server-generated, D-020);
 * the owner is the anonymous user. Typed lots without a shape stay on the device until one is drawn or imported.
 */
export async function syncFarm(
  rec: LocalFarmRecord,
  sb: SupabaseClient | null,
  userId: string | null,
  now: () => string = () => new Date().toISOString(),
): Promise<SyncOutcome> {
  if (!sb || !userId) return { status: 'local', reason: 'no-identity' };
  const { telegram_code: _omit, ...farm } = rec.farm;
  void _omit;
  const farmRow = { ...farm, owner_id: userId };
  const lots = rec.lots.filter((l) => l.geometry !== null);
  try {
    const f = await sb.from('farms').upsert(farmRow);
    if (f.error) return { status: 'error', message: f.error.message };
    if (lots.length) {
      const l = await sb.from('lots').upsert(lots);
      if (l.error) return { status: 'error', message: l.error.message };
    }
    const ids = rec.lots.map((x) => x.id);
    // Lots deleted on the device are deleted on the server too.
    const del = sb.from('lots').delete().eq('farm_id', rec.farm.id);
    const d = ids.length ? await del.not('id', 'in', `(${ids.map((i) => `"${i}"`).join(',')})`) : await del;
    if (d.error) return { status: 'error', message: d.error.message };
    return { status: 'synced', at: now(), skippedLots: rec.lots.length - lots.length };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

/** Deletes the device's farm on the server (cascade removes its lots). Errors are returned, not thrown. */
export async function deleteRemoteFarm(farmId: string, sb: SupabaseClient | null): Promise<string | null> {
  if (!sb) return null;
  try {
    const r = await sb.from('farms').delete().eq('id', farmId);
    return r.error ? r.error.message : null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
