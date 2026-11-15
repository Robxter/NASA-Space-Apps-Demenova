// Regression guard for the "Drop pin" bug (block 4): Leaflet adds classes (leaflet-container, leaflet-touch, ...) to
// the element it owns. If React re-renders that element with a different className, those classes are wiped and the
// map collapses. The element with ref={box} must therefore have a static className in every Leaflet screen.
import { describe, expect, it } from 'vitest';
import setupSource from './Setup/Setup.tsx?raw';
import mapSource from './Map/MapView.tsx?raw';

function containerTag(source: string): string {
  const at = source.indexOf('ref={box}');
  expect(at, 'a ref={box} element exists').toBeGreaterThan(-1);
  const start = source.lastIndexOf('<div', at);
  const end = source.indexOf('/>', at);
  return source.slice(start, end);
}

describe('Leaflet containers keep a static className', () => {
  for (const [name, source] of [
    ['Setup', setupSource],
    ['MapView', mapSource],
  ] as const) {
    it(`${name}: the map element's className is not computed from state`, () => {
      const tag = containerTag(source);
      expect(tag).not.toMatch(/className=\{`/);
      expect(tag).not.toMatch(/className=\{[^}]*\?/);
    });
  }

  it('the Setup map class is a plain string constant', () => {
    expect(setupSource).toMatch(/export const SETUP_MAP_CLASS = '[^'`$]+';/);
  });
});
