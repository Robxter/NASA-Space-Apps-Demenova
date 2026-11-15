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

## Update 2026-11-15 (D-033, B1, CHANGE_LIST CL-24)

- Thumb: a 44 px wide hit area (iOS Safari drags only from the thumb) drawn as a 4 px playhead with a 14 px round
  knob on top, both with a surface halo. Pressed: the knob grows to 20 px over `--dn-dur-press` (a state change, so
  it stays under reduced motion). Tracking is native: 1:1 under the finger, one step per day, no easing while dragging.
- Geometry: the range overhangs the bar strip by 16 px each side, so the thumb centre runs from 6 px to width - 6 px
  and sits over bar i at index i. Bars are capped at 10 px and centred, so one or two days never clip at the edges
  (frontend-engineer's break-ui finding). The play button sits above the overhang (`z-10`): its edge stays a button.
- `touch-action: pan-y`: a vertical swipe that starts on the strip still scrolls the page.
- Not applicable: rubber-banding and release springs (gestures, apple-design §9): a discrete native slider stops at
  the first and last day, which is the honest boundary for a dated replay.
- Checked with Playwright MCP `browser_drag` at 360 and 1440 (values 42 and 43 of 44 after dragging to the end label;
  1 after dragging to the start label at 1440); the play button's right edge still hits the button.
