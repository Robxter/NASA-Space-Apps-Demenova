# MissingData and Value

`MissingData.tsx`: missing stays missing (DATA_POLICY §2). It renders the words "Sin datos" / "No data", never a
dash, a zero or a blank. Inline: dashed underline, with the reason in the tooltip and in screen-reader text.
Block: the word, then the reason on its own line (footnote, ink-3).
Reasons say what happened: "IMERG aún no publica este día", "SMAP no pasó sobre la finca este día".

`Value.tsx`: a formatted value with a small unit, in light tabular figures. Sizes: `display` (44 px light, index W on
Lot detail), `title` (28 px light, status counts), `body` (17 px medium, rows). `value={null}` renders MissingData.
`meta` is the provenance line: "NASA SMAP, actualizado hace 6 h". Every number shows its source (docs/spec/17).

States: value, missing (with reason), stale (caller adds an Out-of-date badge next to it, and the value stays
visible with its date), demo (the screen carries the DemoChip; synthetic values are never shown without it).
