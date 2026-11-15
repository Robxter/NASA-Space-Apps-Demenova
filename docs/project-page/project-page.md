# Demenova: project page draft (2026 NASA Space Apps Challenge)
Challenge: Field Shift: Adapting Farms with NASA Data. Draft by technical-writer, 15 Nov 2026; Roberto edits and submits.
Sources for every statement: docs/CITATIONS.md. Links marked <...> are filled in by Roberto.

## Summary
Demenova is a phone-first web app that turns open, global NASA Earth observations into waterlogging and flood
alerts, field-condition history and soil-management strategies for banana farms in coastal El Oro, Ecuador. It needs
no sensors and no records: a farm can start with a single pin on the map and add detail later. Built with NASA Earth
observations.

## Problem
Demenova started from the experience of an agronomy student whose family runs a banana farm that keeps no records, so
every flood comes as a surprise. 2026 shows how often that happens in El Oro:
- 22-23 Feb 2026: after rain from Sunday night into Monday, the Buenavista river overflowed at the Buenavista-Pasaje
  road and water entered crop areas, mainly banana farms (El Universo, 23 Feb 2026).
- By 07:00 on 12 Oct 2026, Ecuador's risk agency (SNGR) listed the Río Chico and Río Caluguro as overflowed in Santa
  Rosa (Teleamazonas, 12 Oct 2026).
- 19 and 26 Oct 2026: the Chaguana river flooded Tendales, El Guabo, twice in less than a week (Extra, 26 Oct 2026).
Floods may also spread disease. Primicias (updated 1 Mar 2026) reports producers saying the rains of 23-24 Feb 2026
overtopped part of a containment wall around a farm in El Quemado, Santa Rosa, where Fusarium Tropical Race 4 was
officially confirmed in December 2025; an Agrocalidad official quoted there says water can carry the fungus,
especially in floods. Demenova does not model disease.

## Solution
For each lot, Demenova computes an alert index W from five factors: upstream rain over the river's catchment, soil
saturation, terrain wetness, local rain and the 7-day water balance (rain minus crop evapotranspiration). W maps to four levels shown as colour and word
(Normal, Watch, Warning, Severe), with the two factors that drive it. Screens: Home, a risk map, lot detail with
history, three strategies per lot with reasons, evidence, gaps and risks, alerts, and a Learn glossary. The backend
can send a Severe alert by email to the operator's address set at deploy; email sign-up in the app is not in this build. Every reading and alert is saved on the device and exportable as CSV, so a farm that never kept
records builds one. Spanish and English; metric or imperial display.

## How NASA data is used
- GPM IMERG Early daily (`GPM_3IMERGDE` V07; V07B to 3 Mar 2026, V07C after): rain over the Buenavista catchment and the farm, 2015 to Nov 2026.
- NASA POWER (Daily API v2.10.3; hourly API v2.10.4 for the replay window): temperature, humidity, wind and radiation for FAO-56 evapotranspiration and the water balance.
- SRTM 1 arc second (`SRTMGL1` v003): terrain, flow routing, the 253.8 km² catchment and terrain-wetness zones.
- NASA GIBS: map imagery.
- GLDAS Noah 2.1 soil moisture was downloaded for the replay window but is not used by W or shown in the app. SMAP was
  evaluated but not used because no retrieval over the farm met the recommended quality in the replay window.
- Partner and open data: Copernicus Sentinel-2 L2A for greenness (NDVI), OpenStreetMap for the river.
Every input is a global dataset, so the pipeline is built to be pointed at another area of interest; only the El Oro
area has been run, and its catchment outlet needed a mapped river (OpenStreetMap) burned into the DEM.

## Data modes: from zero data to full data
| Level | The farm gives | Demenova provides |
| --- | --- | --- |
| 0 | A pin | Regional view and upstream warning; confidence low |
| 1 | Farm outline | Risk zones from terrain wetness; medium-low |
| 2 | Lots drawn, imported (GeoJSON) or typed | Alerts and strategies per lot; medium |
| 3 | Field notes, past floods | Thresholds tuned to the farm (planned, not in this build) |
Provided data always overrides estimates, and each value carries its origin badge. In this build, alerts run only for
the demo farm; a new farm needs an engine run for its location.

## Science and its limits
- The replay runs 20 Jan to 5 Mar 2026 on a synthetic demo farm with 8 lots.
- Severe starts at W ≥ 0.90, "a design choice made after viewing the 2026 replay to make Severe rarer ... It is not
  fitted or validated; the 2026 floods were seen when choosing it." (The Severe exit point, W < 0.80, is a main-session
  default kept from the SPEC; D-029.) The weights are design choices too.
- Verification against press-documented floods in the farm's catchment, 2026: 1 hit, 0 misses, 4 false alarms.
  Demenova gave no flood-specific lead time in February: the wettest demo lots (1 and 2) were already Severe from
  earlier storms (since 5 and 7 Feb), and
  the flood-day rain enters the index only after the overflow was reported.
- Weight sensitivity (each weight ±0.10): not stable in 10 of 10 runs (which lots are Severe on which days changes),
  but on the flood days (21-24 Feb) lots 1 and 2 are Severe in every run.
- Known limit: percentiles against the whole year keep wet-season days high for weeks; seasonal percentiles are planned.
- Agronomic guidance is general and not yet reviewed by a local agronomist. Demenova is built so local agronomists can
  validate it: every threshold, practice and strategy carries its origin (sourced, estimated or pending) and review
  status, so local agronomists can validate and tune Demenova
  without touching the code. The app supports, never replaces, the agronomist's judgment.

## Impact
Farms without records, staff or sensors are the ones floods catch by surprise. Demenova is built to give them a free
alert and a history from day one, and gives local agronomists a transparent tool they can check and adjust. Impact on real farms
has not been measured yet.

## Use of SI (AI) tools
The app, pipeline, tests and documents were produced with Claude Code (Anthropic, Opus 5.5) working as specialised
agents with written rules: no invented data, every number with a source or a label, independent science and security
reviews. Roberto chose the problem, the place and the scope and made every class A decision, including the Severe
threshold and the replay window. Full log: docs/SI_USE_LOG.md. <AI video tools: pending, Roberto>

## Sources
NASA GES DISC (IMERG Early, GLDAS), NASA LaRC POWER, NASA LP DAAC and OpenTopography (SRTM), NASA GIBS, Copernicus
Sentinel-2 via Element 84 Earth Search, OpenStreetMap contributors, FAO-56, El Universo, Teleamazonas, Extra,
Primicias, Agrocalidad, and the agronomy papers listed in docs/CITATIONS.md with URLs and access dates.

## Links
- App: <app URL>
- Demo video: <video URL>
- Code: <repository URL>
- Judge quick start: docs/guide/judge-quickstart.md
