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
