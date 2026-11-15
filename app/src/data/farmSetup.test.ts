// Data levels 0-2: pin, outline, lots (drawn, imported, typed); origins; ids that pass the database checks; storage
// on the device; sync that never sends telegram_code and keeps shapeless lots local.
import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  addLot,
  bboxesOverlap,
  bboxOf,
  CONFIDENCE_BY_LEVEL,
  makeFarmId,
  newFarm,
  parseLotsGeoJson,
  polygonFrom,
  removeLot,
  setOutline,
  slugify,
} from './farmSetup';
import { deleteLocalFarm, loadLocalFarm, saveLocalFarm, syncFarm } from './farmStore';
import { memoryKV } from './idb';

const NOW = '2026-11-15T10:00:00Z';
const prefs = { language: 'es', units: 'metric', mode: 'agronomist', storage_mode: 'full' } as const;
const pin = { type: 'Point' as const, coordinates: [-79.8, -3.35] };
const square = polygonFrom([
  [-79.8, -3.35],
  [-79.799, -3.35],
  [-79.799, -3.349],
  [-79.8, -3.349],
])!;

const farm = () => newFarm({ name: 'Finca Peña Alta', location: pin, locationOrigin: 'provided', prefs, ownerId: null, now: NOW, suffix: 'abc12345' });

describe('ids', () => {
  it('match the database patterns', () => {
    expect(slugify('Finca Peña Alta!')).toBe('finca-pena-alta');
    expect(slugify('***')).toBe('farm');
    const id = makeFarmId('Finca Peña Alta', 'abc12345');
    expect(id).toBe('farm_finca-pena-alta-abc12345');
    expect(id).toMatch(/^farm_[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(id).toMatch(/-[a-z0-9]{6,}$/);
  });
});

describe('data levels', () => {
  it('level 0 with a pin: provided location, nothing else invented', () => {
    const r = farm();
    expect(r.farm.data_level).toBe(0);
    expect(CONFIDENCE_BY_LEVEL[r.farm.data_level]).toBe('low');
    expect(r.farm.origin).toEqual({ '*': 'provided', location: 'provided' });
    expect(r.farm.variety).toBeNull();
    expect(r.farm.variety_origin).toBe('pending');
    expect(r.farm.is_demo).toBe(false);
    expect(r.farm).not.toHaveProperty('telegram_code');
  });

  it('level 1 with an outline, back to 0 without it', () => {
    const r = setOutline(farm(), square, NOW);
    expect(r.farm.data_level).toBe(1);
    expect(CONFIDENCE_BY_LEVEL[1]).toBe('medium_low');
    expect(setOutline(r, null, NOW).farm.data_level).toBe(0);
  });

  it('level 2 with lots; typed values are provided, missing ones pending; no area from the shape', () => {
    let r = addLot(farm(), { name: 'Lote bajo', geometry: square, area_ha: null, plant_age_months: null }, NOW);
    r = addLot(r, { name: 'Lote 2', geometry: null, area_ha: 5.5, plant_age_months: 30 }, NOW);
    expect(r.farm.data_level).toBe(2);
    expect(CONFIDENCE_BY_LEVEL[2]).toBe('medium');
    const [a, b] = r.lots;
    expect(a?.id).toBe('lot_finca-pena-alta-abc12345_1');
    expect(b?.id).toBe('lot_finca-pena-alta-abc12345_2');
    expect(a?.area_ha).toBeNull();
    expect(a?.area_ha_origin).toBe('pending');
    expect(b?.area_ha).toBe(5.5);
    expect(b?.area_ha_origin).toBe('provided');
    expect(b?.plant_age_months_origin).toBe('provided');
    expect(b?.drainage_class_origin).toBe('pending');
    // Removing lot 1 never reuses an id that may already be synced.
    const after = addLot(removeLot(r, a!.id, NOW), { name: 'x', geometry: null, area_ha: null, plant_age_months: null }, NOW);
    expect(after.lots.map((l) => l.id.split('_').pop())).toEqual(['2', '3']);
  });

  it('rejects impossible typed numbers instead of storing them', () => {
    const r = addLot(farm(), { name: 'x', geometry: null, area_ha: -2, plant_age_months: Number.NaN }, NOW);
    expect(r.lots[0]?.area_ha).toBeNull();
    expect(r.lots[0]?.plant_age_months).toBeNull();
  });

  it('marks every change as not yet synced', () => {
    const r = { ...farm(), synced_at: NOW };
    expect(setOutline(r, square, NOW).synced_at).toBeNull();
  });
});

describe('shapes and import', () => {
  it('closes rings and needs 3 distinct corners', () => {
    expect(square.coordinates[0]).toHaveLength(5);
    expect(square.coordinates[0]?.[0]).toEqual(square.coordinates[0]?.[4]);
    expect(polygonFrom([[0, 0], [1, 1], [0, 0]])).toBeNull();
    expect(polygonFrom([[0, 0], [1, 1], [500, 0]])).toBeNull();
  });

  it('imports polygons and multipolygons from GeoJSON, skipping the rest', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { name: 'A' }, geometry: { type: 'Polygon', coordinates: [square.coordinates[0]] } },
        { type: 'Feature', properties: { nombre: 'B' }, geometry: { type: 'MultiPolygon', coordinates: [[square.coordinates[0]], [square.coordinates[0]]] } },
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } },
        { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 0], [999, 0], [1, 1]]] } },
      ],
    };
    const r = parseLotsGeoJson(JSON.stringify(fc));
    expect(r.error).toBeNull();
    expect(r.lots.map((l) => l.name)).toEqual(['A', 'B (1)', 'B (2)']);
    expect(r.skipped).toEqual([
      { index: 3, reason: 'not_polygon' },
      { index: 4, reason: 'bad_coordinates' },
    ]);
    expect(parseLotsGeoJson('nope').error).toBe('not_json');
    expect(parseLotsGeoJson('{"type":"Point","coordinates":[0,0]}').error).toBe('not_geojson');
  });

  it('shows sourced zones only where they overlap the outline', () => {
    const b = bboxOf(square.coordinates);
    expect(bboxesOverlap(b, [-79.9, -3.4, -79.7, -3.3])).toBe(true);
    expect(bboxesOverlap(b, [10, 10, 11, 11])).toBe(false);
    expect(bboxesOverlap(null, b)).toBe(false);
  });
});

describe('device storage and sync', () => {
  it('saves, reloads and deletes the farm on the device', async () => {
    const kv = memoryKV();
    expect(await loadLocalFarm(kv)).toBeNull();
    await saveLocalFarm(farm(), kv);
    expect((await loadLocalFarm(kv))?.farm.name).toBe('Finca Peña Alta');
    await deleteLocalFarm(kv);
    expect(await loadLocalFarm(kv)).toBeNull();
  });

  it('stays local without an identity', async () => {
    expect(await syncFarm(farm(), null, null)).toEqual({ status: 'local', reason: 'no-identity' });
  });

  it('upserts the farm with its owner, never telegram_code, and only lots with a shape', async () => {
    const calls: { table: string; op: string; payload?: unknown }[] = [];
    const builder = (table: string) => {
      const chain = {
        upsert: async (payload: unknown) => (calls.push({ table, op: 'upsert', payload }), { error: null }),
        delete: () => {
          calls.push({ table, op: 'delete' });
          const q = { eq: () => q, not: async () => ({ error: null }), then: (f: (v: { error: null }) => unknown) => f({ error: null }) };
          return q;
        },
      };
      return chain;
    };
    const sb = { from: builder } as unknown as SupabaseClient;
    let r = addLot(farm(), { name: 'drawn', geometry: square, area_ha: null, plant_age_months: null }, NOW);
    r = addLot(r, { name: 'typed', geometry: null, area_ha: 3, plant_age_months: null }, NOW);
    r = { ...r, farm: { ...r.farm, telegram_code: 'should-never-be-sent-0000' } };
    const out = await syncFarm(r, sb, 'user-1', () => NOW);
    expect(out).toEqual({ status: 'synced', at: NOW, skippedLots: 1 });
    const farmCall = calls.find((c) => c.table === 'farms' && c.op === 'upsert')?.payload as Record<string, unknown>;
    expect(farmCall.owner_id).toBe('user-1');
    expect(farmCall).not.toHaveProperty('telegram_code');
    const lotsCall = calls.find((c) => c.table === 'lots' && c.op === 'upsert')?.payload as { name: string }[];
    expect(lotsCall.map((l) => l.name)).toEqual(['drawn']);
  });

  it('reports a sync error instead of throwing', async () => {
    const sb = { from: () => ({ upsert: async () => ({ error: { message: 'denied' } }) }) } as unknown as SupabaseClient;
    expect(await syncFarm(farm(), sb, 'u')).toEqual({ status: 'error', message: 'denied' });
  });
});
