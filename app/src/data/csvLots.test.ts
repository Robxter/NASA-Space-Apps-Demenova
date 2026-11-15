import { describe, expect, it } from 'vitest';
import { CSV_COLUMNS, parseLotsCsv, parseWkt, pointInPolygon, splitCsv } from './csvLots';
import template from '../../public/templates/demenova-lots-template.csv?raw';

const HEAD = CSV_COLUMNS.join(',');
const SQ = 'POLYGON((-79.80 -3.35, -79.79 -3.35, -79.79 -3.34, -79.80 -3.34, -79.80 -3.35))';

describe('template', () => {
  it('is the header row only (no example values: Rule zero)', () => {
    const lines = template.replace(/^﻿/, '').trim().split(/\r?\n/);
    expect(lines).toEqual([HEAD]);
  });
});

describe('splitCsv', () => {
  it('handles quoted commas, doubled quotes, line breaks in quotes, CRLF and a BOM', () => {
    const r = splitCsv('﻿a,b\r\n"x, y","he said ""hi"""\r\n"two\nlines",z\n');
    expect(r.map((x) => x.cells)).toEqual([
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
      ['two\nlines', 'z'],
    ]);
    expect(r.map((x) => x.line)).toEqual([1, 2, 3]);
  });
});

describe('parseLotsCsv', () => {
  it('reads good rows: typed lots and drawn-shape lots, values as given', () => {
    const csv = [HEAD, 'Lote 1,5.5,30,,,', `"Lote 2, bajo",,,-3.345,-79.795,"${SQ}"`, 'Lote 3,,,,,'].join('\n');
    const r = parseLotsCsv(csv);
    expect(r.error).toBeNull();
    expect(r.rejected).toEqual([]);
    expect(r.lots).toHaveLength(3);
    expect(r.lots[0]).toMatchObject({ line: 2, name: 'Lote 1', area_ha: 5.5, plant_age_months: 30, geometry: null });
    expect(r.lots[1]?.name).toBe('Lote 2, bajo');
    expect(r.lots[1]?.geometry?.coordinates[0]).toHaveLength(5);
    expect(r.lots[2]).toMatchObject({ area_ha: null, plant_age_months: null });
  });

  it('rejects bad rows with their line number and reason, keeps the good ones', () => {
    const csv = [
      HEAD,
      ',5,,,,', // 2: no name
      'A,abc,,,,', // 3: not a number
      'B,"5,5",,,,', // 4: Spanish decimal comma
      'C,-2,,,,', // 5: area out of range
      'D,,700,,,', // 6: age out of range
      'E,,,-3.3,,', // 7: latitude without longitude
      'F,,,95,-79,', // 8: latitude out of range
      'G,,,,,"POLYGON((-79.8 -3.35, -79.79 -3.35, -79.79 -3.34))"', // 9: not closed
      'H,,,,,"LINESTRING(0 0, 1 1)"', // 10: not a polygon
      `I,,,-3.0,-79.0,"${SQ}"`, // 11: point outside the polygon
      'J,1,2,3,4,5,6', // 12: more cells than the header
      'K,2,,,,', // 13: good
    ].join('\n');
    const r = parseLotsCsv(csv);
    expect(r.lots.map((l) => [l.line, l.name])).toEqual([[13, 'K']]);
    expect(r.rejected).toEqual([
      { line: 2, reason: 'name_missing', column: 'lot_name' },
      { line: 3, reason: 'number', column: 'area_ha' },
      { line: 4, reason: 'decimal_comma', column: 'area_ha' },
      { line: 5, reason: 'range', column: 'area_ha' },
      { line: 6, reason: 'range', column: 'plant_age_months' },
      { line: 7, reason: 'latlon_pair', column: 'longitude' },
      { line: 8, reason: 'range', column: 'latitude' },
      { line: 9, reason: 'not_closed', column: 'polygon_wkt' },
      { line: 10, reason: 'wkt', column: 'polygon_wkt' },
      { line: 11, reason: 'outside', column: 'latitude' },
      { line: 12, reason: 'columns' },
    ]);
  });

  it('says so when the file is empty or has no lot_name header, and lists unknown columns', () => {
    expect(parseLotsCsv('').error).toBe('empty');
    expect(parseLotsCsv('name,area\nA,1').error).toBe('header');
    expect(parseLotsCsv('lot_name,colour\nA,red').unknownColumns).toEqual(['colour']);
  });

  it('accepts columns in any order and blank lines', () => {
    const r = parseLotsCsv('area_ha,lot_name\n\n2.5,A\n');
    expect(r.lots).toEqual([{ line: 3, name: 'A', area_ha: 2.5, plant_age_months: null, geometry: null }]);
  });
});

describe('geometry helpers', () => {
  it('parses WKT and tests points', () => {
    const w = parseWkt(SQ);
    expect('polygon' in w).toBe(true);
    if ('polygon' in w) {
      expect(pointInPolygon(-79.795, -3.345, w.polygon)).toBe(true);
      expect(pointInPolygon(-79.7, -3.345, w.polygon)).toBe(false);
    }
    expect(parseWkt('POLYGON((0 0, 1 0, 1 1, 0 0), (0.1 0.1, 0.2 0.1, 0.2 0.2, 0.1 0.1))')).toEqual({ reason: 'wkt' });
  });
});
