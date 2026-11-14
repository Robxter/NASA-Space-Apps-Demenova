# ReplayScrubber

`app/src/components/ui/ReplayScrubber.tsx`. Home item 5, demo only. Presentational: frontend-engineer owns the
index, the clock and what every screen does with the day.

Anatomy: 48 px play/pause button (primary) · current date (15 px semibold, tabular) · DemoChip · day strip with a
native range input on top (4 px playhead line) · first and last day labels.

The day strip is the farm's highest level per day: bar height follows the core's water height and colour follows
the level. Days after the playhead keep their height but stay neutral (`--dn-line`) until the playhead reaches
them, so the flood fills in with colour as the replay plays. A day with no data is a short dashed bar, never an
interpolated one.

| Prop | Use |
| --- | --- |
| `days` | `{ label, level \| null }[]`, label only on the ends ("15 feb", "5 mar") |
| `index`, `onIndexChange` | controlled; arrow keys work through the native input |
| `dateLabel` | "23 feb 2026"; also the slider's `aria-valuetext` |
| `playing`, `onTogglePlay` | aria-label "Reproducir" / "Pausar" (en "Play replay" / "Pause replay") |
| `loading` | skeleton bars, play disabled, `aria-busy` |
| `demo` | DemoChip (default true: the replay farm is synthetic) |

States: loading, ready, playing, at end (pressing play restarts from the first day; frontend resets `index`),
offline (works, because the replay is a static snapshot), demo (always).
