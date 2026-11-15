# Demenova design brief (T-016)

Owner: product-designer. Status: v1, 2026-11-14. Implemented in `app/src/styles/` and `app/src/components/ui/`.

## Subject, audience, job

- **Subject.** Satellite water intelligence for banana farms in coastal El Oro: from orbit to the root zone.
- **Audience.** (1) An agronomist scanning many lots on a phone or laptop. (2) A farmer with no staff, glancing at a
  phone in strong equatorial sun, often one-handed.
- **Primary job.** Answer "is anything wrong on my farm?" in one glance, then say where and why.
- **Memorable moment.** During the 22–23 Feb 2026 flood replay, a lot turns from calm to Severe on the map. All
  boldness goes there. Everything else stays quiet.

## Signature: the soil core

A soil core is the sample you pull out of the ground to see where the water sits. It runs through the whole system:

- **Logo.** A core seen in section: space above, a curved horizon (Earth seen from orbit), banana-leaf ground, and
  water lines in the root zone.
- **Severity glyph.** A small core in which water rises with the level: Normal 25 %, Watch 50 %, Warning 75 %,
  Severe full. "Out of date" is a dashed, empty core. The level can be read without colour.
- **The moment.** When a lot turns Severe, the core floods, and one ripple runs out from the lot twice
  (`.dn-lot-shape.is-onset` on the map, `<SeverityGlyph onset>` in HTML).

## Token plan (revised)

| Name | Light | Dark | Role |
| --- | --- | --- | --- |
| Orbit | `#0E2135` | `#0A1726` (bg) | Ink and primary buttons in light mode; the night sky that the dark theme sits in |
| Mist | `#EEF2EF` | `#12233A` (surface) | Page background: the bloom on a banana leaf's underside. A cool grey-green, not cream |
| Leaf | `#2A6343` | `#86CDA2` | Brand, links, selected tab. Never used for severity |
| Starlight | `#F4DF8E` | `#F4DF8E` | The nova in the logo only (ripe-banana yellow) |
| Alluvium | `#5A4A36` | `#D9C6AA` | Coastal clay. The "Demo" chip and synthetic data, so made-up content looks different from measured content |
| Severe | `#93154F` | `#E0336F` | Reserved for Severe. The one loud colour |

Text tiers: ink `#0E2135`/`#E7EDF2`; ink-2 `#44566A`/`#B3C0CC`; ink-3 `#56677A`/`#8E9DAB` (≥4.7:1 on every surface).
Focus ring `#1D5FC2`/`#7FB2FF`, 3 px with 2 px offset.

**Type.** System only: `system-ui, -apple-system` (SF Pro on iOS, Roboto on Android, Segoe UI on Windows). Zero
font bytes, works offline, and SF/Roboto are tuned for outdoor legibility. The personality comes from the numerals:
the index W and key values use large, light-weight (300) tabular figures with a small unit (Apple Weather's grammar,
not a monospace "data" face). Scale (px, line-height): display 44/46 light; title 28/34 semibold; headline 20/26
semibold; body 17/25; callout 15/20; footnote 13/18; caption 12/16 medium. Never below 12 px.

**Spacing.** 8-point: 4, 8, 12, 16, 24, 32, 48, 64 (Tailwind steps 1, 2, 3, 4, 6, 8, 12, 16). Touch targets at
least 48 px, list rows at least 56 px. Page gutter 16 px at 360 px, 24 px from 600 px.

**Radii by hierarchy.** Sheet 22, group 14, control 10, glyph 3, chip full. Nested radii shrink inwards.

**Elevation.** Flat by default: hairlines separate, not shadows. Only two shadows exist: `sheet` (bottom sheet,
scrubber dock) and `banner` (the alert banner, so it reads above the list).

**Motion.** Every motion answers a touch (press 120 ms, state 200 ms, sheet 320 ms, easing `cubic-bezier(.2,0,0,1)`),
except the one orchestrated moment: Severe onset = fill change 600 ms + ripple 1.1 s × 2, then still. With
`prefers-reduced-motion`, the ripple is removed and every change is instant. The level never depends on motion.

## Review against the AI-default tells (what changed and why)

1. **Four-point sparkle for "nova".** That shape now means "AI feature". I replaced it with a six-spike star, the
   diffraction pattern of a star photographed from an orbiting telescope, which is true to the subject.
2. **Near-black with an acid accent.** The dark theme is a deep orbit blue (`#0A1726`), not black. Severe is a wine
   raspberry, not neon, and it is the only solid-filled status.
3. **Identical rounded SaaS cards with shadows.** Replaced with inset grouped lists (the iOS Settings and Weather
   pattern): a sentence-case header above, a surface group, hairline rows, and a source line below.
4. **All-caps eyebrows and middle-dot meta.** Group headers are sentence case. Meta is a plain phrase:
   "NASA IMERG, updated 2 h ago".
5. **Monospace data labels.** Replaced with system tabular figures in a light weight.
6. **Traffic-light green/amber/red dots.** Normal is blue-teal, so red versus green never carries the meaning.
   Each level has three redundant cues: water height in the core, colour, and the word.
7. **Fade-up on every section; "→" on buttons.** Neither is used. Buttons are verbs ("Open lot"). A chevron appears
   only on rows that navigate, the iOS convention.
8. **Numbered markers.** Used only for real sequences (Farm setup steps 1–4).

## Severity palette

Always colour and word: Normal, Watch, Warning, Severe (es: Normal, Vigilancia, Aviso, Severo); `stale` reads
"Out of date" / "Desactualizado". Text is the level's ink on its tint. Fills are for map polygons and the core.

| Level | Light fill / ink / tint | Ink on tint (light) | Dark fill / ink / tint | Ink on tint (dark) |
| --- | --- | --- | --- | --- |
| Normal | `#3591A0` / `#0F5258` / `#DCEEEE` | 7.39:1 | `#72CEDA` / `#93DCE0` / `#0F3238` | 8.84:1 |
| Watch | `#F0C63A` / `#5C4100` / `#FAEFC2` | 8.23:1 | `#F9DA62` / `#F6D87A` / `#36300F` | 9.47:1 |
| Warning | `#D4560A` / `#7F2E00` / `#FBE0CB` | 7.25:1 | `#EE7A26` / `#FFB680` / `#3D2412` | 8.40:1 |
| Severe | `#93154F` / `#7E1046` / `#F7DCE8` | 7.98:1 | `#E0336F` / `#FF9DBF` / `#461530` | 7.68:1 |
| Out of date | `#8A949C` / `#3F4A55` / `#E4E9EC` | 7.39:1 | `#7C8893` / `#B9C3CC` / `#1D2A39` | 8.14:1 |

- Severe banner: white on `#93154F`, 8.53:1 (both themes). All status text passes AAA (≥7:1).
- Non-text contrast (WCAG 1.4.11). The core outline is drawn in the level's ink (≥7:1). The light Watch fill is only
  1.64:1 on white, so the fill is never the only boundary. Map polygons get a level-ink stroke and a fill opacity
  that rises with the level (0.25, 0.40, 0.55, 0.75).
- Colour-blind check (Machado 2009 simulation, CIE76 ΔE between level fills). Light: smallest protan 32, deutan 28,
  tritan 24. Dark: protan 29, deutan 22, tritan 21. The weakest pair is Watch versus Warning for deutans, so the
  core's water height and the word carry the difference.

## Logo options (Roberto picks, class A)

See `design/logo/README.md`. Recommendation: option 1, "Core". The PWA icons (T-016b) are drawn from it and can be
regenerated if Roberto picks another option.

## Not done in this pass

Sheet, TabBar and the chart frame (next pass, with frontend-engineer's screens). The wordmark is set in system
semibold inside the SVGs; outline it to paths once a logo is chosen.
