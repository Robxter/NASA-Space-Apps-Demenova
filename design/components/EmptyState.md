# EmptyState

`app/src/components/ui/EmptyState.tsx`. An empty core illustration (dashed when data is out of reach), a one-line
title saying what happened, a body saying what to do, and an optional action.

| Tone | Proposed copy (es / en) |
| --- | --- |
| empty | "Aún no hay alertas" / "No alerts yet". Body: "Aquí verás cada cambio de nivel de tus lotes." |
| offline | "Sin conexión" / "You're offline". Body: "Mostrando datos guardados del 23 feb 2026." Action: "Reintentar" |
| missing | "Sin datos para este lote" / "No data for this lot". Body names the dataset and why |
| error | `role="alert"`. "No se pudo cargar la finca" / "Couldn't load the farm". Body: "Revisa la conexión y vuelve a intentarlo." Action: "Reintentar" |

Errors never apologise and are never vague. An empty screen always offers the next action (Farm setup: "Dibujar
lotes"; Alerts: "Activar correo").

## Update 2026-11-15 (D-033, B3 delight)

- New tone `calm`: the core in Normal ink with water in the bottom quarter (the root zone), no motion. Use it when
  nothing is wrong ("All lots are Normal"), so a calm farm is something the farmer sees, not a blank. The other
  tones are unchanged (`empty` for "No alerts yet", dashed `missing`/`offline`, `error`).
- Delight thesis (impeccable delight.md, Severe moment and empty states only): the soil core is the one object that
  tells the farm's state, from calm (low water) to Severe (the Flood). No confetti, sound, haptics or loops: the
  delight is recognition, and it stays the same on the hundredth visit.
- Copy (proposed, already in the dictionary): "All lots are Normal" / "No lot needs attention on this day. Move the
  replay to see other days." (es: "Todos los lotes están en Normal" / "Ningún lote necesita atención este día. Mueve
  la repetición para ver otros días.").
