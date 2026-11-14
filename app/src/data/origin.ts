// Origin resolution (CONTRACTS.md §8.1): sibling `<key>_origin`, then `origin[key]`, then `origin["*"]`, then a
// string `origin`, then the enclosing object's origin. The UI never shows a number without what this returns.
import { ORIGIN_VALUES, type Origin, type OriginSpec } from '../types/contracts';

function asOrigin(v: unknown): Origin | null {
  return typeof v === 'string' && (ORIGIN_VALUES as readonly string[]).includes(v) ? (v as Origin) : null;
}

export function fromSpec(spec: OriginSpec | null | undefined, key: string, parent: Origin | null = null): Origin | null {
  if (typeof spec === 'string') return asOrigin(spec) ?? parent;
  if (spec && typeof spec === 'object') return asOrigin(spec[key]) ?? asOrigin(spec['*']) ?? parent;
  return parent;
}

/** Origin of `obj[key]`; `index` picks the entry of an array-valued sibling `<key>_origin`. */
export function resolveOrigin(obj: object | null | undefined, key: string, parent: Origin | null = null, index?: number): Origin | null {
  if (!obj) return parent;
  const rec = obj as Record<string, unknown>;
  const sibling = rec[`${key}_origin`];
  if (Array.isArray(sibling) && index !== undefined) {
    const o = asOrigin(sibling[index]);
    if (o) return o;
  } else {
    const o = asOrigin(sibling);
    if (o) return o;
  }
  return fromSpec(rec.origin as OriginSpec | undefined, key, parent);
}
