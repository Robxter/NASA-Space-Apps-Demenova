// break-ui fixture: synthetic everywhere, shaped like the demo data, and only chosen by an explicit ?data= value.
import { describe, expect, it } from 'vitest';
import { worstCase, worstKindFromUrl } from './worst-case';
import { guards } from '../data/snapshots';

describe('worst-case fixture (dev only)', () => {
  it('is chosen only by an explicit, known ?data= value', () => {
    expect(worstKindFromUrl('')).toBeNull();
    expect(worstKindFromUrl('?data=prod')).toBeNull();
    expect(worstKindFromUrl('?data=worst')).toBe('worst');
    expect(worstKindFromUrl('?x=1&data=offline')).toBe('offline');
  });

  it('covers 0, 1 and 40 lots, a missing day, stale units, W at both bounds, and offline', () => {
    expect(worstCase('empty').farm?.lots).toHaveLength(0);
    expect(worstCase('one').farm?.lots).toHaveLength(1);
    const w = worstCase('worst');
    expect(w.farm?.lots).toHaveLength(40);
    expect(Object.values(w.replay).filter((d) => d === null)).toHaveLength(1);
    const units = Object.values(w.replay).find(Boolean)!.units;
    expect(units.some((u) => u.alert.level === 'stale' && u.alert.w === null)).toBe(true);
    expect(units.map((u) => u.alert.w)).toEqual(expect.arrayContaining([0, 1]));
    expect(worstCase('offline').source).toBe('cache');
  });

  it('is synthetic and passes the same shape guards as the snapshots', () => {
    const w = worstCase('worst');
    expect(guards.manifest(w.manifest)).toBe(true);
    expect(guards.farm(w.farm)).toBe(true);
    expect(w.farm?.farm.is_demo).toBe(true);
    for (const day of Object.values(w.replay)) {
      if (!day) continue;
      expect(guards.replayDay(day)).toBe(true);
      for (const u of day.units) expect(u.alert.origin).toBe('synthetic');
    }
    for (const l of w.farm!.lots) expect(l.origin).toBe('synthetic');
  });
});
