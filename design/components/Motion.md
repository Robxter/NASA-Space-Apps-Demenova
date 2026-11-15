# Motion tokens (D-033)

Owner: product-designer. Values in `app/src/styles/tokens.css`; utilities in `theme.css`; rules in `DESIGN.md`.
Curves are Emil Kowalski's (review-animations `STANDARDS.md`); terms from `animation-vocabulary`.

| Token | Value | Use | Reduced motion |
| --- | --- | --- | --- |
| `--dn-ease-out` (`ease-out`) | `cubic-bezier(.23,1,.32,1)` | Press, state, anything that answers a touch | same |
| `--dn-ease-in-out` (`ease-in-out`) | `cubic-bezier(.77,0,.175,1)` | Something on screen changes in place (the flood) | same |
| `--dn-ease-drawer` (`ease-drawer`) | `cubic-bezier(.32,.72,0,1)` | Sheets, the scrubber dock | same |
| `--dn-dur-press` (`duration-press`) | 120 ms | Press feedback | same (colour only) |
| `--dn-dur-state` (`duration-state`) | 200 ms | Colour and state changes | same |
| `--dn-dur-sheet` (`duration-sheet`) | 320 ms | Sheet slide in | same; `--dn-sheet-offset` 0, so a fade |
| `--dn-dur-flood` | 700 ms | Water rises in the lot and in the core | 0 ms |
| `--dn-dur-spill`, `--dn-delay-spill` | 900 ms, 560 ms | The one ring that leaves the lot | 0 ms, hidden |
| `--dn-press-scale`, `--dn-press-scale-wide` | 0.97, 0.985 | `.dn-press`, `.dn-press-wide` | 1 |

Classes: `.dn-press`, `.dn-press-wide`, `.dn-core-water` (+ `.is-onset`), `.dn-lot-ring`, `.leaflet-tooltip.dn-map-label`
with `.dn-lvl-<level>`. The global "0.01 ms" reduced-motion kill was replaced by these token fallbacks (audit: it
erased feedback, not only movement). Screens should use `duration-press ease-out` instead of `duration-[120ms]`.
States: not applicable (tokens); the Severe moment's states are in `design/upgrade/CHANGE_LIST.md`.

Update B2 (2026-11-15): `--dn-ease-flood` `cubic-bezier(.65,0,.35,1)` (easeInOutCubic, the map sweep's JS curve) drives
the core's rise; the rise plays only under `.is-onset` or `.is-flooding`, never on ordinary day changes. Lot fills
change over `--dn-dur-state`. `--dn-dur-onset`, `dn-lot-onset` and `.dn-ripple` are removed.
