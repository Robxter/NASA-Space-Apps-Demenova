# Card (inset group)

`app/src/components/ui/Card.tsx`. Not a floating card: a sentence-case header (13 px semibold, ink-2) above a flat
surface group (radius 14), with an optional source line below (13 px, ink-3). There are no shadows and no borders.
Hierarchy comes from Mist versus surface.

| Prop | Use |
| --- | --- |
| `title` | "Estado de la finca", "Lotes por riesgo". Sentence case, no eyebrow caps |
| `action` | trailing header slot: a DemoChip or a quiet text button |
| `footer` | provenance: "Índice W calculado con NASA GPM IMERG, SMAP y SRTM", "NASA SMAP, updated 6 h ago" (comma, never "·") |
| `padded` | `false` when the child is a `<List>` |

States: loading (put skeleton rows inside; the header stays), empty (EmptyState inside, `padded={false}`), offline
(footer says "Sin conexión, datos del 23 feb 2026"), stale (footer in words plus Out-of-date badges on rows),
error (EmptyState tone="error"), demo (DemoChip in `action`).

## Update 2026-11-15 (D-033, CHANGE_LIST CL-12)

- `footer` also accepts an array: one line per part, empty parts skipped. Use it for "Source: ..." and
  "Updated ..." instead of joining them with a middle dot. A string or node footer renders as before.
