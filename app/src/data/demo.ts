// The demo snapshot set (CONTRACTS.md §4): manifest, farm and every replay day of the window, fetched on first load
// so replay works offline afterwards (ADR-004). A missing day stays missing (null); nothing is interpolated.
import type { AppManifest, FarmFile, HistoryFile, ReplayDay } from '../types/contracts';
import { daysInRange } from '../time';
import {
  loadFarm,
  loadHistory,
  loadManifest,
  loadReplayDay,
  SnapshotError,
  type LoadSource,
  type LoaderDeps,
} from './snapshots';

/** Used only when the manifest does not state a window (SPEC: committed 15 Feb to 5 Mar 2026 snapshots). */
export const DEFAULT_REPLAY_WINDOW = { start: '2026-02-15', end: '2026-03-05' } as const;

export interface DemoData {
  manifest: AppManifest;
  farm: FarmFile | null;
  days: string[];
  /** One entry per day of `days`; null when the day's file is missing. */
  replay: Record<string, ReplayDay | null>;
  /** Worst source among the files: cache if any came from the device, fixture in dev without snapshots. */
  source: LoadSource;
  /** Oldest cache timestamp among the files read from the device. */
  cachedAt: string | null;
}

export async function loadDemo(deps: LoaderDeps = {}): Promise<DemoData> {
  const m = await loadManifest(deps);
  const window = m.data.replay_window ?? DEFAULT_REPLAY_WINDOW;
  const days = daysInRange(window.start, window.end);
  const [farm, ...dayResults] = await Promise.allSettled([loadFarm(deps), ...days.map((d) => loadReplayDay(d, deps))]);
  const replay: Record<string, ReplayDay | null> = {};
  const cached: string[] = m.cachedAt ? [m.cachedAt] : [];
  days.forEach((d, i) => {
    const r = dayResults[i];
    replay[d] = r && r.status === 'fulfilled' ? r.value.data : null;
    if (r && r.status === 'fulfilled' && r.value.cachedAt) cached.push(r.value.cachedAt);
  });
  if (farm.status === 'fulfilled' && farm.value.cachedAt) cached.push(farm.value.cachedAt);
  cached.sort();
  return {
    manifest: m.data,
    farm: farm.status === 'fulfilled' ? farm.value.data : null,
    days,
    replay,
    source: cached.length ? 'cache' : 'network',
    cachedAt: cached[0] ?? null,
  };
}

/** Dev-only fallback. Statically removed from production builds (import.meta.env.DEV is false there). */
export async function loadDevFixture(): Promise<DemoData | null> {
  if (!import.meta.env.DEV) return null;
  const f = await import('./fixtures/demo-fixture');
  const w = f.fixtureManifest.replay_window;
  const days = daysInRange(w.start, w.end);
  return {
    manifest: f.fixtureManifest,
    farm: f.fixtureFarm,
    days,
    replay: Object.fromEntries(days.map((d) => [d, f.fixtureReplay[d] ?? null])),
    source: 'fixture',
    cachedAt: null,
  };
}

export async function loadDevFixtureHistory(unitId: string): Promise<HistoryFile | null> {
  if (!import.meta.env.DEV) return null;
  const f = await import('./fixtures/demo-fixture');
  return f.fixtureHistory[unitId] ?? null;
}

export { loadHistory, SnapshotError };
