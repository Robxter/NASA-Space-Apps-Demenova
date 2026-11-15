---
name: design-direction
description: Demenova visual system (v1 2026-11-14, motion pass 2026-11-15): soil-core signature, Flood moment, palette roles, rejected ideas; read before any design pass
metadata:
  type: project
---

The signature is the **soil core**: logo = core in section (D-015 picked option 1 "Core"); severity glyph = water
rising in the core (25/50/75/100 %, stale = dashed empty, now drawn by `scaleY(var(--lvl-ratio))`).
The one motion moment (since 2026-11-15, D-033) is **Flood**: water rises inside the map lot (700 ms, ease-in-out
.77,0,.175,1), the label core fills with it, one ring spills at 560 ms (900 ms). Ripple x2 was retired.

**Why:** the brief spends boldness only on calm-to-Severe; Flood makes logo, glyph and moment one idea, and is shorter
than the old 2.2 s loop. PRODUCT.md and DESIGN.md at the repo root now record the system (D-033).

**How to apply:** extend the core metaphor, not new motifs; Severe (#93154F / #E0336F) is the only solid status; Normal
is blue-teal (never green). Motion tokens live in tokens.css (`--dn-ease-out` .23,1,.32,1 etc.); reduced motion is
token fallbacks, never a global 0.01 ms kill (Impeccable audit flags that).

Tried and rejected (do not retry):
- Four-point sparkle for "nova" (reads "AI feature"); long vertical spike (Christmas star); torn-leaf logo.
- Faded future days on the scrubber (muddy in dark). Use neutral `--dn-line` bars.
- Variable-width severity badges leading list rows: names misalign and truncate at 360. Use ListRow `level`.
- DemoChip with inline hint text. Square ripple ring on the solid Severe banner (reads as a stray focus box).
- Taste classics' font bans, double-bezel cards, scroll fade-ups: not for Operate screens or system fonts.
Motion rule from B2 (remove-animations): functional data never animates on ordinary day changes (core water snaps,
lot fill 200 ms); the 700 ms rise plays only under `.is-onset`/`.is-flooding`. Accessory removed in B4: the banner shadow.
What worked: real demo transitions (6 to 7 Feb 2026, Lote 1 and 7 Warning to Severe) for prototypes, never invented levels.
Related: [[screenshot-tooling]]
