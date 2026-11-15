# Copy proposals, app screens (D-033, A3)

Owner: product-designer. frontend-engineer applies them in `app/src/i18n/en.ts` and `es.ts` (its dictionary).
Sources: `design-taste-frontend/references/copy.md`, `copy-voice.md`, `copy-tells.md`; voice rules in
`.claude/agents/frontend/product-designer.md`. Every proposal rewords a fact the app already states; no new claim,
number or promise. Keys are the dictionary keys in use on 2026-11-15; the current text is in the dictionary.

Voice card. Register: facts only, technical and dry where it explains (copy-registers 1 and 2). Pairs: exact and
plain; sure and short. Person: "you" for the farm and the lots; the app is never "we". Sentences: 6 to 14 words.
House words: lot, level, top factor, source, updated, demo. Never: virtue words, process talk, dashes as separators.

## Proposals

| Key | Proposed (en) | Proposed (es) | Tell fixed |
| --- | --- | --- | --- |
| `learn.general` | General guidance, not yet reviewed by a local agronomist. These short definitions explain the app's words. They are not recommendations. | Orientación general, aún no revisada por un agrónomo local. Estas definiciones cortas explican las palabras de la app. No son recomendaciones. | em dash |
| `learn.notReviewed` | General guidance, not yet reviewed by a local agronomist | Orientación general, aún no revisada por un agrónomo local | em dash |
| `alerts.channels` | Email and Telegram alerts are not available in this version. | Las alertas por correo y Telegram no están disponibles en esta versión. | process talk ("arrive with the backend work") |
| `lot.priorYears` | Prior years are not in this data yet, so there is no comparison. | Estos datos aún no incluyen años anteriores, así que no hay comparación. | system word ("snapshot") |
| `lot.side` | Other indicators | Otros indicadores | vague label |
| `lot.share` | Share of the alert index | Parte del índice de alerta | jargon on first read |
| `setup.intro` | Add what you know about your farm. You can skip any step and come back. What you enter replaces the estimates. | Agrega lo que sepas de tu finca. Puedes saltar cualquier paso y volver después. Lo que ingreses reemplaza las estimaciones. | semicolon run-on |
| `setup.level` + `setup.confidence` (joined in `Setup.tsx`) | Data level 0, low confidence | Nivel de datos 0, confianza baja | middle dot |
| `strategies.details` | See why, evidence, gaps and risks | Ver por qué, evidencia, vacíos y riesgos | button without a verb |
| `strategies.notEstimated` | Not estimated yet | Aún sin estimar | reads as final |
| `alerts.emptyBody` | When a lot changes level, the change is listed here with its time and top factor. | Cuando un lote cambia de nivel, el cambio aparece aquí con su hora y su factor principal. | empty state that teaches |
| `home.allNormalBody` | No lot needs attention on this day. Move the replay to see other days. | Ningún lote necesita atención este día. Mueve la repetición para ver otros días. | empty state invites the next action |

Lint waiver: "not yet reviewed by a local agronomist" is the required badge wording (brief guardrail 2), so its
"not" stays even where copy-lint counts it as a contrast frame.

## Separators (screens, not the dictionary)

Ten places join parts with a middle dot (`LevelCheck.tsx`, `DataValue.tsx` x2, `Learn.tsx`, `ReliabilitySheet.tsx`,
`MapView.tsx` x2, `Lot.tsx` x2, `Other.tsx`, `Strategies.tsx`, `Setup.tsx`). Proposed: source and freshness on two
lines ("Source: GPM IMERG" over "Updated 23/02/2026 23:00"; `Card` now takes `footer` as an array for this); inside a
sentence, a comma; in tooltips, a full stop.

## Source lines for domain tables

The displayed source for the guidance tables quotes a file path from the provenance text. Proposed display
(frontend-engineer): a short label "Source: Demenova guidance table (not a dataset)" / "Fuente: tabla de orientación
de Demenova (no es un conjunto de datos)", with the full provenance text one tap away (a `<details>` under the
footer). The provenance record itself does not change.
