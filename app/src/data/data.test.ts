// Data layer: origin resolution, snapshot loading with offline fallback, replay assembly, display selectors.
import { describe, expect, it } from 'vitest';
import { fixtureFarm, fixtureHistory, fixtureManifest, fixtureReplay } from './fixtures/demo-fixture';
import { memoryKV } from './idb';
import { fromSpec, resolveOrigin } from './origin';
import { bannerUnit, countByLevel, highestLevel, highestW, sortByW, topFactor } from './select';
import { loadDemo } from './demo';
import { guards, loadJson, resolveProvenance, SnapshotError, sourceLabel, trimHistory } from './snapshots';
import type { ReplayUnit } from '../types/contracts';

const BASE = '/data/demo/';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** A fake server: path -> body; anything else answers like a dev server (index.html, 200). */
function server(files: Record<string, unknown>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const path = String(input).slice(BASE.length);
    if (path in files) return jsonResponse(files[path]);
    return new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } });
  }) as typeof fetch;
}

const offline: typeof fetch = (async () => {
  throw new TypeError('Failed to fetch');
}) as typeof fetch;

describe('origin resolution (CONTRACTS.md §8.1)', () => {
  it('prefers the sibling, then the map key, then "*", then a string origin, then the parent', () => {
    expect(resolveOrigin({ a: 1, a_origin: 'provided', origin: 'synthetic' }, 'a')).toBe('provided');
    expect(resolveOrigin({ a: 1, origin: { a: 'sourced', '*': 'estimated' } }, 'a')).toBe('sourced');
    expect(resolveOrigin({ b: 1, origin: { a: 'sourced', '*': 'estimated' } }, 'b')).toBe('estimated');
    expect(resolveOrigin({ b: 1, origin: 'synthetic' }, 'b')).toBe('synthetic');
    expect(resolveOrigin({ b: 1 }, 'b', 'calibrated')).toBe('calibrated');
    expect(resolveOrigin({ b: 1 }, 'b')).toBeNull();
  });

  it('reads per-index origins from an array sibling and rejects unknown words', () => {
    expect(resolveOrigin({ s: [1, 2], s_origin: ['sourced', 'estimated'] }, 's', null, 1)).toBe('estimated');
    expect(fromSpec('made-up' as never, 'x')).toBeNull();
  });
});

describe('loadJson', () => {
  it('returns network data and caches it', async () => {
    const kv = memoryKV();
    const r = await loadJson('manifest.json', guards.manifest, { fetchImpl: server({ 'manifest.json': fixtureManifest }), kv, base: BASE });
    expect(r.source).toBe('network');
    expect(await kv.keys('snapshots')).toEqual(['manifest.json']);
  });

  it('falls back to the cached copy offline and says when it was cached', async () => {
    const kv = memoryKV();
    const now = () => new Date('2026-02-22T15:00:00Z');
    await loadJson('manifest.json', guards.manifest, { fetchImpl: server({ 'manifest.json': fixtureManifest }), kv, base: BASE, now });
    const r = await loadJson('manifest.json', guards.manifest, { fetchImpl: offline, kv, base: BASE });
    expect(r.source).toBe('cache');
    expect(r.cachedAt).toBe('2026-02-22T15:00:00.000Z');
  });

  it('treats an HTML answer as a missing file and an offline miss as offline', async () => {
    const kv = memoryKV();
    await expect(loadJson('manifest.json', guards.manifest, { fetchImpl: server({}), kv, base: BASE })).rejects.toMatchObject({ kind: 'missing' });
    await expect(loadJson('manifest.json', guards.manifest, { fetchImpl: offline, kv, base: BASE })).rejects.toMatchObject({ kind: 'offline' });
  });

  it('rejects a file with the wrong shape', async () => {
    const kv = memoryKV();
    const p = loadJson('manifest.json', guards.manifest, { fetchImpl: server({ 'manifest.json': { hello: 1 } }), kv, base: BASE });
    await expect(p).rejects.toBeInstanceOf(SnapshotError);
    await expect(p).rejects.toMatchObject({ kind: 'invalid' });
  });

  it('keeps only 7 days of history in the cache in Data saver mode', async () => {
    const kv = memoryKV();
    const h = fixtureHistory.lot_fixture_1!;
    const long = trimHistory({ ...h }, 3);
    expect(long.dates).toHaveLength(3);
    expect(long.series.rain_local_mm).toEqual(h.series.rain_local_mm.slice(-3));
    expect(long.series.percentiles.upstream).toHaveLength(3);
    await loadJson('history/x.json', guards.history, { fetchImpl: server({ 'history/x.json': h }), kv, base: BASE, storageMode: 'saver' });
    const cached = await kv.get<{ data: typeof h }>('snapshots', 'history/x.json');
    expect(cached?.data.dates).toHaveLength(7);
  });
});

describe('loadDemo', () => {
  it('loads every day of the window and keeps missing days as null', async () => {
    const files: Record<string, unknown> = { 'manifest.json': fixtureManifest, 'farm.json': fixtureFarm };
    for (const [d, f] of Object.entries(fixtureReplay)) files[`replay/${d}.json`] = f;
    const demo = await loadDemo({ fetchImpl: server(files), kv: memoryKV(), base: BASE });
    expect(demo.days).toHaveLength(19);
    expect(demo.days[0]).toBe('2026-02-15');
    expect(demo.days.at(-1)).toBe('2026-03-05');
    expect(demo.replay['2026-02-22']?.units).toHaveLength(2);
    expect(demo.replay['2026-02-15']).toBeNull();
    expect(demo.farm?.lots).toHaveLength(2);
    expect(demo.source).toBe('network');
  });

  it('fails when the manifest is missing (no invented replay)', async () => {
    await expect(loadDemo({ fetchImpl: server({}), kv: memoryKV(), base: BASE })).rejects.toMatchObject({ kind: 'missing' });
  });
});

describe('provenance', () => {
  it('resolves manifest references and labels non-dataset records with their note', () => {
    const recs = resolveProvenance({ ref: 'manifest.json', ids: ['prov-app-test-fixture'] }, fixtureManifest);
    expect(recs).toHaveLength(1);
    expect(sourceLabel(recs)).toMatch(/^App test fixture/);
    expect(sourceLabel([{ ...recs[0]!, dataset: 'GPM_3IMERGDE', provider: 'NASA GES DISC' }])).toBe('NASA GES DISC GPM_3IMERGDE');
  });
});

describe('selectors (display only)', () => {
  const day = fixtureReplay['2026-02-22']!;
  const u = (id: string, level: ReplayUnit['alert']['level'], w: number | null): ReplayUnit => ({
    ...day.units[0]!,
    unit_id: id,
    alert: { ...day.units[0]!.alert, unit_id: id, level, w },
  });

  it('finds the highest level of a day; missing day is null', () => {
    expect(highestLevel(day)).toBe('severe');
    expect(highestLevel(null)).toBeNull();
    expect(highestLevel({ ...day, units: [u('a', 'stale', null)] })).toBe('stale');
  });

  it('sorts by W, highest first, units without W last', () => {
    const sorted = sortByW([u('a', 'normal', null), u('b', 'watch', 0.4), u('c', 'severe', 0.9)]);
    expect(sorted.map((x) => x.unit_id)).toEqual(['c', 'b', 'a']);
  });

  it('shows the banner only for Warning or Severe', () => {
    expect(bannerUnit([u('a', 'watch', 0.5)])).toBeNull();
    expect(bannerUnit([u('a', 'warning', 0.7), u('b', 'severe', 0.82)])?.unit_id).toBe('b');
  });

  it('counts per level, picks top factor and highest W', () => {
    expect(countByLevel([u('a', 'watch', 0.4), u('b', 'watch', 0.41)]).watch).toBe(2);
    expect(topFactor([{ name: 'local', share: 0.2 }, { name: 'upstream', share: 0.5 }])?.name).toBe('upstream');
    expect(topFactor([])).toBeNull();
    expect(highestW([u('a', 'normal', null)])).toBeNull();
  });
});
