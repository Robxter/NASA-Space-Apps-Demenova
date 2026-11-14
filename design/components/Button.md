# Button

`app/src/components/ui/Button.tsx`. Minimum height 48 px, radius 10, 17 px semibold. Labels are verbs from the
user's side, with no arrows: "Abrir lote" / "Open lot", "Ver estrategias" / "See strategies", "Guardar lote" /
"Save lot" (toast "Lote guardado" / "Lot saved").

| Variant | Use |
| --- | --- |
| primary | Orbit (light) or Mist ink (dark). One per screen |
| secondary | surface-2, for "Reintentar" and secondary actions |
| quiet | Leaf text, for low-stakes actions such as "Restaurar finca demo" |

States: default, pressed (scale 0.98, 120 ms), focus (3 px focus ring), disabled (45 % opacity, not-allowed cursor),
loading (frontend swaps the label for "Guardando…" and sets `disabled`).
