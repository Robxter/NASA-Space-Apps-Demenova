# Demenova — Project Specification

Nov 14, 2026 · @Roberto Teran

## What changed in update 2

Seven sections are new and eight were updated; their headings carry a · New or · Updated tag so you can spot them while scrolling. Remove the tags once you have read them.

| Section | Type | What changed |
| --- | --- | --- |
| Whole doc | Updated | Project and team renamed from Omnimeter to Demenova |
| Pitch angle | New | Judge's verdict on your global-data idea, framing fix, pitch lines, two-country proof |
| Team notes | New | Your notes kept verbatim, each pointing to its answer |
| Stack | New | Verdict on GitHub, Render, Supabase; PWA stack; Android-first, Apple-like design; performance budget |
| Email alerts | New | Resend step by step, code, Gmail fallback, Claude Code prompt |
| Data flow diagram | Updated | Redrawn with GitHub Actions, Supabase, Render and Resend; caption updated |
| Screens | New | Each screen top to bottom, navigation, Farm setup |
| Demo farm | New | Synthetic demo farm near Machala, farm and lot fields |
| Weekend plan | Updated | Rebuilt around the 7-hour Spain–Costa Rica gap, night shift, handoff rule |
| Submission | Updated | Deadline in Spain time; video direction now a product-launch film |
| Claude Code | Updated | ECC harnessed selectively, workflow table, Graphify, frontend-design, new CLAUDE.md; ECC and Graphify marked installed |
| Tyson's questions | Updated | Two new questions: real farm data and his test phone |
| Sources | Updated | Graphify and frontend-design added |

**Update 3 (Tyson's answers).** Open questions now hold his answers plus researched ones; the agronomic thresholds, a new paragraph of agronomic rules in the risk engine, a biosecurity angle in the pitch, the demo flood (22–23 February 2026, Buenavista river), the demo farm location and the test phone were updated to match.

**Update 4 (zero-data promise and science).** New sections: Data modes (levels 0 to 3, exact lot input, flood memory, records by default, two modes), Prediction science (14 methods with formulas, sources and limits) and Alert channels (email, Telegram, why not WhatsApp). Scope, onboarding and Alerts screens, and the risk engine were updated to match.

## Verdict: the project is already defined, lock it now

Demenova has been defined since the end of October; today's ideas (farm dashboard, prediction engine, weighted alerts, email) describe the same product from the user's side. Two things change: the demo moves to Machala, El Oro, Ecuador, and the alert engine becomes an explicit, weighted system. Stop ideating after this doc and start building.

**Definition.** Demenova is a mobile-first farm dashboard that turns NASA Earth observations into near-real-time waterlogging and flood alerts, a field-condition history, and a comparison of soil-management strategies per lot, for banana plantations in coastal El Oro, Ecuador.

**Angle.** Water. Banana roots rot when the water table sits at root level, and lowland farms flood when Andean rivers carry rain that fell upstream hours or days earlier. Demenova sees that upstream rain from space and warns before the water arrives.

**How it answers the challenge.** Banana is perennial and is not rotated like annual crops, so the pitch states it plainly: in perennial crops, rotation becomes soil management. Each risky lot gets the current management compared with two alternatives, as the challenge requires.

**Why Machala.** Ecuador is the world's largest banana exporter and El Oro is one of its core banana provinces. Its coastal lowlands sit below Andean watersheds such as the Jubones river, which makes the upstream-rain warning story concrete. Confirm with Tyson that this is the farm area he knows.

## Pitch angle: NASA data, global by design · New

Judge's verdict: keep it, it is one of the strongest lines in the pitch. Most teams will build on the challenge's US datasets; a pipeline that runs entirely on global data and lands on a South American farm proves the reach of NASA's open science in a way judges remember.

**One correction in the framing.** NASA is a US agency, so don't say it "isn't US-only". Say its Earth observations are open and global: built in one hemisphere, useful in every field on the planet. That is accurate and lands better.

**Pitch lines to choose from.**

- From orbit to the root zone.
- Satellites from the North, solutions for the South.
- Space science serving one of humanity's oldest activities: growing food.

**Prove it, don't just say it.** Because every input is global, the same pipeline works for any farm on Earth by changing the area of interest. If time allows, run it once for Tyson's region in the Caribbean lowlands of Costa Rica and show both maps side by side for three seconds of the video: two countries, one pipeline, zero US-only data.

**Biosecurity angle.** The demo flood carries a second story: according to Primicias, the February 2026 floods partly compromised the containment of Fusarium Tropical Race 4, detected in December 2025 on a farm in Santa Rosa, El Oro. In El Oro, knowing where water goes is also knowing where soil-borne disease can travel.

## Data modes: from zero data to full data · New

Demenova works for a farm that tracks nothing and gets sharper with every piece of data a farm adds. Farms without records, whether because of cost, missing staff or outdated practices, are the ones floods catch by surprise; our apparent weakness, a demo farm with no data, becomes the product's core promise.

**Pitch lines.** "No sensors. No records. No problem." · "Built for the farms that track nothing, because those are the ones floods surprise."

| Level | What the farm gives | Map | Alerts | Strategies | Confidence badge |
| --- | --- | --- | --- | --- | --- |
| 0 | A pin | Regional view | Upstream flood warning, regional rain and soil moisture | Regional defaults from Tyson's table, labelled as defaults | Low |
| 1 | Farm outline | Automatic risk zones from terrain wetness | Per zone | Per zone, defaults adjusted by zone wetness | Medium-low |
| 2 | Lots, drawn, imported or typed | Per lot | Per lot | Per lot, using lot attributes such as drainage, plant age and cover | Medium |
| 3 | Field notes: soil analyses, water table readings, past floods, management dates | Calibrated per lot | Thresholds calibrated to the farm | Per lot, tuned to its history | High |

**Precise data whenever the farm has it.** At any level, the user can replace automatic zones with exact lots: draw them on the map, import coordinates (GeoJSON, KML or CSV), or type dimensions, areas and planting dates. Provided data always overrides estimates, and every value is stored with its origin (estimated, provided or observed) so the app and the confidence badge know what they rest on.

**Flood memory.** Farms without records still remember. The farmer marks past floods on a timeline (date or month, which part of the farm, how many days the water stayed), and Demenova checks each against the satellite record to calibrate its thresholds for that farm (Prediction science, verification).

**Records by default.** Every rainfall total, soil-moisture reading, alert and action is saved automatically and exportable as CSV. After one season, a farm that never kept records has a history it never had: "Demenova keeps the records you never had time to keep."

**Two modes.** Farmer mode: one status, one alert, one recommended action, plain Spanish, large text. Agronomist mode: full detail, factors, history and several farms.

**Evidence.** Tyson's family farm is the founding case. Tyson documents in his doc why farms like his keep little or no data; the pitch claims no statistics without a source.

## Team notes and pending activities · New

Kept exactly as written by the team; each one is answered in the section named after it.

- We yet have to define the stack, which has to be most of all, preserve a good UX and UI design, develop a fast and low requirement yet refined frame, apple like design and app flow. And its backend has to be fast, low memory and optimized for every type of device and browser that comes their way. Has to have a strong focus on Android devices, as it is the strongest sector in Latin America which can also be the leading OS in Agricultural management, dont leave iOS behind tho because it can be definitive for judge review as in the US most devices are iOS devices. *(Answered in Stack and deployment.)*
- I dont know if Tyson has lot detail and farm data from his existing farm, but if he hasnt we have to create demo-default data of a theorical farm in coastal zone near of what we defined which can be modified with any kind of farm data with the fields we have yet to specify. *(Answered in Demo farm data.)*
- Screens of the app. *(Answered in Screen specifications.)*
- Help with the email sending thing, because I dont know how to send emails using the tools I have so Claude Code and you have to solve it. *(Answered in Email alerts.)*
- I like the diagram you make, but if you didnt take into account the latter I mentioned, I would like you to take into account. *(System data flow redrawn with the stack.)*
- Proposed stack for management and deployment of the app: GitHub for hosting the frontend, files of the project both front and back; Render for deployment of both front and back; Supabase for database logging and management; GitHub for branch and development online tracking in joint with local Git. *(Answered in Stack and deployment.)*
- This Claude account for product and brainstorming, product specification and management.
- The official project and team name is now Demenova: Deme from Demeter, Nova from the explosion of the star.
- Project submission opens on the 14th of Nov Spain hour and closes at 15th Nov 11:59pm Spain hour. *(Applied in Submission checklist.)*
- When I meant by NASA OFFICIAL, I meant to make the demo look professional and cool like if it was made from a professional company and not a boring project science fair slideshow. *(Applied in Submission checklist.)*
- I will not skip ECC, I want you to harness that and give resumed instructions alongside Graphify and suggested design Claude tools plugins. *(Answered in Claude Code setup.)*

## Problem and users

Banana farms lose plants and money to water they could have seen coming. Tyson's field experience names four problems, and Demenova targets the first two directly:

1. **Waterlogging.** Water held at root level rots roots and favours fungal disease.
2. **River overflow.** Rain in the highlands reaches lowland lots hours or days later, with no warning today.
3. **Temperature stress.** Cool periods slow growth and reduce bunch size.
4. **Lost field days.** Drone spraying fails in strong sun or any drizzle, wasting transport costs.

**Primary user.** The agronomist who advises small, medium and large producers and reads the data on their behalf.

**Secondary user.** The producer, who needs a simple status and an alert on the phone.

**Constraints from the field.** Connectivity ranges from fair to none, so the app is phone-first and works on cached data. Trust comes from history: users want the last week, month and three months compared with earlier years. Adoption barriers are lack of information and demonstration, labour cost, staff shortages, and access to bio-inputs in the area.

**Value proposition.** Your farm's water risk, from space, in your pocket: an early warning before the flood, and an explained choice of what to do with each lot after it.

## Solution overview

Demenova is three modules sitting on one alert engine. The engine scores every lot on every data update; the modules show the score, its history and what to do about it.

| Component | Question it answers | Main inputs | Output |
| --- | --- | --- | --- |
| Alert engine | How serious is the water situation on each lot right now? | Upstream and local rain, soil wetness, terrain wetness, water balance | Risk index 0 to 1, severity level, top contributing factors, email on Severe |
| Module 1: Water risk | Where and when will my lots flood or stay waterlogged? | GPM IMERG, SMAP, GLDAS, SRTM | Lot risk map, upstream flood warning, month-by-month risk calendar |
| Module 2: Field history | How have conditions changed this week, month and quarter? | GPM, SMAP, NASA POWER, ECOSTRESS, Landsat/Sentinel-2 NDVI | Charts against prior years for rain, soil moisture, temperature, crop greenness |
| Module 3: Soil strategies | What should I do with this lot? | Lot risk profile, Tyson's practice table, farmer priorities | Current management versus two alternatives, each with reasons, evidence, benefits, gaps and risks |

**Prediction, defined honestly.** Demenova predicts in two ways that the data supports. Short term, observed upstream rain forecasts lowland flooding hours to days ahead. Seasonal, years of history give each lot a month-by-month risk calendar. It does not forecast tomorrow's weather; that would need a separate forecast service, kept out of the core.

## Agronomic and hydrological foundation

The tool rests on four well-established ideas; Tyson supplies the crop-specific thresholds that turn them into decisions.

**1. Daily water balance.** Soil gains water from rain and loses it to evapotranspiration and drainage. When the balance stays positive for several days on poorly drained ground, the water table rises toward the roots.

```latex
\Delta S_t = P_t - ET_t - D_t
```

P = rainfall (GPM IMERG), ET = evapotranspiration (ECOSTRESS, NASA POWER), D = drainage, estimated from soil and terrain. A running sum of ΔS over 3 to 7 days is the waterlogging pressure.

**2. Topographic wetness index (TWI).** Satellite rain and soil-moisture pixels are kilometres wide; terrain explains where water collects inside one farm. Low, flat cells with a large uphill area draining into them flood first. Computed once from SRTM at 30 m.

```latex
TWI = \ln\left(\frac{a}{\tan\beta}\right)
```

a = upslope contributing area per unit contour width, β = local slope.

**3. Upstream travel time.** Rain over the Andean part of a watershed reaches the lowlands after a delay. Summing IMERG rainfall over the upstream catchment for the last 24, 48 and 72 hours gives the flood warning; the catchment outline comes from SRTM. The exact delay for the demo river is calibrated against a past flood.

**4. Soil management instead of rotation.** Banana lots run on a fixed harvest cycle, so the levers are management practices, defined by Tyson. Candidates from his answers: living cover with maní forrajero (Arachis pintoi, a legume that also fixes nitrogen), timing of mycorrhizae and mountain microorganism (MM) drench applications, and drainage work.

**Thresholds, now set.** Banana tolerates at most 2 days of waterlogging and its roots sit at 70 cm (Tyson), so a water table above 70 cm for 2 days is the damage line. Black Sigatoka pressure rises with mean temperature above 23 °C, relative humidity above 75% and wet leaves, and falls below 70% humidity (sources in Open questions).

**Local check, resolved.** In Machala the cool season runs roughly July to mid-November, with August the coldest month; producers report that nights near 20 °C slow fruit filling and delay harvest. Cold stress applies in El Oro, but mid-year rather than at year-end as in Costa Rica.

## Prediction science: methods and sources · New

Demenova invents no science: it chains fourteen established methods, each checked against its source below, and calibrates them on documented floods. The claim to judges is a transparent, sourced pipeline that caught the February 2026 flood in replay, not a validated accuracy figure.

**How the methods chain.**

1. Terrain: fill depressions, route flow with D8, outline the catchment, compute TWI zones.
2. Upstream: IMERG rain over the catchment becomes runoff through the Curve Number method, and arrives after a travel time first estimated with Kirpich, then calibrated on the February 2026 event.
3. On the farm: rain, the antecedent precipitation index and SMAP give saturation; FAO-56 evapotranspiration removes water; the daily balance per zone gives waterlogging pressure and the 2-day rule.
4. Side indicators: leaf wetness and the Sigatoka favourability rule; banana heat units for cold stress; NDVI for greenness.
5. Weights come from Tyson's pairwise judgments (AHP); thresholds are calibrated against flood memory and documented floods with verification scores.

| # | Method | Used for | Formula or rule | Source | Limits |
| --- | --- | --- | --- | --- | --- |
| 1 | Depression filling and D8 flow direction | Catchment outline, flow paths, flow accumulation | Pits filled first; each cell drains to its steepest of 8 neighbours | O'Callaghan & Mark 1984; Jenson & Domingue 1988 ([overview](https://richdem.readthedocs.io/en/stable/flow_metrics.html), [Jenson & Domingue](https://lists.osgeo.org/pipermail/grass-user/attachments/20111207/0d4ac229/Jenson_Domingue_1988_EROS.pdf)) | Single flow direction handles flat lowlands poorly |
| 2 | Topographic wetness index | Risk zones inside the farm | TWI = ln(a / tan β) | Beven & Kirkby 1979 ([history of TOPMODEL](https://hess.copernicus.org/articles/25/527/2021/hess-25-527-2021.html)); Sørensen et al. 2006 ([HESS](https://opac.geologie.ac.at/ais312/dokumente/copernicus.org/hess-10-101-2006.pdf)) | Values change with DEM resolution and method (Quinn et al. 1995), so lots are ranked within the farm |
| 3 | Curve Number runoff | Runoff from upstream rain | Q = (P − Ia)² / (P − Ia + S), Ia = 0.2S, S = 25400/CN − 254 (mm) | USDA NRCS, NEH Part 630 ch. 10, 2004 ([PDF](https://mail.irrigationtoolbox.com/NEH/Part630_Hydrology/H_210_630_10.pdf)) | Built from US watersheds; CN chosen from cover and soil, so it is calibrated |
| 4 | Kirpich time of concentration | First estimate of upstream-to-farm travel time | tc (min) = 0.0195 L^0.77 S^−0.385; L in m, S in m/m | Kirpich 1940 ([Civil Engineering Journal](https://www.civilejournal.org/index.php/cej/article/download/2027/pdf/5760)) | Derived on small, steep agricultural watersheds in Tennessee; first guess only, replaced by the observed February 2026 lag |
| 5 | Antecedent precipitation index | Soil wetness from rain history; fills SMAP gaps | APIₜ = Pₜ + k · APIₜ₋₁, k between 0.85 and 0.98, 0.90 common | Kohler & Linsley 1951 ([NWS](https://www.weather.gov/media/owp/oh/hrl/docs/23apislc.pdf), [Copernicus](https://egusphere.copernicus.org/preprints/2025/egusphere-2025-4608/egusphere-2025-4608-AC1-supplement.pdf)) | k is site-specific |
| 6 | FAO-56 Penman–Monteith and crop coefficient | Water leaving the soil | ETc = Kc × ETo; banana basal coefficient at mid-season about 1.05 in year one (Table 17) | Allen et al. 1998, FAO-56 ([FAO](https://www.fao.org/3/x0490e/x0490e0c.htm)) | Tables assume sub-humid, standard conditions |
| 7 | Daily soil water balance | Waterlogging pressure and the 2-day rule | ΔS = P − ETc − D, summed over days | FAO-56 ([contents](https://www.fao.org/3/X0490E/x0490e00.htm)) | Drainage D is estimated from terrain and drainage class |
| 8 | Leaf wetness from humidity | Hours of wet leaves | Hours with relative humidity ≥ 90%, from NASA POWER hourly data | Sentelhas et al. 2008 ([CNR](https://explore.cnr.it/resource/item/58890)) | Over- or underestimates by site; local thresholds improve it |
| 9 | Sigatoka favourability | Sigatoka Watch | Mean temperature > 23 °C with humidity > 75% favourable; humidity < 70% unfavourable | [TEC Costa Rica](https://revistas.tec.ac.cr/index.php/agroinn/article/download/6503/6351); [Atena](https://atenaeditora.com.br/catalogo/dowload-post/77675); [UNAD](https://hemeroteca.unad.edu.co/index.php/riaa/article/download/970/953/1143) | Thresholds from other banana regions; Tyson validates |
| 10 | Banana heat units | Cold stress | Daily units = mean temperature − 14 °C; weekly sum compared with the same week's climatology | Ganry & Meyer 1975 ([Taylor & Francis](https://informahealthcare.com/doi/full/10.1080/07060661.2013.870931)); [CORBANA](https://www.corbana.co.cr/wp-content/uploads/HD-n.°-1-2011Unidades-de-calor.pdf): 14 °C growth, 16 °C development, 34 °C upper limit | Base varies by variety, 13.9 to 17 °C in new hybrids ([Umber et al. 2011](https://agritrop.cirad.fr/559687/)) |
| 11 | NDVI | Greenness history | (NIR − Red) / (NIR + Red) | Rouse et al. 1973–74, NASA ERTS symposium ([reference](https://docs.disasterscharter.org/services/spectral-index/service-specs/)) | Clouds block optical images in the tropics |
| 12 | NDWI, optional | Standing water after a flood, when cloud-free | (Green − NIR) / (Green + NIR) | McFeeters 1996 ([cited in RJAS](https://www.rjas.ro/download/paper_version.paper_file.94fdfb5b070857a5.QmFkYWx1dGEucGRm.pdf)) | Needs a clear image right after the flood |
| 13 | Analytic hierarchy process | Alert weights from Tyson's judgments | Pairwise matrix, principal eigenvector; CI = (λmax − n)/(n − 1), CR = CI/RI, accepted if CR ≤ 0.10 | Saaty 1980 ([Saaty](https://www.isahp-org.creativedecisions.net/uploads/1-how-to-make-a-decision-the-analytic-hierarchy-process-t-l-saaty.pdf)) | Only as good as the expert's judgments, which are recorded |
| 14 | Forecast verification | Calibrating thresholds on flood memory and documented floods | POD = hits/(hits + misses); FAR = false alarms/(hits + false alarms); CSI = hits/(hits + misses + false alarms) | NCAR DTC, [MET User's Guide](https://metplus.readthedocs.io/projects/met/en/develop/Users_Guide/appendixC.html); [DTC](https://dtcenter.ucar.edu/plots/hwt/traditional_eval.php) | Few events, so report counts, not percentages; POD alone rewards over-warning |

The engineering choices layered on top (hysteresis, two-update confirmation, the Stale state) are design decisions, not scientific claims, and the doc labels them as such.

## Data architecture

Half of the published resources are US-only and will return nothing for Ecuador; build only on global datasets. Resolutions and latencies below are approximate, from memory; verify each when you download it.

| Dataset | Gives | Resolution (approx.) | Update lag (approx.) | Role in Demenova |
| --- | --- | --- | --- | --- |
| GPM IMERG (Early run) | Rainfall | 0.1° (\~11 km), 30 min | Hours | Alert trigger: upstream and local rain |
| SMAP | Surface soil moisture | 9–36 km | 1–3 days | Soil saturation indicator |
| GLDAS | Modelled soil moisture by depth, runoff | 0.25° | Weeks | Root-zone wetness history, gap filling |
| SRTM | Elevation | 30 m | Static | TWI, watershed outline, lot-level detail |
| NASA POWER | Temperature, humidity, radiation, wind | \~0.5° | Days | Water balance, cold and heat stress, history |
| ECOSTRESS | Land-surface temperature, ET | \~70 m | Irregular overpasses | Field-level heat and water demand |
| Landsat / Sentinel-2 | NDVI, bare soil | 30 m / 10 m | Days, cloud-limited | Crop greenness history |
| MODIS / VIIRS | NDVI, vegetation stress | 250–1000 m | Daily | Greenness when finer imagery is cloudy |
| GRACE / GRACE-FO | Groundwater storage anomaly | Hundreds of km | Months | Regional context only, never lot-level |
| ERA5 (ESA partner) | Hourly climate reanalysis | 0.25° | \~5 days | Backup for gaps in POWER |
| FAO GAEZ | Crop suitability, soil constraints | \~1–10 km | Static | Sanity check for alternative crops |

**Skip for Ecuador (US coverage only):** Web Soil Survey, SSURGO/STATSGO2, CDL CropScape, PRISM, NAIP, NLCD, NLDAS, CoCoRaHS, NWIS, OpenET, LANDFIRE, USDA AMS Market News, NASS QuickStats. For soil properties, ISRIC SoilGrids is a global non-NASA option; cite it if used.

**"Real-time" in the pitch = near-real-time.** IMERG rain arrives within hours, which is what fires the alert. Everything else lags by days, so every number in the app shows its "updated X ago" time.

**Pipeline.**

1. **Area of interest.** Draw a box around the demo farm area near Machala plus its upstream catchment; delineate the watershed from SRTM.
2. **Download.** Python with earthaccess (NASA login), xarray, rasterio; POWER through its API.
3. **Harmonize.** Resample every layer to one 30 m grid on the SRTM base, as the challenge suggests; keep coarse layers as coarse values, never invented detail.
4. **Features.** Per lot and per day: upstream rain 24/48/72 h, local rain 24 h, soil saturation percentile, 7-day water balance, TWI.
5. **Score.** Run the alert engine; write results as JSON and GeoJSON.
6. **Serve.** A static mobile web app reads the precomputed files, so it loads fast on weak connections and works offline from cache.
7. **Replay mode.** For the demo, replay a past flood day by day from the stored data. Live polling of IMERG is a bonus, not a dependency.

## Stack and deployment · New

Judge's verdict on your proposal: GitHub, Render and Supabase are the right trio, with one rule. The app a judge opens must never wait on a sleeping server, so the frontend is a static site that reads data directly, and the backend only does background work.

| Layer | Choice | Why | Watch out |
| --- | --- | --- | --- |
| App type | Progressive Web App (PWA) | One codebase for Android and iOS, installable to the home screen, works offline, no app store | iOS installs via Safari's Share, Add to Home Screen; test it on an iPhone once |
| Frontend | Vite + React + TypeScript + Tailwind | Strongest tooling in Claude Code and ECC; fast builds; small output | Keep to the performance budget below |
| Map | Leaflet + NASA GIBS imagery tiles | Lightweight and touch-friendly; GIBS is NASA's own tile service, which adds visibility | Cite GIBS and the base map provider |
| Charts | uPlot | Tiny and very fast for time series on low-end phones | Plain styling; theme it to match |
| Offline | vite-plugin-pwa (Workbox) | Caches the app shell and the last data | Show "offline, data from …" when cached |
| Database | Supabase (Postgres) | Farms, lots, daily features, alerts, email log; instant REST API | Public read-only access for demo tables via row-level security; service key only on the server |
| Scheduled pipeline | GitHub Actions on a schedule | Free on public repos; runs the Python pipeline hourly and writes to Supabase | Scheduled runs can start late; replay mode never depends on them |
| Backend | Python FastAPI on Render | Same language as the pipeline; handles email and manual re-runs | Free web services sleep when idle and wake slowly; nothing the judge sees may depend on it |
| Frontend hosting | Render Static Site | Served from a CDN and does not sleep | Connect it to the GitHub repo for auto-deploy on push |
| Code | GitHub + local Git | Branches per block: data, engine, app | Secrets only in Render and GitHub encrypted secrets, never in the repo |

**Apple-like design on Android-first hardware.**

- System fonts (San Francisco on iPhone, Roboto on Android): native feel on both, zero font download.
- Bottom tab bar, large titles, cards with soft borders, 8-point spacing grid, light and dark mode.
- Motion only on state changes (a lot turning red), never decorative.

**Performance budget, checked before submitting.**

- Initial JavaScript under about 150 KB compressed.
- Usable in under 3 seconds on a mid-range Android phone over 4G; test with Chrome DevTools throttling.
- Lighthouse mobile performance score of 90 or more.
- Works on current Chrome for Android, Samsung Internet and Safari on iOS. Test device: Tyson's Samsung Galaxy A55, an upper mid-range phone, plus Chrome CPU and network throttling to mimic cheaper ones.

## Risk engine and weighted alerts

The engine is a weighted scoring model, the same logic as a business decision matrix: normalize each indicator to 0–1, weight it, sum it. It is simple, explainable to judges, and every alert can say which factor drove it.

```latex
W_{lot,t} = \sum_i w_i \, x_{i,lot,t} \qquad \sum_i w_i = 1
```

| Indicator x | Source | Normalized as | Starting weight w |
| --- | --- | --- | --- |
| Upstream rain, last 24–72 h | GPM IMERG over the catchment | Percentile against the lot's own history | 0.35 |
| Soil saturation | SMAP, GLDAS | Percentile against history | 0.25 |
| Terrain wetness | SRTM TWI | Rank within the farm | 0.20 |
| Local rain, last 24 h | GPM IMERG over the farm | Percentile against history | 0.10 |
| 7-day water balance | Rain minus ET (POWER, ECOSTRESS) | Percentile against history | 0.10 |

The weights are starting values, not findings. Tune them with Tyson so the past demo flood scores Severe on the right lots and the right day, and say so in the pitch.

**Severity levels.**

| Level | Index W | App behaviour |
| --- | --- | --- |
| Normal | below 0.40 | Green status, no notification |
| Watch | 0.40–0.60 | Yellow badge on the lot |
| Warning | 0.60–0.80 | Orange banner on the home screen |
| Severe | 0.80 and above | Red banner and email to the agronomist |

**Anti-noise rules.** Escalate to Severe only when two consecutive updates agree, so one noisy rain estimate does not trigger an email. De-escalate only when W falls 0.10 below the level's threshold (hysteresis). Mark the lot Stale when its newest rain data is older than 12 hours; stale lots never send emails.

**Agronomic rules on top of W.** Two consecutive days with a positive water balance on a lot in the top terrain-wetness third set a floor of Warning, matching the 2-day tolerance. Two side indicators run beside W and appear on Lot detail, never in the email: Sigatoka pressure (Watch after 3 consecutive days with mean temperature above 23 °C, humidity above 75% and rain) and cold stress (7-day mean below 23 °C). The 3-day and 23 °C values are proposals awaiting Tyson's validation; NASA POWER supplies temperature and humidity.

**Indicators, upgraded by Prediction science.** Upstream rain enters as Curve Number runoff with a calibrated lag; local wetness uses the antecedent precipitation index where SMAP is missing; the balance uses FAO-56 crop evapotranspiration. The starting weights above are replaced by AHP weights from Tyson's pairwise judgments (accepted at CR ≤ 0.10), and thresholds are calibrated with POD, FAR and CSI against documented and remembered floods.

**Explanation on every alert.** Each alert lists its top two contributing factors with their share of W, for example "upstream rain 62%, soil saturation 21%", plus the data timestamps.

**Strategy scoring uses the same idea.** In Module 3, the farmer sets priority weights (soil health, water, cost, labour). Each strategy's criterion scores come from Tyson's practice table; the strategy score is the priority-weighted sum, shown next to its reasons, gaps and risks.

**Email.** In the demo, Severe generates the email shown on screen; sending it through a transactional email service is a bonus.

## Email alerts: how to send them · New

Use a transactional email service called through its web API from the Python backend; it is about 20 lines of code and Claude Code can write all of it. Plan A is Resend; Plan B is Gmail with an app password.

**Plan A: Resend.**

1. Create a free Resend account and an API key.
2. Without a domain of your own, Resend's test sender delivers only to the email address of your Resend account. That is enough for the demo: send the alert to yourself and film it arriving. With a domain you own, verify it in Resend to email anyone. Check Resend's current docs for the exact limits.
3. Save the key as `RESEND_API_KEY` in Render's environment variables and in GitHub's encrypted secrets. Never in the code.
4. Send only on a confirmed transition into Severe, once per lot per Severe episode: log every send in Supabase `email_log` with lot, episode start, status and provider id, and skip a send that already exists.

```python
import os, requests

def send_severe_email(to: str, lot: str, w: float, factors: str, updated_at: str) -> str:
    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}"},
        json={
            "from": "Demenova Alerts <onboarding@resend.dev>",
            "to": [to],
            "subject": f"SEVERE flood risk / Riesgo SEVERO: {lot}",
            "html": f"<p>Lot {lot} reached Severe (W = {w:.2f}).</p>"
                    f"<p>Main factors: {factors}</p>"
                    f"<p>Data updated: {updated_at}</p>",
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["id"]
```

**Plan B: Gmail SMTP.** Turn on 2-step verification on a Gmail account, create an app password, and send with Python's built-in `smtplib`. It reaches any address without a domain, but is less reliable for volume; fine for a demo.

**Prompt for Claude Code.** "Add an email module to the FastAPI backend: send\_severe\_email via Resend's API using RESEND\_API\_KEY from the environment; call it only when a lot transitions into Severe; deduplicate per lot and episode using the Supabase email\_log table; add a protected /email/test endpoint that requires an X-Admin-Token header; never log the API key."

**In the video.** Show the lot turning red in replay, then the phone receiving the email: two seconds that prove the system acts, not just displays.

## Alert channels: email and Telegram · New

Email ships first, a Telegram bot is the second channel, and WhatsApp goes on the roadmap with the reason stated in the video and the docs.

| Channel | Setup | Constraint | Status |
| --- | --- | --- | --- |
| Email (Resend) | API key, as in Email alerts | Without a domain, the test sender reaches only your own account's email | Must have |
| Telegram bot | Free; one chat with @BotFather gives a bot token; alerts are plain HTTPS calls ([Telegram](https://core.telegram.org/bots)) | Bots cannot start conversations: the farmer opens the bot and presses Start once ([Telegram](https://core.telegram.org/bots)) | Nice to have, after email |
| WhatsApp Business Platform | Meta business account and message templates | Business-initiated messages need pre-approved templates and prior opt-in; scaling past the initial limit requires business verification and display-name approval ([tyntec](https://www.tyntec.com/helpcenter/docs/channels/whatsapp-business/message-templates/message-types/)) | Roadmap |

**Why not WhatsApp, for the video and the docs.** "WhatsApp is where most of our farmers chat, but Meta requires a verified business, pre-approved message templates and opt-in before any alert can be pushed: no team can clear that in a hackathon weekend. Telegram's bot platform is free and open to any developer in minutes. The trade-off is reach, since fewer farmers have Telegram installed, so email stays the default and WhatsApp is the first item on our roadmap."

**Telegram onboarding.** The Alerts screen shows a QR code and a link of the form t.me/\<bot>?start=\<farm code>. When the farmer presses Start, the bot saves their chat id against the farm in Supabase and confirms in Spanish. From then on it mirrors the email: Severe alerts only, plus an optional daily summary. Commands such as /estado return the farm status.

**Prompt for Claude Code.** "Add a Telegram channel to the FastAPI backend: TELEGRAM\_BOT\_TOKEN from the environment; a webhook that handles /start with a farm code and stores the chat id in a Supabase telegram\_subscribers table; send\_severe\_telegram reusing the email's deduplication per lot and episode; an /estado command returning farm status in Spanish; never log the token."

## System data flow · Updated

&#91;embedded content: system data flow · sources to phone\]

Global satellite layers are harmonized onto one 30 m grid, scored per lot by the alert engine in an hourly GitHub Actions run, stored in Supabase and read directly by the phone app; the Render backend only sends Severe emails, so nothing a judge opens waits on a sleeping server; Tyson's table sets the thresholds and supplies the strategy options. The step-by-step user flow is in the UI section below.

## Backend state machine

&#91;embedded content: alert state machine per lot · 5 states\]

The gap between each escalation and de-escalation threshold (0.10) is the hysteresis that stops a lot flickering between levels; the two-update rule for Severe stops a single noisy rain estimate from emailing anyone.

**Pipeline run, one cycle per data update.** Idle, then Fetching (new IMERG and other files), Processing (harmonize, features), Scoring (alert engine, state transitions above), Publishing (write JSON, send any Severe emails), back to Idle. Any failure moves the run to Degraded: the app keeps serving the last good files, and lots whose data ages past 12 hours turn Stale.

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

## Demo farm data · New

Tyson confirmed there is no real lot data, so we ship a default demo farm: real satellite data over real plantation land near Machala, with synthetic farm attributes clearly labelled "demo farm" in the app. Judges reward that honesty; any user can replace it through Farm setup.

**Building the demo farm.** Open satellite imagery around Pasaje along the Buenavista river, pick an area of visible banana plantation that the February 2026 flood reached, and draw about 8 lots of roughly 5 to 7 ha each, some on low flat ground and some higher, so the risk map shows contrast. Tyson reviews the attributes when he wakes.

**Farm fields.**

| Field | Type | Demo value |
| --- | --- | --- |
| name | text | Finca Demo El Oro |
| location | lat, lon | Plantation area in Pasaje canton along the Buenavista river, next to Machala |
| crop, variety | text | Banana, Cavendish (Tyson to confirm the local variety) |
| river, catchment | text, polygon | Nearest river and its upstream catchment from SRTM |
| alert\_email | email | Your own address for the demo |

**Lot fields.**

| Field | Type | Why the tool needs it |
| --- | --- | --- |
| lot\_id, name | text | Identity on map and lists |
| boundary | GeoJSON polygon | Places the lot on the 30 m grid |
| area\_ha | number | Totals and costs per lot |
| plant\_age\_months | number | Tyson listed banana age as key field knowledge |
| drainage\_class | good, moderate, poor | Adjusts waterlogging risk alongside terrain wetness |
| drainage\_works | none, ditches, other | Input to drainage strategies |
| cover\_crop | none, maní forrajero, other | Input to soil strategies |
| last\_soil\_analysis | date, pH, organic matter % | Context for strategy evidence |
| nematode\_incidence | low, medium, high | Tyson listed it as ground knowledge satellites can't see |
| disease\_notes | text | Same |
| bioinputs | last mycorrhizae and MM drench dates | Timing in strategies |
| water\_table\_reading | depth in cm, date (optional) | Calibrates the model when available |

**Format.** One `farm.json` with the farm and its lots for the app; the same fields as Supabase tables `farms` and `lots`; CSV import uses the lot field names as column headers.

## Scope

The demo wins on one convincing story: the 22–23 February 2026 Buenavista river flood into banana farms in Pasaje, next to Machala, replayed day by day, with Demenova warning before the water arrived. Everything else serves that story.

**Must have.**

- Precomputed data for the demo area and the February 2026 flood.
- Alert engine with the four levels and contributing factors.
- Data levels 0 to 2: pin, outline with automatic risk zones, and exact lots drawn, imported or typed, with the confidence badge.
- Home, Risk map with replay, Lot detail.
- Strategies screen with three options per lot, labelled as regional defaults at levels 0 and 1.
- Email on Severe.
- Records saved by default.
- Public link to the working app.

**Nice to have.**

- Telegram bot.
- Flood memory timeline.
- Farmer and agronomist mode toggle.
- Level 3 field notes.
- Priority sliders that re-rank strategies.
- Spanish and English toggle.
- Second-country map (Costa Rica) for the global proof.
- Live IMERG polling.
- Drone spraying window indicator.

**Out of scope.** Hardware, user accounts, weather forecasts, exact water table depth in centimetres, coverage beyond the demo area.

**Cut order if time runs short.** Drop in this order: spraying indicator, live polling, second-country map, priority sliders, Telegram, level 3 notes, flood memory, mode toggle, language toggle. Never cut the flood replay, the strategy comparison or zero-data onboarding: the first is the demo, the second is the challenge requirement, the third is the promise.

## Weekend plan and roles · Updated

The time difference is your advantage: Costa Rica is 7 hours behind Spain, so Tyson works while you sleep and the project moves almost around the clock. The deadline, 23:59 Spain time on November 15, is 16:59 in Costa Rica. Day 1 hours count from now; day 2 times are Spain time.

| Block | When | You (build) | Tyson (domain + docs) |
| --- | --- | --- | --- |
| 1. Setup and data | Day 1, now to +3 h | Repo, ECC, Graphify, frontend-design; SPEC.md and CLAUDE.md; demo farm lots; IMERG, SRTM and TWI for the area | Asleep |
| 2. Engine, together | Day 1, +3 h to +7 h | Alert engine and calibration on the flood date he gives you; Supabase tables | Answers the open questions; practice table, three strategies, demo farm attributes |
| 3. Handoff | Before you sleep | Deploy a preview; write HANDOFF.md with what to test and write | Reads the handoff |
| 4. Night shift | Your 4–6 h of sleep | Asleep | Tests the preview on his Android phone and logs issues in GitHub; drafts the project page in English; writes Learn cards in Spanish and English; drafts the 30-second script |
| 5. Build | Day 2, morning | Fix his issues, Strategies screen, email, Home polish | Asleep (early morning in Costa Rica) |
| 6. Freeze | Day 2, 15:00 | Feature freeze, Lighthouse check, README with citations | Final read of the project page and SI-use description |
| 7. Demo | Day 2, 15:00–19:00 | Screen recordings, edit the video | Voice-over or subtitles, checks the agronomy in the story |
| 8. Submit | Day 2, by 20:00 | Final checks and submit | Confirms on his side; 4 hours of buffer remain |

**Handoff rule.** Nothing waits on a live conversation: every block ends with a written note (HANDOFF.md in the repo, or comments in this doc) saying what is done, what is next and what needs the other person.

Tyson does not need to code: his table, thresholds, strategies and writing are what make the tool credible to judges.

## Submission checklist · Updated

Submission closes Sunday, November 15 at 23:59 Spain time (16:59 in Costa Rica); anything saved after that is not judged ([Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)). Your event runs on Spain time; confirm with your Local Lead if in doubt.

- [x] Both members registered, on the same event, and listed on the team's Members tab ([Judging & Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/)).
- [ ] Every required field on the project page completed, in English.
- [ ] Demo: a video of 30 seconds or less, or up to seven slides including title and intro. A video may be in Spanish only with English subtitles.
- [ ] Demo hosted elsewhere and linked, since videos and slides cannot be uploaded to the Space Apps site; every link set to public.
- [ ] Description of how SI tools (Claude Code and any AI video tools) were used ([Participant FAQ](https://www.spaceappschallenge.org/resources/participant-faqs/)).
- [ ] Every data source cited: each NASA dataset, ERA5, and any non-NASA source such as SoilGrids.
- [x] No images, video or voice of anyone under 18.
- [ ] Submitted with the "submit" button, not just saved.

**Make it look like a product launch.** Aim for a startup launch film, not a science-fair slideshow: real screen recordings of the app on a phone frame, smooth zooms on the lot turning red, a satellite-to-field transition, bold captions, one music bed, and a clean Demenova logo with a star-burst mark for the "nova". Keep NASA's logo off it: the challenge's resource page states NASA does not endorse non-government entities, so check the Space Apps Brand Guidelines (in the site menu) before using any Space Apps or NASA mark. Credit "built with NASA Earth observations" in words instead.

**The 30 seconds.** One story only: "rain fell upstream, Demenova turned the lot red, the flood arrived, here is what to change on that lot". Five seconds of problem, twenty of the replay, five of the strategy card.

## Claude Code setup · Updated

Harness ECC, but selectively: use its plan, review, security and session tools everywhere, and its test-first workflow only on the alert engine. [ECC](https://github.com/affaan-m/ECC) runs a plan, test, implement, review loop with 71 agents and 314 skills; its default rules demand 80% test coverage, which would sink a 24-hour build, so CLAUDE.md overrides that. Add Graphify for a map of the codebase and Anthropic's frontend-design plugin for the visual layer.

**Setup status: ECC and Graphify are already installed in your Claude Code.**

1. **Prerequisites.** Node.js 18 or newer, Git, Claude Code 2.1 or newer, Python 3.10 or newer.
2. **ECC: installed. For reference, one path only.** Inside Claude Code run `/plugin marketplace add https://github.com/affaan-m/ECC` then `/plugin install ecc@ecc`, or run `npx ecc-universal@2.2.3 setup` and choose project scope with Standard hooks. Never both: stacked installs duplicate hooks. Install only from the official repo or npm package, as its README warns. Check with `/plugin list`.
3. **ECC rules: check they are in place.** Plugins cannot ship rules, so clone the repo once and copy `rules/common`, `rules/python` and `rules/typescript` into your project's `.claude/rules/ecc/`.
4. **frontend-design.** `/plugin install frontend-design@claude-plugins-official`, then `/reload-plugins`. It is a taste layer for typography and layout, not a correctness check; give it the design rules from Stack and deployment.
5. **Graphify: installed. Build the graph after the first working skeleton.** `uv tool install graphifyy` (or `pipx install graphifyy`), then `graphify install --project`, then `/graphify .` in Claude Code. Use the original [safishamsi/graphify](https://github.com/safishamsi/graphify); many copies of it exist on GitHub. Its `graph.html` is also a ready architecture visual for the project page.
6. **Project files.** Export this doc as Markdown to `SPEC.md`; create `CLAUDE.md` with the block below.

**ECC workflow per build block.**

| Moment | Command | Use it for |
| --- | --- | --- |
| Start of a block | `/ecc:plan "<block goal from SPEC.md>"` | A plan you approve before any code |
| Alert engine only | `tdd-workflow` skill | Tests for the index, thresholds and state machine; a wrong threshold is the bug judges would catch |
| End of a block | `/code-review`, `/python-review` | Fresh-context review before you commit |
| Build breaks | `/build-fix` | Fast repair of build and type errors |
| Before the first deploy | `/security-scan` | Catches leaked Supabase, Resend or GitHub keys |
| Session slows down | `/context-budget` | Trims context instead of restarting |
| Before you sleep | `/save-session`, plus HANDOFF.md for Tyson | Resume tomorrow with `/resume-session` |
| Feature freeze | `/update-docs` | README and data citations in sync |

Skip the `multi-*` commands: they need an extra runtime ECC doesn't install.

```markdown
# Demenova — instructions for Claude Code

Read SPEC.md first. It is the source of truth. Deadline: 15 Nov, 23:59 Spain time.

## Project
Mobile-first PWA: waterlogging and flood alerts for banana lots near Machala, El Oro, Ecuador, built only on global NASA and partner data.

## Architecture
- /pipeline: Python (earthaccess, xarray, rasterio, pysheds or whitebox). Harmonizes to a 30 m grid, computes features, alert index and state; writes to Supabase and to /app/public/data as JSON/GeoJSON snapshots. Runs hourly in GitHub Actions.
- /backend: FastAPI on Render. Email (Resend), protected manual re-run and /email/test. Nothing user-facing depends on it.
- /app: Vite + React + TypeScript + Tailwind PWA on Render Static Site. Leaflet + NASA GIBS tiles, uPlot charts, vite-plugin-pwa. Reads Supabase (public read-only) or the JSON snapshot; works offline.

## Rules
- Never invent data. A failed dataset shows as missing, never fabricated. The demo farm is labelled synthetic.
- Every number in the UI shows its source and timestamp.
- Severity = colour AND word. Spanish and English labels.
- Alert weights and thresholds live in one config file.
- Secrets only in environment variables. Never commit keys.
- Performance budget: initial JS under 150 KB gzipped; Lighthouse mobile 90+.
- The demo depends on replay of a past flood, never on live downloads.

## ECC overrides for this hackathon
- Tests are required only for the alert engine and state machine. No coverage target elsewhere.
- Plan before each block with /ecc:plan; review with /code-review before committing.
- Prefer working and simple over complete. Ask before adding dependencies.
```

**SI-use log.** Keep a running note, one line per task: time, what Claude Code did, what you changed or decided yourself. It becomes the required SI description at submission.

## Open questions for Tyson (needed in block 1) · Updated

Tyson answered on day 1; blanks were researched. Full detail and sources are in his workflow doc.

| Question | Answer | Source |
| --- | --- | --- |
| Is Machala, El Oro the right area? River and flood dates? | Yes. Demo flood: 22–23 Feb 2026, Buenavista river overflowed into banana farms in Pasaje; Pital river overflowed in Santa Rosa the same night | Tyson; [El Universo](https://www.eluniverso.com/noticias/ecuador/inundaciones-en-machala-y-desbordamientos-de-rios-paralizan-parte-de-el-oro-el-23-de-febrero-nota/), [Primicias](https://www.primicias.ec/economia/fusarium-inundaciones-contencion-hongo-eloro-lluvias-muro-contencion-quemado-116973/) |
| Waterlogging tolerance and root depth | 2 days maximum; roots at 70 cm | Tyson |
| Three strategies | Drafted: current management, improved drainage, drainage plus maní forrajero and well-timed bio-inputs; Tyson reviews | Research, his doc |
| Maní forrajero | Many farms use it, many don't; his doesn't | Tyson |
| Fungal pressure (Black Sigatoka) | Favourable above 23 °C mean with relative humidity above 75% and wet leaves; unfavourable below 70% humidity | [TEC](https://revistas.tec.ac.cr/index.php/agroinn/article/download/6503/6351), [Atena](https://atenaeditora.com.br/catalogo/dowload-post/77675) |
| Cool season in El Oro | About 1 July to 13 November; nights near 20 °C slow fruit filling and delay harvest | [WeatherSpark](https://es.weatherspark.com/y/19338/Tiempo-promedio-en-Machala-Ecuador-durante-todo-el-a%C3%B1o), [Ecuador Times](https://www.ecuadortimes.net/low-temperatures-affect-the-banana-production/) |
| Real farm data | None: ship the synthetic demo farm | Tyson |
| Test phone | Samsung Galaxy A55 | Tyson |

**Still open with Tyson:** confirm the demo flood and how long the water took to reach the farms; costs and labour for each strategy; validate the proposed fungal and cold thresholds.

## Sources

- Challenge statement and Resources tab: Field Shift: Adapting Farms with NASA Data, 2026 NASA Space Apps Challenge.
- [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) · [Judging & Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/) · [Participant FAQ](https://www.spaceappschallenge.org/resources/participant-faqs/)
- [ECC repository](https://github.com/affaan-m/ECC)

* [Graphify (original repository)](https://github.com/safishamsi/graphify)
* Frontend-design plugin: `frontend-design@claude-plugins-official`, Anthropic's official Claude Code plugin marketplace

- Floods: [El Universo, 23 Feb 2026](https://www.eluniverso.com/noticias/ecuador/inundaciones-en-machala-y-desbordamientos-de-rios-paralizan-parte-de-el-oro-el-23-de-febrero-nota/) · [Primicias, Fusarium and floods](https://www.primicias.ec/economia/fusarium-inundaciones-contencion-hongo-eloro-lluvias-muro-contencion-quemado-116973/)
- Sigatoka: [TEC Costa Rica](https://revistas.tec.ac.cr/index.php/agroinn/article/download/6503/6351) · [Atena](https://atenaeditora.com.br/catalogo/dowload-post/77675) · [INTAGRI](https://www.intagri.com/public_files/50.-Manejo-de-Sigatoka-Negra-en-Banano.pdf)
- Cool season: [WeatherSpark, Machala](https://es.weatherspark.com/y/19338/Tiempo-promedio-en-Machala-Ecuador-durante-todo-el-a%C3%B1o) · [Ecuador Times](https://www.ecuadortimes.net/low-temperatures-affect-the-banana-production/)
