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
