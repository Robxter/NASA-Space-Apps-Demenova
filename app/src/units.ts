// Display-only unit conversion (CLAUDE.md §2, ADR-002). Storage is always SI; converted values are never stored.
// Every quantity enters as its SI value and leaves as a formatted string plus a unit label.
import type { Language, UnitSystem } from './types/contracts';

/** Kinds of quantity the app shows. The SI unit is fixed per kind (CONTRACTS.md §2). */
export type QuantityKind =
  | 'mm' // rain, water depth, evapotranspiration, balance
  | 'celsius' // temperature
  | 'm' // length, depth
  | 'cm' // root depth, water-table depth
  | 'ha' // area
  | 'fraction' // 0..1, shown as %
  | 'index' // unitless (W, NDVI, TWI)
  | 'days'
  | 'hours'
  | 'months'
  | 'count';

// Exact definitions: 1 in = 25.4 mm; 1 ft = 0.3048 m; 1 acre = 4046.8564224 m² (international units).
export const MM_PER_INCH = 25.4;
export const M_PER_FOOT = 0.3048;
export const M2_PER_ACRE = 4046.8564224;
export const M2_PER_HECTARE = 10000;

export const mmToIn = (mm: number): number => mm / MM_PER_INCH;
export const cToF = (c: number): number => (c * 9) / 5 + 32;
export const mToFt = (m: number): number => m / M_PER_FOOT;
export const cmToIn = (cm: number): number => (cm * 10) / MM_PER_INCH;
export const haToAcres = (ha: number): number => (ha * M2_PER_HECTARE) / M2_PER_ACRE;

/** Converts an SI value to the display system. Returns the number and its unit symbol. */
export function convert(kind: QuantityKind, si: number, system: UnitSystem): { value: number; unit: string } {
  if (system === 'imperial') {
    switch (kind) {
      case 'mm':
        return { value: mmToIn(si), unit: 'in' };
      case 'celsius':
        return { value: cToF(si), unit: '°F' };
      case 'm':
        return { value: mToFt(si), unit: 'ft' };
      case 'cm':
        return { value: cmToIn(si), unit: 'in' };
      case 'ha':
        return { value: haToAcres(si), unit: 'ac' };
      default:
        break;
    }
  }
  switch (kind) {
    case 'mm':
      return { value: si, unit: 'mm' };
    case 'celsius':
      return { value: si, unit: '°C' };
    case 'm':
      return { value: si, unit: 'm' };
    case 'cm':
      return { value: si, unit: 'cm' };
    case 'ha':
      return { value: si, unit: 'ha' };
    case 'fraction':
      return { value: si * 100, unit: '%' };
    default:
      return { value: si, unit: '' };
  }
}

/** Decimals per kind and system: enough to keep the stored precision readable, never more. */
export function decimalsFor(kind: QuantityKind, system: UnitSystem): number {
  switch (kind) {
    case 'mm':
      return system === 'imperial' ? 2 : 1;
    case 'cm':
      return system === 'imperial' ? 1 : 0;
    case 'celsius':
    case 'm':
    case 'ha':
      return 1;
    case 'fraction':
      return 0;
    case 'index':
      return 2;
    default:
      return 0;
  }
}

export function formatNumber(value: number, lang: Language, decimals: number): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export interface DisplayQuantity {
  /** Formatted number, or null when the value is missing (never 0). */
  text: string | null;
  unit: string;
}

/** SI value in, display string out. null, undefined and non-finite numbers stay missing. */
export function displayQuantity(
  kind: QuantityKind,
  si: number | null | undefined,
  system: UnitSystem,
  lang: Language,
  decimals?: number,
): DisplayQuantity {
  const unitOnly = convert(kind, 0, system).unit;
  if (si === null || si === undefined || !Number.isFinite(si)) return { text: null, unit: unitOnly };
  const { value, unit } = convert(kind, si, system);
  return { text: formatNumber(value, lang, decimals ?? decimalsFor(kind, system)), unit };
}

/** Inverse of `convert` for values the user types in display units: returns the SI value to store. */
export function toSI(kind: QuantityKind, value: number, system: UnitSystem): number {
  if (system === 'imperial') {
    switch (kind) {
      case 'mm':
        return value * MM_PER_INCH;
      case 'celsius':
        return ((value - 32) * 5) / 9;
      case 'm':
        return value * M_PER_FOOT;
      case 'cm':
        return (value * MM_PER_INCH) / 10;
      case 'ha':
        return (value * M2_PER_ACRE) / M2_PER_HECTARE;
      default:
        break;
    }
  }
  return kind === 'fraction' ? value / 100 : value;
}
