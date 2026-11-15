# Demenova: judge quick start (one page)

Demenova is a phone-first web app that turns NASA Earth observations into waterlogging and flood alerts for banana
farms in coastal El Oro, Ecuador. Built with NASA Earth observations. Agronomic guidance in the app is general
guidance, not yet reviewed by a local agronomist.

## 1. Open it
1. Open **<app URL>** on a phone or desktop browser. Nothing to install; it also installs to the home screen.
2. The app opens on **Home** for the demo farm, **Finca Demo El Oro**, marked **Demo**.

## 2. Switch language and units
1. Tap the gear (**Settings** / **Ajustes**), top right of Home.
2. **Language**: Español or English. **Units**: Metric or Imperial (display only; data is stored in SI).
3. **Mode**: Agronomist (default, full detail) or Farmer (fewer numbers).

## 3. Run the replay (20 Jan – 5 Mar 2026)
1. Back on **Home**, scroll to the **Replay** control. It opens on **23 Feb 2026**, the day after the Buenavista river
   overflowed at the Buenavista–Pasaje road (El Universo, 23 Feb 2026).
2. Drag the day scrubber back to **20 Jan**, then press **Play replay**. Every screen follows the replay day.

## 4. Watch lots escalate
- Home lists **Lots by risk**, each with colour and word (Normal, Watch, Warning, Severe) and its **Top factor**.
  A banner appears when a lot is at Warning or Severe.
- The **Alerts** tab shows **Level changes**, newest first. In the 2026 replay's verification file, lot 2 first
  reaches Severe on 26 Jan and lots 1 and 7 on 7 Feb (UTC data days); the other lots stay at Warning.
- The **Map** tab colours each lot by level over NASA GIBS imagery; switch the layer to **Wetness** or **Rain 24 h**.

## 5. Lot detail and "How reliable is this?"
1. Tap a lot: **Index W**, **Why** (five factors with their **Share of W**), **History** charts (1W / 1M / 3M) and
   **Lot facts**. Every number carries its origin; missing data shows **No data**, never a guess.
2. Tap **How reliable is this?**: counts only (hits, misses, false alarms against press-documented floods), the
   warning-time caveat, the known limit and the weight-sensitivity check, all read from `verification.json`.

## 6. Strategies
On Lot detail, tap **See strategies for this lot**: options **A Current management**, **B Improved drainage**,
**C Drainage, living cover and bio-inputs**, each with why, evidence, gaps and risks, the badge **Not yet reviewed by
a local agronomist**, and the footer "Demenova supports the agronomist's judgment; it never replaces it." Costs and
labour show **Not estimated**.

## 7. What Demenova did not do
The demo lots were **already Severe from earlier storms** (episode from 5 Feb 2026) before the 22–23 Feb flood. The
flood rain reaches the index only after the overflow was reported. **Demenova did not predict that flood** and shows
no flood-specific warning time. The Severe threshold (W ≥ 0.90) is a design choice made after viewing the replay,
not fitted or validated. Severe alert emails are built in the backend, but the app has no email or Telegram
settings yet.

## 8. Real data and demo data
| Real (sourced) | Synthetic (labelled Demo) |
| --- | --- |
| Rain: GPM IMERG Early daily (GPM_3IMERGDE v07, NASA GES DISC) | The farm "Finca Demo El Oro" |
| Weather and evapotranspiration inputs: NASA POWER | Its 8 lots ("Lote 1 (demo)" … "Lote 8 (demo)"): shapes, area, age, drainage, cover |
| Terrain and catchment: SRTMGL1 v003 at 30 m | |
| NDVI: Copernicus Sentinel-2 L2A (ESA partner data) | |
| Map imagery: NASA GIBS | |
| Flood record: El Universo press report, 23 Feb 2026 | |
The lots' terrain wetness values are computed from SRTM (sourced) even though the lots are synthetic. Satellite
soil moisture is not in this build and shows as **No data**.
