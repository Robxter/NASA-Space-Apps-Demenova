# AlertBanner

`app/src/components/ui/AlertBanner.tsx`. Home, item 2 (docs/spec/18): only when a lot is Warning or Severe.

Anatomy: core (30 px) · "**Severo**, Lote 4" (headline; word bold, lot regular) · top factor (callout) · freshness
(footnote) · chevron when `onOpen` is set. The whole banner is one button, and its text is the accessible name.

| Level | Skin |
| --- | --- |
| severe | The one solid surface in the product: `#93154F`, white text 8.53:1 (both themes) |
| warning | Level tint with level ink (7.25:1 light, 8.40:1 dark) |
| other levels | Allowed for previews, but Home should not show a banner for them |

States: closed (no banner), Warning, Severe, Severe with `onset` (ripple on the core), demo (meta begins with
"Demo,"; the screen header carries the DemoChip), stale (do not show a banner; show the lot as "Out of date").
Copy: `reason` is one plain line from the engine's top factor, for example "Lluvia acumulada y suelo saturado".
Never end it with "→". Wrap the banner in an `aria-live="polite"` region when it appears without user action.
