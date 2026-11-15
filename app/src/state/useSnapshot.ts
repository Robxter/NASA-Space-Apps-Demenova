// Loads one snapshot file for a screen: loading, ready (with source) or missing. Missing never becomes invented data.
import { useEffect, useState } from 'react';
import type { Loaded } from '../data/snapshots';

export type SnapshotState<T> = { status: 'loading' } | { status: 'ready'; value: Loaded<T> } | { status: 'missing' };

export function useSnapshot<T>(load: () => Promise<Loaded<T>>, key = ''): SnapshotState<T> {
  const [state, setState] = useState<SnapshotState<T>>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    load()
      .then((value) => alive && setState({ status: 'ready', value }))
      .catch(() => alive && setState({ status: 'missing' }));
    return () => {
      alive = false;
    };
    // `load` is a module-level loader; `key` says when to reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}
