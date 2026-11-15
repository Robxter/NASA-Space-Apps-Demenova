# SeverityGlyph

`app/src/components/ui/SeverityGlyph.tsx`. The soil core: water height encodes the level (25 / 50 / 75 / 100 %),
so the level can be read without colour. Decorative (`aria-hidden`), so always pair it with the word (SeverityBadge,
AlertBanner, or the row subtitle).

| Prop | Use |
| --- | --- |
| `level` | normal, watch, warning, severe, stale |
| `size` | height in px (default 18; 26 leads a list row; 30 in the banner) |
| `inverse` | white outline and water on the solid Severe banner |
| `onset` | the orchestrated moment: one ripple, two pulses, when a lot turns Severe. Set it for one render cycle (~2.4 s) |

States: normal / watch / warning / severe (filled) / stale (dashed and empty, "Out of date").
Under reduced motion the ripple is not rendered (`.dn-ripple { display: none }`), and the water height changes
instantly. The outline is the level ink (≥7:1), so the shape passes non-text contrast even when the fill does not
(light Watch fill: 1.64:1).

Map equivalent: the SVG path gets `className="dn-lot-shape"` and `data-level`; add `is-onset` for the Severe
moment. Fill opacity rises with the level (0.25 → 0.75); stale is dashed.

## Update 2026-11-15 (D-033, CHANGE_LIST CL-09, CL-30)

- Water height comes from `--lvl-ratio` through `.dn-core-water` (`transform: scaleY`, origin bottom), so a level
  change is the water rising or falling in place over `--dn-dur-flood` (700 ms) with `--dn-ease-in-out`.
- `onset` (Severe only) replays the last step once: water from the Warning mark (75 %) to full. The square ripple
  ring was removed: on the solid banner it read as a stray focus box (critique P1).
- No inline styles: the wrapper is sized by the SVG's width and height attributes.
- Reduced motion: the water is set at its level with no rise; the colour still changes.
