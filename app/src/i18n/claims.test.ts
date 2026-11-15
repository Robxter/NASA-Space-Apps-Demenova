// CL-32 (DESIGN.md rule): the app never claims it predicted, forecast or anticipated the Feb 2026 flood (D-029: the
// demo lots were already Severe from earlier storms; verification is counts only). No dictionary value may say so.
import { describe, expect, it } from 'vitest';
import { en } from './en';
import { es } from './es';

const CLAIM = /predic|predij|forecast|pron[oó]stic|anticip/i;

describe('no prediction claims in the dictionaries', () => {
  for (const [lang, dict] of [
    ['en', en],
    ['es', es],
  ] as const) {
    it(`${lang}: no value claims the app predicted, forecast or anticipated a flood`, () => {
      const hits = Object.entries(dict as Record<string, string>).filter(([, v]) => CLAIM.test(v));
      expect(hits).toEqual([]);
    });
  }

  it('the check itself catches the words it is meant to catch', () => {
    for (const s of ['Demenova predicted the flood', 'predijo la inundación', 'a forecast', 'pronóstico', 'anticipó la crecida'])
      expect(CLAIM.test(s)).toBe(true);
  });
});
