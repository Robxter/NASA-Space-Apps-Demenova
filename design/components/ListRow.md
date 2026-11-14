# List and ListRow

`app/src/components/ui/ListRow.tsx`. Rows of an inset group: minimum 56 px, hairline inset 16 px from the leading
edge, chevron only when the row navigates (`onPress`).

Lot row (Home item 4), recommended composition:

```tsx
<ListRow
  leading={<SeverityGlyph level={lot.level} size={26} />}
  title="Lote 4"
  subtitle={<><SeverityBadge level={lot.level} variant="plain" size="sm" glyph={false} />, {topFactor}</>}
  trailing={<Value value={wFormatted /* null -> "Sin datos" */} />}
  onPress={openLot}
/>
```

The glyph is the scanning anchor at a fixed width, so lot names align, which pills of different widths cannot do.
The level word starts the subtitle in its ink colour.

Layout rule: a grid or flex parent must allow shrinking (`grid-cols-1` = `minmax(0, 1fr)`, or `min-w-0`).
Otherwise the truncated subtitle's nowrap width pushes the page past 360 px (found and fixed in the specimen).
States: loading (skeleton rows: a 26 px skeleton core and two bars), empty (EmptyState), stale (glyph dashed, word
"Desactualizado"), missing W ("Sin datos" with a dashed underline; the reason is in the title attribute and in
screen-reader text).
