# Demenova — Instructions

Version: app build 2231e63 (block 3), document of 15 Nov 2026. Built with NASA Earth observations. Demenova is an
independent project and is not endorsed by NASA.

Demenova is a phone-first web app that rates waterlogging and flood risk for banana lots in coastal El Oro, Ecuador,
and keeps the records a farm never had time to keep. It supports the agronomist's judgment; it never replaces it.
Agronomic guidance in the app is general guidance, not yet reviewed by a local agronomist.

The demo farm, "Finca Demo El Oro", and its 8 lots are synthetic and marked **Demo**. The rain, weather, terrain and
imagery under them are real data.

## 1. Open and install

1. Open the Demenova link in a phone or desktop browser. Nothing to install; no account.
2. To install on Android (Chrome): menu (⋮) > **Install app** or **Add to Home screen** > confirm.
3. To install on iPhone (Safari): **Share** > **Add to Home Screen** > **Add**.

[SCREENSHOT: Home on a phone]

## 2. The four levels

Every level shows as a colour and a word: **Normal**, **Watch**, **Warning**, **Severe**. **Out of date** means the
data is old; do not rely on the level until it updates. Each lot has an **Index W** from 0 to 1. Watch starts at
0.40, Warning at 0.60 and Severe at 0.90. The Severe threshold is a design choice made after viewing the demo replay
to make Severe rarer; it is not fitted or validated.

## 3. Home

**Farm status** shows the day at a glance.
1. **Status today**: the highest level today and **Lots per level**.
2. A banner appears when a lot is at Warning or Severe. Tap it to open the lot.
3. **What to check**: the check for that level, marked as not yet reviewed by a local agronomist.
4. **Lots by risk**: the riskiest lot first, each with its **Top factor**.

[SCREENSHOT: Home with a Severe banner]

## 4. The replay

The demo replays 20 Jan to 5 Mar 2026 around the 22–23 Feb Buenavista river flood (Pasaje, El Oro), from published
files, with no live download.
1. On Home, find **Replay**. It opens on 23 Feb 2026 (UTC data day), the day El Universo reported the Buenavista river
   overflow at the Buenavista–Pasaje road.
2. Drag the **Replay day** back to 20 Jan, then tap **Play replay**. Tap **Pause replay** to stop.
3. Every screen follows the replay day.

What the replay shows: lot 2 first reaches Severe on 26 Jan, lots 1 and 7 on 7 Feb; the other lots stay at Warning.
The wettest demo lots (1 and 2) were already Severe from earlier storms before the flood, and the flood-day rain
reaches the index only after the overflow was reported. Demenova did not predict that flood.

[SCREENSHOT: Replay control]

## 5. Map

1. Tap **Map**. The **Risk map** colours each lot by level over NASA GIBS imagery.
2. **Layer**: **Alert level**, **Wetness** (terrain-wetness tercile: Low, Middle, High) or **Rain 24 h**.
3. **Imagery**: **Relief** or **True colour** (follows the replay day).
4. Zoom in to label each lot. Tap a lot to see its level, then **Open lot**.

[SCREENSHOT: Map, Alert level layer]

## 6. Lot detail

1. **Index W** with a gauge, **Level since** and **Newest rain data**.
2. **Why**: five factors sorted by **Share of the alert index**:
   - **Upstream rain**: 72 h rain over the Río Buenavista catchment (NASA GPM IMERG Early).
   - **Soil saturation**: an index built from rain history, not a soil measurement.
   - **Terrain wetness**: the lot's wetness rank within the farm, from NASA SRTM at 30 m.
   - **Local rain**: rain on the farm cell.
   - **Water balance**: 7-day rain minus crop evapotranspiration (FAO-56, NASA POWER inputs).
3. **What to check** for the current level.
4. **Today**: local rain, upstream rain 24 h, soil moisture and water balance 7 days. Satellite soil moisture is not
   in this build, so it shows **No data**.
5. **History**: Rain, Soil moisture, Mean temperature and NDVI over **1W**, **1M** or **3M**. Prior years are not in
   this data yet.
6. **Lot facts**: area, plant age, drainage, drainage works, cover crop, last soil analysis (synthetic on the demo).
7. **Other indicators**: Sigatoka weather, marked **Experimental**.
8. Every number carries an origin badge: Sourced, Calibrated, Provided, Observed, Estimated, Design, Pending, or Demo
   for synthetic values. A missing value shows **No data**, never a guess.

[SCREENSHOT: Lot detail, Why section]
[SCREENSHOT: Lot detail, History chart]

## 7. How reliable is this?

From Lot detail, tap **How reliable is this?**
1. **Checked against documented floods in the farm's catchment**, 1 Jan to 13 Nov 2026: **Hits** 1, **Misses** 0,
   **False alarms** 4. Counts only: there are too few documented floods to claim any accuracy. A false alarm means no
   flood in the news reports checked, not proof that no flood happened.
2. **Floods and alert episodes**: each episode with its dates and outcome.
3. **Do small changes in the weights change the result?** Each weight was moved by ±0.10 and the replay re-run:
   not stable in 10 of 10 runs (which lots are Severe on which days changes), but on the flood days (21–24 Feb) lots
   1 and 2 are Severe in every run.
4. **Warning time**: the demo lots were already Severe from earlier storms; there was no flood-specific warning time.
5. **Known limit**: the index compares each day with the whole year, so wet-season days stay high for weeks.
   Seasonal comparisons are planned.

[SCREENSHOT: How reliable is this? sheet]

## 8. Strategies

1. On Lot detail, tap **See strategies for this lot**.
2. Three options: **A Current management**, **B Improved drainage**, **C Drainage, living cover and bio-inputs**.
3. Each shows draft scores out of 5 for **Soil benefit**, **Water control**, **Cost** and **Labour** (origin Estimated).
   Costs and labour in money or workdays show **Not estimated yet**.
4. Tap **See why, evidence, gaps and risks** for the reasons, the opened sources, **Information gaps** and
   **Risks to review locally**.
5. Every card carries **Not yet reviewed by a local agronomist**. Demenova never recommends products or doses.

[SCREENSHOT: Strategies cards]

## 9. Alerts

1. Tap **Alerts**. **Level changes** lists every change, newest first, with its time and top factor.
2. Email: [main session: keep the wording that matches the built UI, see docs/site/welcome-content.md "Alerts
   wording"]. Type your email and request a test Severe alert. During the demo, delivery works only for the project
   owner's address; delivery to any address is a future update in development.
3. Telegram: [Variant A if the bot ships, Variant B otherwise, from welcome-content.md]. Variant B: Telegram alerts
   are planned and not available in this version.

[SCREENSHOT: Alerts, Level changes]

## 10. Learn

1. Tap **Learn**. Short definitions of the app's words, labelled "General guidance — not yet reviewed by a local
   agronomist". They are not recommendations.
2. **Where the data comes from**: each dataset with a link to its **Dataset page**.

[SCREENSHOT: Learn]

## 11. Farm setup (data levels 0 to 2)

Open **Settings** > **Farm setup**. Every step can be skipped and revisited; what you enter replaces the estimates.
A badge shows **Data level N** and its confidence (low, medium-low, medium).
1. **Drop a pin** (level 0, low). Type the **Farm name**, tap **Drop pin on the map** and tap the farm, or tap
   **Use my location**. Tap **Save pin**.
2. **Trace the farm outline (optional)** (level 1, medium-low). Tap **Draw outline**, tap the corners in order (at
   least 3), tap **Finish shape**. Terrain-wetness zones from NASA SRTM appear where the engine has run; elsewhere the
   app says they need an engine run.
3. **Add exact lots (optional)** (level 2, medium):
   - **Draw lot** on the map;
   - **Import GeoJSON** (a FeatureCollection, Feature or Polygon in WGS 84, 2 MB at most; the name is read from
     `name`, `nombre`, `lot` or `lote`);
   - or type the **Lot name**, optional **Area** and **Plant age (months)**, then **Add typed lot**. A typed lot with
     no shape stays on this device until drawn.
   - [CSV template and CSV import: steps to be added once built; not in the app labels at 2231e63.]
4. Alerts for your own farm need an engine run for its location. Until then, Home shows the demo farm.
5. **Delete my farm and show only the demo farm** removes your farm from this device and from sync.

Your farm is saved on this device first. Clearing the browser data deletes unsynced farms.

[SCREENSHOT: Farm setup, level badge and pin]
[SCREENSHOT: Farm setup, lots]

## 12. Settings

Tap the gear on Home.
1. **Language**: Español or English.
2. **Units**: **Metric** or **Imperial**. Display only; data is stored in SI units.
3. **Mode**: **Agronomist** (default, full detail) or **Farmer** (one status, fewer numbers).
4. **Storage**: **Full (90 days, imagery)** or **Data saver (7 days, no imagery)**.
5. **Theme**: **System**, **Light** or **Dark**.
6. **Records**: **Days saved on this device**, and **Export records (CSV)**. The CSV keeps stored units (mm, °C,
   fractions) and the origin of every value.
7. **Connect this device for sync**: tick the check box to show you are a person; the device gets a private sync
   identity, with no account or email. Without it, data stays on this device.

[SCREENSHOT: Settings]

## 13. Offline use

1. Open the app once with a connection; it saves the data on the device.
2. With no signal it still opens and says **Offline, showing data from …**.
3. Use **Data saver** to download less.

## 14. Data and limits

- Data: NASA GPM IMERG Early daily (`GPM_3IMERGDE` V07; V07B to 3 Mar 2026, V07C after), NASA POWER (Daily API
  v2.10.3; hourly API v2.10.4), NASA SRTM (`SRTMGL1` v003), Copernicus Sentinel-2 L2A, NASA GIBS, OpenStreetMap.
  SMAP and GLDAS were evaluated and are not used. Full list with URLs: docs/CITATIONS.md.
- The demo farm is synthetic. Weights and thresholds are design choices. Only the El Oro area has been run.
- Code: https://github.com/Robxter/NASA-Space-Apps-Demenova
