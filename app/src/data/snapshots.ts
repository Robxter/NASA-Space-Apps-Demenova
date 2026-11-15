// Snapshot access (ADR-004): network first, then the IndexedDB copy when offline. Each result says where it came
// from and when it was cached, so screens can say "offline, data from ...". Shapes are checked at this boundary.
import type {
  AppManifest,
  FarmFile,
  GlossaryTerm,
  StrategiesFile,
  VerificationFile,
  ZonesFile,
  HistoryFile,
  Provenance,
  ProvenanceBlock,
  ReplayDay,
  StorageMode,
} from '../types/contracts';
import { getKV, type KV } from './idb';

export type LoadSource = 'network' | 'cache' | 'fixture';

export interface Loaded<T> {
  data: T;
  source: LoadSource;
  /** When the copy was saved on the device (UTC); null when it came straight from the network. */
  cachedAt: string | null;
}

export type SnapshotErrorKind = 'missing' | 'offline' | 'invalid';

export class SnapshotError extends Error {
  constructor(
    public readonly kind: SnapshotErrorKind,
    public readonly path: string,
  ) {
    super(`snapshot ${path}: ${kind}`);
  }
}

interface CacheEntry {
  data: unknown;
  cached_at: string;
}

export interface LoaderDeps {
  fetchImpl?: typeof fetch;
  kv?: KV;
  base?: string;
  now?: () => Date;
  storageMode?: StorageMode;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const guards = {
  manifest: (v: unknown): v is AppManifest =>
    isObj(v) && typeof v.farm_id === 'string' && isObj(v.replay_window) && Array.isArray(v.provenance),
  farm: (v: unknown): v is FarmFile => isObj(v) && isObj(v.farm) && Array.isArray(v.lots),
  replayDay: (v: unknown): v is ReplayDay => isObj(v) && typeof v.date === 'string' && Array.isArray(v.units),
  history: (v: unknown): v is HistoryFile =>
    isObj(v) && typeof v.unit_id === 'string' && Array.isArray(v.dates) && isObj(v.series),
  zones: (v: unknown): v is ZonesFile => isObj(v) && v.type === 'FeatureCollection' && Array.isArray(v.features),
  strategies: (v: unknown): v is StrategiesFile => isObj(v) && Array.isArray(v.strategies),
  glossary: (v: unknown): v is GlossaryAppFile => isObj(v) && Array.isArray(v.terms),
  verification: (v: unknown): v is VerificationFile =>
    isObj(v) && typeof v.hits === 'number' && typeof v.misses === 'number' && typeof v.false_alarms === 'number',
};

/** glossary.json: domain/glossary.yaml copied for the app (app/scripts/build_domain_snapshots.py). */
export interface GlossaryAppFile {
  generated_at: string;
  provenance: ProvenanceBlock;
  terms: GlossaryTerm[];
}

export function snapshotBase(): string {
  const base = (import.meta.env?.BASE_URL as string | undefined) ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}data/demo/`;
}

/** Keeps the last `days` entries of every array aligned with `dates` (Data saver keeps 7 days, ADR-004). */
export function trimHistory(h: HistoryFile, days: number): HistoryFile {
  const n = h.dates.length;
  if (n <= days) return h;
  const from = n - days;
  const cut = (v: unknown): unknown => {
    if (Array.isArray(v) && v.length === n) return v.slice(from);
    if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cut(x)]));
    return v;
  };
  return { ...h, dates: h.dates.slice(from), series: cut(h.series) as HistoryFile['series'] };
}

export async function loadJson<T>(path: string, guard: (v: unknown) => v is T, deps: LoaderDeps = {}): Promise<Loaded<T>> {
  const kv = deps.kv ?? getKV();
  const doFetch = deps.fetchImpl ?? fetch;
  const base = deps.base ?? snapshotBase();
  const now = deps.now ?? (() => new Date());
  let failure: SnapshotErrorKind = 'offline';
  try {
    const res = await doFetch(`${base}${path}`, { cache: 'no-cache' });
    const type = res.headers.get('content-type') ?? '';
    // A dev server or SPA host answers unknown paths with index.html (200, text/html): a missing file, not data.
    // Some hosts serve .geojson as octet-stream, so the body decides when the type is not JSON or HTML.
    const text = res.ok && !type.includes('html') ? await res.text() : null;
    if (text !== null && (type.includes('json') || !text.trimStart().startsWith('<'))) {
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        throw new SnapshotError('invalid', path);
      }
      if (!guard(body)) throw new SnapshotError('invalid', path);
      const toStore =
        deps.storageMode === 'saver' && guards.history(body) ? trimHistory(body, 7) : body;
      await kv.put<CacheEntry>('snapshots', path, { data: toStore, cached_at: now().toISOString() }).catch(() => undefined);
      return { data: body, source: 'network', cachedAt: null };
    }
    failure = 'missing';
  } catch (e) {
    if (e instanceof SnapshotError) throw e;
    failure = 'offline';
  }
  const hit = await kv.get<CacheEntry>('snapshots', path).catch(() => undefined);
  if (hit && guard(hit.data)) return { data: hit.data, source: 'cache', cachedAt: hit.cached_at };
  throw new SnapshotError(failure, path);
}

export const loadManifest = (d?: LoaderDeps) => loadJson('manifest.json', guards.manifest, d);
export const loadFarm = (d?: LoaderDeps) => loadJson('farm.json', guards.farm, d);
export const loadReplayDay = (date: string, d?: LoaderDeps) => loadJson(`replay/${date}.json`, guards.replayDay, d);
export const loadZones = (d?: LoaderDeps) => loadJson('zones.geojson', guards.zones, d);
export const loadStrategies = (d?: LoaderDeps) => loadJson('strategies.json', guards.strategies, d);
export const loadGlossary = (d?: LoaderDeps) => loadJson('glossary.json', guards.glossary, d);
export const loadVerification = (d?: LoaderDeps) => loadJson('verification.json', guards.verification, d);
export const loadHistory = (unitId: string, d?: LoaderDeps) =>
  loadJson(`history/${encodeURIComponent(unitId)}.json`, guards.history, d);

/** Provenance records a block points to, resolving manifest references by id. */
export function resolveProvenance(block: ProvenanceBlock | null | undefined, manifest: AppManifest | null): Provenance[] {
  if (!block) return [];
  if (Array.isArray(block)) return block;
  if ('ref' in block) {
    const ids = new Set(block.ids);
    return (manifest?.provenance ?? []).filter((p) => ids.has(p.id));
  }
  return [block];
}

export function provenanceByIds(ids: readonly string[], manifest: AppManifest | null): Provenance[] {
  const set = new Set(ids);
  return (manifest?.provenance ?? []).filter((p) => set.has(p.id));
}

/** Short source line: dataset names; for non-dataset records, the record's own note, shortened. */
export function sourceLabel(records: Provenance[]): string | null {
  const names = [...new Set(records.map((p) => p.dataset).filter(Boolean))];
  if (names.length) return names.join(', ');
  const note = records.find((p) => p.notes)?.notes;
  return note ? (note.length > 100 ? `${note.slice(0, 99)}…` : note) : null;
}
