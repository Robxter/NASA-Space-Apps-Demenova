import { describe, expect, it } from 'vitest';
import { cToF, cmToIn, convert, displayQuantity, haToAcres, mmToIn, mToFt, toSI } from './units';

describe('conversions (exact definitions)', () => {
  it('converts SI to imperial', () => {
    expect(mmToIn(25.4)).toBe(1);
    expect(cToF(0)).toBe(32);
    expect(cToF(100)).toBe(212);
    expect(cToF(-40)).toBe(-40);
    expect(mToFt(0.3048)).toBeCloseTo(1, 12);
    expect(cmToIn(2.54)).toBeCloseTo(1, 12);
    expect(haToAcres(1)).toBeCloseTo(2.4710538146716534, 12);
  });

  it('keeps metric values unchanged', () => {
    expect(convert('mm', 12.3, 'metric')).toEqual({ value: 12.3, unit: 'mm' });
    expect(convert('celsius', 26, 'metric')).toEqual({ value: 26, unit: '°C' });
    expect(convert('ha', 5.5, 'metric')).toEqual({ value: 5.5, unit: 'ha' });
  });

  it('labels imperial units', () => {
    expect(convert('mm', 25.4, 'imperial').unit).toBe('in');
    expect(convert('celsius', 0, 'imperial').unit).toBe('°F');
    expect(convert('m', 1, 'imperial').unit).toBe('ft');
    expect(convert('ha', 1, 'imperial').unit).toBe('ac');
  });

  it('shows fractions as percent and leaves indices unitless in both systems', () => {
    expect(convert('fraction', 0.42, 'imperial')).toEqual({ value: 42, unit: '%' });
    expect(convert('index', 0.85, 'imperial')).toEqual({ value: 0.85, unit: '' });
  });
});

describe('displayQuantity', () => {
  it('keeps missing values missing, never zero', () => {
    for (const v of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      const q = displayQuantity('mm', v, 'metric', 'en');
      expect(q.text).toBeNull();
      expect(q.unit).toBe('mm');
    }
    expect(displayQuantity('mm', null, 'imperial', 'en').unit).toBe('in');
  });

  it('formats a real zero as zero', () => {
    expect(displayQuantity('mm', 0, 'metric', 'en').text).toBe('0.0');
  });

  it('formats per language and system', () => {
    expect(displayQuantity('mm', 60, 'imperial', 'en')).toEqual({ text: '2.36', unit: 'in' });
    expect(displayQuantity('celsius', 25.5, 'metric', 'es').text).toBe('25,5');
    expect(displayQuantity('index', 0.85, 'metric', 'en').text).toBe('0.85');
  });
});

describe('toSI (typed input back to storage units)', () => {
  it('inverts every conversion', () => {
    for (const kind of ['mm', 'celsius', 'm', 'cm', 'ha', 'fraction'] as const) {
      for (const system of ['metric', 'imperial'] as const) {
        expect(toSI(kind, convert(kind, 12.5, system).value, system)).toBeCloseTo(12.5, 10);
      }
    }
    expect(toSI('ha', 1, 'imperial')).toBeCloseTo(0.40468564224, 12);
  });
});
