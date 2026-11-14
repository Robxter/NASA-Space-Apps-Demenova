## UI and UX: pages and design rules

Six screens, designed for a 360 px phone first; the home screen must answer "is anything wrong on my farm?" in one glance.

| Screen | Purpose | Key elements | States to design |
| --- | --- | --- | --- |
| Home | Farm status at a glance | Overall status card, alert banner, list of lots sorted by risk with colour and text label | Loading, all normal, active alert, offline, stale data |
| Risk map | Where the risk is | Lots coloured by severity on a map, day slider for replay, month view for the risk calendar | No lot selected, lot selected |
| Lot detail | Why this lot is at risk | Index W with its top factors, history charts for week, month, 3 months against prior years | Missing dataset, stale dataset |
| Strategies | What to do with this lot | Three cards: current plus two alternatives, each with score, reasons, evidence, benefits, gaps, risks; priority sliders | Default priorities, adjusted priorities |
| Alerts | What happened and when | Alert log with level, time, factors; email toggle and recipient | No alerts yet |
| Learn | Plain-language glossary | Evapotranspiration, NDVI, soil moisture anomaly, TWI, water balance | None |

**Design rules.**

- Severity always shows as colour plus a word (Normal, Watch, Warning, Severe), never colour alone.
- Every number shows its source and "updated X ago".
- Spanish and English labels, switchable; Spanish is the field default.
- Cached data loads first, so the app opens with no connection and says "offline, showing data from …".
- Strategies carry a fixed reminder: Demenova supports the agronomist's judgment and never replaces it.
- Large touch targets and high contrast for outdoor use in strong sun.

**User flow.**

1. The agronomist selects the farm and its lots once.
2. Home shows status; a Severe alert arrives by banner and email.
3. Tapping the alert opens the lot detail with the contributing factors.
4. The map shows which neighbouring lots are next in line.
5. Strategies compares what to change on that lot, weighted by the farmer's priorities.

