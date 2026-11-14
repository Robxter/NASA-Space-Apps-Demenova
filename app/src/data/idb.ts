// Hand-rolled IndexedDB wrapper (ADR-004, no library). Falls back to memory when IndexedDB is unavailable
// (private mode on some browsers, tests), so the app keeps working and only loses persistence.
export const DB_NAME = 'demenova';
export const DB_VERSION = 1;
/** snapshots: cached JSON by path. farms: device-created farms (T-04x). meta: identity and sync flags. */
export const STORES = ['snapshots', 'farms', 'meta'] as const;
export type StoreName = (typeof STORES)[number];

export interface KV {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  put<T>(store: StoreName, key: string, value: T): Promise<void>;
  del(store: StoreName, key: string): Promise<void>;
  keys(store: StoreName): Promise<string[]>;
}

export function memoryKV(): KV {
  const data = new Map<string, Map<string, unknown>>(STORES.map((s) => [s, new Map()]));
  const s = (name: StoreName) => data.get(name) as Map<string, unknown>;
  return {
    get: async <T>(store: StoreName, key: string) => s(store).get(key) as T | undefined,
    put: async (store, key, value) => void s(store).set(key, value),
    del: async (store, key) => void s(store).delete(key),
    keys: async (store) => [...s(store).keys()],
  };
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** Some WebKit versions never settle indexedDB.open; after this long the app continues without persistence. */
export const OPEN_TIMEOUT_MS = 2000;

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('IndexedDB open timed out')), OPEN_TIMEOUT_MS);
    const r = factory.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      for (const name of STORES) if (!r.result.objectStoreNames.contains(name)) r.result.createObjectStore(name);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another tab'));
  });
}

export function idbKV(factory: IDBFactory): KV {
  let dbp: Promise<IDBDatabase> | null = null;
  const db = () => (dbp ??= openDb(factory));
  const tx = async (store: StoreName, mode: IDBTransactionMode) => (await db()).transaction(store, mode).objectStore(store);
  return {
    get: async <T>(store: StoreName, key: string) => (await req((await tx(store, 'readonly')).get(key))) as T | undefined,
    put: async (store, key, value) => void (await req((await tx(store, 'readwrite')).put(value, key))),
    del: async (store, key) => void (await req((await tx(store, 'readwrite')).delete(key))),
    keys: async (store) => ((await req((await tx(store, 'readonly')).getAllKeys())) as IDBValidKey[]).map(String),
  };
}

let shared: KV | null = null;

/** The app-wide store: IndexedDB when it opens, memory otherwise. */
export function getKV(): KV {
  if (shared) return shared;
  const factory = typeof indexedDB === 'undefined' ? null : indexedDB;
  if (!factory) return (shared = memoryKV());
  const real = idbKV(factory);
  const mem = memoryKV();
  let broken = false;
  const guard =
    <A extends unknown[], R>(f: (...a: A) => Promise<R>, g: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      if (broken) return g(...a);
      try {
        return await f(...a);
      } catch {
        broken = true;
        return g(...a);
      }
    };
  const store: KV = {
    get: guard(real.get, mem.get) as KV['get'],
    put: guard(real.put, mem.put),
    del: guard(real.del, mem.del),
    keys: guard(real.keys, mem.keys),
  };
  shared = store;
  return store;
}

export function setKVForTests(kv: KV | null): void {
  shared = kv;
}
