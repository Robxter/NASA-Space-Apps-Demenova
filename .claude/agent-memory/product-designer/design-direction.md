---
name: design-direction
description: Demenova visual system v1 (2026-11-14): soil-core signature, palette, what was tried and rejected; read before any design pass
metadata:
  type: project
---

v1 shipped 2026-11-14 (T-016). The signature is the **soil core**: logo = core in section (space, curved Earth limb,
leaf ground, root-zone water); severity glyph = water rising in the core (25/50/75/100 %, stale = dashed empty);
the one motion moment = ripple x2 when a lot turns Severe (`.dn-lot-shape.is-onset`, `SeverityGlyph onset`).
Logo pick is Roberto's (PENDING P-006, recommended option 1 Core); icons already drawn from option 1.

**Why:** the brief asks for boldness only at the calm-to-Severe map moment; the core makes logo, status and moment one idea.

**How to apply:** extend the core metaphor rather than adding new motifs; keep Severe (#93154F light / #E0336F dark)
the only solid-filled status; Normal is blue-teal (never green) so red/green never carries meaning.

Tried and rejected (do not retry):
- Four-point sparkle for "nova": reads as an "AI feature" icon. Use the six-spike diffraction star.
- A star with a long vertical spike: reads as a Christmas/Bethlehem star. Keep the spikes equal.
- Torn-leaf logo: reads as agave/palm at small sizes.
- Faded (35 % opacity) future days on the scrubber: muddy brown in dark mode. Use neutral `--dn-line` bars.
- Variable-width severity pills leading list rows misalign names. Lead with a fixed-width glyph and put the word in the subtitle.
- DemoChip with inline hint text ("Demo datos de ejemplo") read as a broken sentence. Removed it.
Related: [[screenshot-tooling]]
