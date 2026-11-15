// D-038 motion limits that can be checked without a browser: the first-view stagger stays short and non-uniform.
import { describe, expect, it } from 'vitest';
import { staggerDelays } from './motion';

describe('staggerDelays (choreograph: overlap, non-uniform, under ~300 ms)', () => {
  it('starts at once and never waits longer than 175 ms, even for 40 items', () => {
    const d = staggerDelays(40);
    expect(d[0]).toBe(0);
    expect(Math.max(...d)).toBeLessThanOrEqual(175);
    // With the 220-260 ms durations used, the last item is fully in before ~440 ms and visible from its start.
  });

  it('uses shrinking gaps, not a metronome', () => {
    const d = staggerDelays(6);
    const gaps = d.slice(1).map((v, i) => v - (d[i] as number));
    expect(new Set(gaps).size).toBeGreaterThan(1);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1] as number);
  });

  it('items past the handful arrive with the last one', () => {
    const d = staggerDelays(10);
    expect(d.slice(6)).toEqual([175, 175, 175, 175]);
  });
});
