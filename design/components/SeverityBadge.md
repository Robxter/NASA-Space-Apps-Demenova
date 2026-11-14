# SeverityBadge

`app/src/components/ui/SeverityBadge.tsx`. Core + level word. Colour AND word, always.

| Prop | Use |
| --- | --- |
| `level`, `lang` | words: es Normal, Vigilancia, Aviso, Severo, Desactualizado; en Normal, Watch, Warning, Severe, Out of date |
| `label` | override from frontend-engineer's dictionary (empty strings are ignored, so the word never disappears) |
| `variant` | `tint` (pill, default) for headers and status cards; `plain` (coloured word only) inside rows and tables |
| `glyph` | `false` when a SeverityGlyph already leads the row |
| `size` | `sm` (12 px text) in rows and counts; `md` (13 px) elsewhere |
| `onset` | ripple on the glyph |

Contrast: ink on tint ≥7.25:1 light, ≥7.68:1 dark; plain ink on surface ≥8.16:1 (see design/BRIEF.md).
Proposed wording for `stale`: "Out of date" / "Desactualizado". It says what the user needs to know, not "stale".
