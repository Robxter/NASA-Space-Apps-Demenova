// The reliability sheet never hard-codes a number: counts come from verification.json, passages from its notes,
// and the dictionary text for the sheet holds no digits at all.
import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import type { AppManifest, VerificationFile } from '../types/contracts';
import { noteSection, reliabilityFrom } from './reliability';
import demoManifest from '../../public/data/demo/manifest.json';
import demoVerification from '../../public/data/demo/verification.json';

const base: VerificationFile = {
  generated_at: '2026-11-15T04:07:26Z',
  provenance: {
    id: 'prov-x',
    dataset: null,
    version: null,
    provider: null,
    url: null,
    accessed: null,
    spatial_resolution: null,
    temporal_resolution: null,
    aoi: null,
    time_range: ['2026-01-01', '2026-11-13'],
    processing: [],
    code_commit: null,
    agent: 'test',
    notes: 'test',
  },
  events: [],
  hits: 7,
  misses: 3,
  false_alarms: 11,
  pod: 0.7,
  far: 0.61,
  csi: 0.33,
  origin: { '*': 'estimated', events: 'observed' },
  notes: 'COUNTS ONLY, NOT SKILL: x. LEAD TIME: the lead text. KNOWN LIMITS: the limit text. SENSITIVITY (T-024b): the sensitivity text.',
};

describe('reliability sheet (no hard-coded numbers)', () => {
  it('takes the counts, their origin and the period from the file', () => {
    const r = reliabilityFrom(base, null);
    expect([r.hits.value, r.misses.value, r.falseAlarms.value]).toEqual([7, 3, 11]);
    expect(r.hits.origin).toBe('estimated');
    expect(r.period).toEqual(['2026-01-01', '2026-11-13']);
    const changed = reliabilityFrom({ ...base, hits: 0, false_alarms: 2 }, null);
    expect([changed.hits.value, changed.falseAlarms.value]).toEqual([0, 2]);
  });

  it('never exposes POD, FAR or CSI', () => {
    const r = reliabilityFrom(base, null) as unknown as Record<string, unknown>;
    for (const k of ['pod', 'far', 'csi']) expect(r).not.toHaveProperty(k);
  });

  it('splits the notes into their sections', () => {
    const r = reliabilityFrom(base, null);
    expect(r.leadTime).toBe('the lead text.');
    expect(r.knownLimits).toBe('the limit text.');
    expect(r.sensitivity).toBe('the sensitivity text.');
    expect(noteSection(null, 'leadTime')).toBeNull();
    expect(noteSection('nothing here', 'knownLimits')).toBeNull();
  });

  it('prefers a structured sensitivity summary when the contract provides one', () => {
    const r = reliabilityFrom({ ...base, sensitivity: { summary: 'structured' } } as VerificationFile, null);
    expect(r.sensitivity).toBe('structured');
  });

  it('has no digits in any of its dictionary text, in either language', () => {
    for (const dict of [en, es] as Record<string, string>[]) {
      for (const [k, v] of Object.entries(dict)) {
        if (k.startsWith('reliability.') || k.startsWith('outcome.')) expect(v, k).not.toMatch(/\d/);
      }
    }
  });

  it('reads the committed demo file: the farm-catchment counts and all three passages', () => {
    const v = demoVerification as unknown as VerificationFile;
    const m = demoManifest as unknown as AppManifest;
    const r = reliabilityFrom(v, m);
    expect([r.hits.value, r.misses.value, r.falseAlarms.value]).toEqual([v.hits, v.misses, v.false_alarms]);
    expect(r.period).not.toBeNull();
    expect(r.sensitivity).toMatch(/weight/i);
    expect(r.leadTime).toMatch(/Severe/);
    expect(r.knownLimits).toMatch(/percentile/i);
    expect(r.leadTime).not.toMatch(/KNOWN LIMITS|SENSITIVITY/);
  });
});
