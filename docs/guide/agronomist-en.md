# Demenova: agronomist guide

Demenova turns global NASA Earth observations into a daily waterlogging and flood index W (0 to 1) per lot or zone,
with four levels: Normal (green), Watch (yellow), Warning (orange), Severe (red), always colour and word.
Built with NASA Earth observations.

> All agronomic guidance in the app and in this guide is **general guidance, not yet reviewed by a local agronomist**.
> Actions are checks, never products or doses. Demenova supports the agronomist's judgment; it never replaces it.

Turn on full detail: **Settings** (gear on Home) > **Mode** > **Agronomist** (the default).

## 1. Data levels and the confidence badge

| Level | What you give | What it unlocks in this build |
| --- | --- | --- |
| 0 | A pin | Badge "Data level 0 · confidence low" |
| 1 | Farm outline | Terrain-wetness zones, shown only where the engine has computed them from NASA SRTM |
| 2 | Lots: drawn, imported (GeoJSON) or typed | Per-lot records; badge "confidence medium" |

Level 3 (field notes, past floods on a timeline, farm-calibrated thresholds; SPEC 04) is not in this build.
Two badges exist: the setup badge (**Data level N · confidence …**) and, on Lot detail, **Confidence n of 3**, which
the engine ties to the farm's data level. Alerts for a user-entered farm need an engine run for its location; until
then Home shows the synthetic demo farm.

## 2. Importing lots (GeoJSON)

1. **Settings** > **Farm setup** > step 3 **Add exact lots (optional)** > **Import GeoJSON**.
2. Accepted: a FeatureCollection, a single Feature, or a bare Polygon/MultiPolygon; coordinates in WGS 84
   longitude, latitude (EPSG:4326). 2 MB at most.
3. The lot name is read from the property `name`, `nombre`, `lot` or `lote`. A MultiPolygon becomes one lot per part,
   numbered "(1)", "(2)". Only the outer ring of each polygon is used.
4. Non-polygon features are skipped; the app reports "Imported {n} lots; skipped {skipped} features."
KML and CSV import (SPEC 04 and 18) are not in this build.

## 3. Reading factors and history

**Lot detail** (tap any lot) shows the level badge, **Index W** with a gauge, **Level since**, and **Newest rain data**.
**Why** lists five factors sorted by **Share of W**:
- **Upstream rain**: 72 h IMERG Early rain over the Buenavista catchment (GPM_3IMERGDE, NASA GES DISC).
- **Soil saturation**: antecedent precipitation index from rain history (SPEC 09, method 5).
- **Terrain wetness**: the lot's topographic wetness index rank within the farm, from SRTMGL1 at 30 m.
- **Local rain**: IMERG Early rain on the farm cell.
- **Water balance**: 7-day rain minus crop evapotranspiration (FAO-56 ETo × Kc, NASA POWER inputs).
Each indicator is a percentile against strictly earlier days; W is the weighted sum (verification provenance).
**Today** (agronomist mode) shows local rain, upstream rain 24 h, soil moisture and water balance 7 days.
Satellite soil moisture is `pending` in this build, so it shows **No data**: Demenova never fills it in.
**History**: Rain, Soil moisture, Mean temperature, NDVI, with **1W / 1M / 3M**; each chart carries its origin badge.
NDVI (Sentinel-2 L2A) has values only on cloud-free cells. Prior-year comparison is not in the snapshot yet.
**Side indicators**: Sigatoka weather, labelled **Experimental**. There is no cold-stress level.
Timing: an update lands at the end of the UTC data day plus the 4 h IMERG Early latency; times display in
America/Guayaquil. Severe is entered only after two agreeing updates.

## 4. Strategies A, B, C

**See strategies for this lot** opens three cards: **A Current management**, **B Improved drainage**,
**C Drainage, living cover and bio-inputs**. Each card shows draft 1–5 scores (soil benefit, water control, cost,
labour; origin Estimated) and **Why, evidence, gaps and risks**. Costs and labour in money or workdays show
**Not estimated**. Evidence cited: Turner et al. 2007 (banana tolerates at most 2 days of waterlogging), Johns 1994
and De la Cruz et al. 1994 (Arachis pintoi cover), Jefwa et al. 2010 (mycorrhizae); links and access dates are on
the cards. Every card carries **Not yet reviewed by a local agronomist**, and the footer reads "Demenova supports the
agronomist's judgment; it never replaces it." Priority sliders (SPEC 18) are not in this build.

## 5. "How reliable is this?"

On Lot detail, tap **How reliable is this?** Everything comes from `verification.json`.
- **Counts only**: hits, misses, false alarms against press-documented floods in the farm's catchment. In the 2026
  replay's verification file: 1 hit, 0 misses, 4 false alarms for 1 Jan–13 Nov 2026, counted per Severe episode. A false alarm means no
  flood in the press reports checked, not proof that no flood happened. No accuracy is claimed.
- **Warning time**: the demo lots were already Severe from earlier storms (episode from 5 Feb 2026). The 23 Feb flood
  rain reaches W only after the overflow was reported, so there is no flood-specific lead time.
- **Known limit**: percentiles are against the whole year, so wet-season days stay high for weeks. Seasonal
  percentiles are planned after the hackathon.
- **Sensitivity**: each of the 5 weights was moved by ±0.10 (10 runs). In the 2026 replay, which lots are Severe on
  which days changes in 10 of 10 runs; on the flood days (21–24 Feb) lots 1 and 2 are Severe in every run.
- The Severe threshold (W ≥ 0.90) is a design choice made after viewing the replay; it is not fitted or validated.

## 6. Limits of the science

- Few documented floods: counts, not percentages (SPEC 09, method 14).
- Kirpich travel time is used far outside its calibration range (basins of 1–112 acres; this one is 254 km²); the
  0-day lag comes from the same event used for verification (in-sample).
- Curve Number runoff is pending (no calibrated CN), so upstream runoff is not shown.
- TWI depends on DEM resolution and method, so lots are ranked within the farm; D8 handles flat lowlands poorly.
- FAO-56 tables assume sub-humid, standard conditions. Day definitions are mixed (IMERG UTC days, POWER local days).
- A missing W (POWER gap) holds the level. Clouds block optical NDVI in the tropics.
- Sigatoka thresholds come from other banana regions. October 2026 IMERG Early rain is far above 2015–2025, and its
  independence from the March 2026 product change is unverified.

## 7. Exporting records

**Settings** > **Records** > **Export records (CSV)**. The CSV keeps stored SI units (mm, °C, fractions) and the
origin of every value. In this build it covers the demo replay days loaded on the device.
