// Demo data, replay clock, identity and connectivity in one React context. No state library.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { initialIndex, loadDemo, loadDevFixture, SnapshotError, type DemoData } from '../data/demo';
import { initIdentity, type Identity } from '../data/identity';
import type { Lot, ReplayDay, ReplayUnit } from '../types/contracts';
import { usePrefs } from './prefs';

export type LoadStatus = 'loading' | 'ready' | 'missing' | 'error';

/** Milliseconds per replay day while playing. */
export const PLAY_STEP_MS = 1200;

interface DataValue {
  status: LoadStatus;
  demo: DemoData | null;
  /** Current replay day (YYYY-MM-DD) and its file (null when missing). */
  date: string | null;
  day: ReplayDay | null;
  index: number;
  setIndex: (i: number) => void;
  playing: boolean;
  togglePlay: () => void;
  online: boolean;
  identity: Identity;
  lotById: (id: string) => Lot | null;
  unitById: (id: string) => ReplayUnit | null;
  /** Display name of a unit: lot name, zone tercile, else the unit id. */
  unitName: (id: string) => string;
  /** The day's units that are lots of the farm (all units when the farm has no lots). */
  lotUnits: ReplayUnit[];
  retry: () => void;
}

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ initialDate, children }: { initialDate: string | null; children: ReactNode }) {
  const { prefs, t } = usePrefs();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [demo, setDemo] = useState<DemoData | null>(null);
  const [index, setIndexRaw] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [identity, setIdentity] = useState<Identity>({ status: 'pending', userId: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    loadDemo({ storageMode: prefs.storage_mode })
      .then((d) => {
        if (!alive) return;
        setDemo(d);
        setIndexRaw(initialIndex(d.days, initialDate));
        setStatus('ready');
      })
      .catch(async (e: unknown) => {
        const fixture = await loadDevFixture();
        if (!alive) return;
        if (fixture) {
          setDemo(fixture);
          setIndexRaw(initialIndex(fixture.days, initialDate));
          setStatus('ready');
          return;
        }
        setStatus(e instanceof SnapshotError && e.kind !== 'invalid' ? 'missing' : 'error');
      });
    return () => {
      alive = false;
    };
    // Storage mode only affects what is cached on the next load; initialDate is read once.
  }, [attempt]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Identity after first paint, so supabase-js never delays the shell.
  useEffect(() => {
    let alive = true;
    const run = () => void initIdentity().then((id) => alive && setIdentity(id));
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(run);
    else setTimeout(run, 500);
    return () => {
      alive = false;
    };
  }, [online]);

  const days = demo?.days ?? [];
  const setIndex = useCallback((i: number) => setIndexRaw(Math.max(0, Math.min(i, Math.max(days.length - 1, 0)))), [days.length]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setIndexRaw((i) => {
        if (i >= days.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, PLAY_STEP_MS);
    return () => clearInterval(id);
  }, [playing, days.length]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && index >= days.length - 1) setIndexRaw(0);
      return !p;
    });
  }, [index, days.length]);

  const date = days[index] ?? null;
  const day = date && demo ? (demo.replay[date] ?? null) : null;

  const value = useMemo<DataValue>(() => {
    const lots = new Map((demo?.farm?.lots ?? []).map((l) => [l.id, l]));
    const units = new Map((day?.units ?? []).map((u) => [u.unit_id, u]));
    return {
      status,
      demo,
      date,
      day,
      index,
      setIndex,
      playing,
      togglePlay,
      online,
      identity,
      lotById: (id) => lots.get(id) ?? null,
      unitById: (id) => units.get(id) ?? null,
      unitName: (id) => {
        const lot = lots.get(id);
        if (lot) return lot.name;
        const zone = /^zone_.+_(low|mid|high)$/.exec(id);
        return zone ? t(`zone.${zone[1] as 'low' | 'mid' | 'high'}`) : id;
      },
      lotUnits: lots.size ? (day?.units ?? []).filter((u) => lots.has(u.unit_id)) : (day?.units ?? []),
      retry: () => setAttempt((a) => a + 1),
    };
  }, [status, demo, date, day, index, setIndex, playing, togglePlay, online, identity, t]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const v = useContext(DataContext);
  if (!v) throw new Error('useData outside DataProvider');
  return v;
}
