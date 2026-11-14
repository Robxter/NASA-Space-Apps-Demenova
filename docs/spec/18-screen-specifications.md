## Screen specifications · New

Navigation is a bottom tab bar with four tabs (Home, Map, Alerts, Learn); Lot detail and Strategies open from any lot, and Farm setup opens from the gear icon on Home. Each screen below is listed top to bottom, ready to hand to Claude Code.

**Home.**

1. Header: farm name, data freshness ("updated 2 h ago"), gear icon to Farm setup.
2. Alert banner, only when a lot is Warning or Severe: level word, lot name, top factor, tap to open the lot.
3. Farm status card: counts of lots per level and the highest W today.
4. Lot list sorted by W, highest first: colour dot plus level word, lot name, W, one-line reason.
5. Replay control, demo only: date scrubber with play button that drives every screen.

**Map.**

1. Full-screen map with lots coloured by level over NASA imagery.
2. Layer switch: alert level, terrain wetness, rain in the last 24 h.
3. Bottom sheet on tapping a lot: name, level, W, "Open lot" button.
4. Toggle between day view (replay) and month view (risk calendar).

**Lot detail.**

1. Lot name, level badge, W with a small gauge.
2. "Why": the top factors with their share of W and data timestamps.
3. History charts with a 1W / 1M / 3M switch: rain, soil moisture, temperature, NDVI, each against the same period in prior years.
4. Lot facts from farm data: age, drainage, cover crop, last soil analysis.
5. Button: "See strategies for this lot".

**Strategies.**

1. Priority sliders: soil health, water, cost, labour.
2. Three cards ranked by score: current management and two alternatives.
3. Each card expands to: why suggested, evidence, benefits, information gaps, risks to review locally.
4. Fixed footer: "Demenova supports the agronomist's judgment; it never replaces it."

**Alerts.**

1. Log of level changes, newest first: time, lot, from and to level, factors.
2. Email settings: on or off, recipient, test button.
3. Telegram: QR code and link to start the bot, connection status.

**Learn.** Short cards in plain Spanish and English: evapotranspiration, soil moisture anomaly, NDVI, terrain wetness index, water balance, where each NASA dataset comes from.

**Onboarding and Farm setup.** Step 1, drop a pin (level 0). Step 2, optionally trace the farm outline; automatic risk zones appear (level 1). Step 3, optionally add exact lots by drawing, importing GeoJSON, KML or CSV, or typing dimensions and dates (level 2). Step 4, optionally add field notes and past floods on a timeline (level 3). Every step can be skipped and revisited; the confidence badge updates as data is added, and "reset to demo farm" restores the synthetic farm.

**Visual mockups.** For pixel-level mockups before coding, ask this Claude account for a Design artifact of the Home and Lot detail screens, or let the frontend-design plugin in Claude Code set the visual direction.

