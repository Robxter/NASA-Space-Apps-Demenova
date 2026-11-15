Questions for publishing project

Project Name

Demenova - Flood Alerts and Crop Risk Assessment Strategies for Banana Farms


Summary

Demenova is a phone-first web app that turns open, global NASA Earth observations into waterlogging and flood alerts, field-condition history and soil-management strategies for banana farms in coastal El Oro, Ecuador. It addresses the Field Shift challenge by helping farms adapt to a changing water regime without sensors or past records: a farmer can start with a single pin on the map and add an outline and lots later. For every lot, Demenova combines upstream rain over the river catchment, soil saturation, terrain wetness, local rain and the water balance into one index, shown as four levels in colour and word (Normal, Watch, Warning, Severe), with the factors behind each level and what to check in the field. It matters because in 2026 rivers in El Oro overflowed into banana farms several times, and most small farms keep no records, so every flood arrives as a surprise. The demo replays 20 January to 5 March 2026 around the documented Buenavista river flood of 22-23 February 2026 on a synthetic demo farm built on real NASA data. Demenova supports the agronomist's judgment; it never replaces it.


Project Details

What it does and how it works
Demenova downloads global NASA data for the farm's area and the river catchment upstream: daily rain from GPM IMERG Early, weather from NASA POWER and terrain from SRTM. From the terrain it delineates the Rio Buenavista catchment (253.8 square kilometres) and ranks every part of the farm by terrain wetness. Each day it computes five indicators per lot: rain over the catchment in the last 72 hours, soil saturation from an antecedent precipitation index, terrain wetness, local rain in the last 24 hours, and a 7-day water balance (rain minus crop evapotranspiration from the FAO-56 method). A weighted alert index W turns these into four levels through a state machine with hysteresis: a lot rises one level at a time, Severe needs two confirmations on newer rain data, and data older than 12 hours is shown as out of date. A rule from banana agronomy (banana tolerates at most 2 days of waterlogging) raises waterlogged high-wetness lots to at least Warning.

The app has a welcome page with an introduction, instructions and a downloadable Instructions.pdf, and a Q&A with technical details. Inside the app: Home with the worst lot and what to check, a risk map over NASA imagery, lot detail with the factors, history charts and a "How reliable is this?" sheet, three soil-management strategies per lot with evidence, gaps and risks, an alert log, a glossary, and farm setup at three data levels (a pin, an outline with automatic zones, or exact lots drawn, imported as GeoJSON or CSV from a downloadable template, or typed). Severe alerts can be sent by email and through a Telegram bot. It works offline after the first visit, in English and Spanish, with metric or imperial display, and every reading is saved on the device and exportable as CSV.

Benefits and intended impact
A farm that never kept records gets a daily, explained risk level for each lot and starts building its own history from day one. Agronomists can scan many lots at once and see why a lot is at risk. The intended impact is fewer surprises when rivers rise, better timing of field work on saturated soil, and a record that helps plan drainage and soil-management changes.

Honesty about reliability
Demenova shows its verification as counts only. In 2026, on the farm's own river, it had 1 hit, 0 misses and 4 false alarms. It did not predict the February 2026 flood: the demo lots were already at high risk from earlier storms when the river overflowed. The weights are an engineering choice, and a sensitivity check shows the result changes when they move, while the two wettest lots stay at Severe on the flood days in every run. Every number in the app carries its origin (sourced, estimated, demo) and missing data is shown as missing, never filled in.

Tools, languages, hardware and software
Python 3.11 with uv, numpy, pandas, xarray, rasterio, rioxarray, pysheds and earthaccess for the data pipeline and the engine; FastAPI for the backend; TypeScript, React, Vite, Tailwind CSS, Leaflet and uPlot for the progressive web app; Supabase (Postgres with row-level security) for storage; Resend for email, the Telegram Bot API for alerts and hCaptcha for abuse protection; GitHub Actions for continuous integration and Render for hosting; pytest, Vitest and Playwright for testing. No special hardware: a phone or a computer with a browser.

Use of SI (AI) tools
The project was built by one person with AI assistance. Claude (claude.ai) helped with the specification and research. Claude Code generated most of the code, data processing, tests, documentation and design work through a team of specialised AI agents, and ran scientific, security and code reviews. Roberto chose the problem, the area and the scope, made every product and approval decision, created the accounts and deployed the app. The full log of what AI produced and what Roberto decided is in docs/SI_USE_LOG.md in the repository.

What makes it creative
It works from zero data: a pin is enough to start, and the app explains how confident it is at each data level. It treats honesty as a feature: reliability is shown as counts, every number shows its origin, and nothing is invented to fill a gap. The design is built around a soil core, the sample farmers pull from the ground to see where the water sits: the severity glyph fills with water as the level rises, so the level can be read without colour. Every input is a global dataset, so the same pipeline can be pointed at another area.

Factors considered
Farmers with no staff reading a phone in strong sun and with poor connectivity (offline use, large text, colour and word for every level), Spanish and English, the agronomist's role (the app supports, never replaces, their judgment), data quality (low-quality satellite soil moisture was excluded), privacy (no account needed; email addresses are not stored), and the limits of the science, which are stated in the app.


NASA Data

GPM IMERG Early Run Daily Precipitation (GPM_3IMERGDE) Version 07 | https://doi.org/10.5067/GPM/IMERGDE/DAY/07
NASA POWER (Prediction Of Worldwide Energy Resources) Daily and Hourly API | https://power.larc.nasa.gov/
NASA SRTM Global 1 arc second (SRTMGL1) Version 003 | https://doi.org/10.5067/MEASURES/SRTM/SRTMGL1.003
NASA Global Imagery Browse Services (GIBS): Landsat WELD true colour, MODIS Terra true colour, ASTER GDEM shaded relief and reference layers | https://nasa-gibs.github.io/gibs-api-docs/
GLDAS Noah Land Surface Model L4 3-hourly 0.25 degree (GLDAS_NOAH025_3H) Version 2.1 (downloaded for the replay, evaluated, not used in the alert index) | https://doi.org/10.5067/E7TYRXPJKWOQ
SMAP Enhanced L3 Radiometer Global Daily 9 km Soil Moisture (SPL3SMP_E) Version 6 (evaluated, not used: no retrieval met the recommended quality) | https://nsidc.org/data/spl3smp_e/versions/6
NASA Earthdata Common Metadata Repository (dataset discovery and verification) | https://cmr.earthdata.nasa.gov/search/
NASA Earthdata (data access and login) | https://www.earthdata.nasa.gov/


Space Agency Partner & Other Data

Copernicus Sentinel-2 Level-2A (ESA), Cloud-Optimized GeoTIFFs on AWS Open Data | https://registry.opendata.aws/sentinel-2-l2a-cogs/
Element 84 Earth Search STAC API (Sentinel-2 access) | https://earth-search.aws.element84.com/v1
OpenTopography copy of NASA SRTM GL1 (download source) | https://portal.opentopography.org/raster?opentopoID=OTSRTM.082015.4326.1
OpenStreetMap data and map tiles (ODbL, OpenStreetMap contributors) | https://www.openstreetmap.org/copyright
Overpass API (OpenStreetMap river and place names) | https://overpass-api.de/
FAO Irrigation and Drainage Paper 56 (FAO-56 evapotranspiration and crop coefficients) | https://www.fao.org/4/x0490e/x0490e0b.htm
El Universo, floods in Machala and river overflows in El Oro, 23 February 2026 | https://www.eluniverso.com/noticias/ecuador/inundaciones-en-machala-y-desbordamientos-de-rios-paralizan-parte-de-el-oro-el-23-de-febrero-nota/
Teleamazonas, overflowed rivers on 12 October 2026 | https://www.teleamazonas.com/actualidad/noticias/ecuador/seis-rios-esteros-desbordados-tres-provincias-lunes-12-octubre-130196/
Extra, Chaguana river floods Tendales a second time, 26 October 2026 | https://www.extra.ec/noticia/ecuador/oro-tendales-inunda-segunda-vez-desbordamiento-rio-chaguana-166024.html
Primicias, floods and Fusarium containment in El Oro | https://www.primicias.ec/economia/fusarium-inundaciones-contencion-hongo-eloro-lluvias-muro-contencion-quemado-116973/
Agrocalidad (Ecuador plant-health agency), Fusarium prevention | https://www.agrocalidad.gob.ec/se-fortalecen-medidas-de-prevencion-para-evitar-el-ingreso-de-fusarium-2/
Turner et al. 2007, banana ecophysiology (Brazilian Journal of Plant Physiology) | https://www.scielo.br/j/bjpp/a/w6fWfdQLYKrby3L5m6xnvMP/?lang=en
Johns 1994, Arachis pintoi groundcover in banana (Australian Journal of Experimental Agriculture) | https://connectsci.au/an/article/34/8/1197/153145/Effect-of-Arachis-pintoi-groundcover-on
De la Cruz et al. 1994, Arachis pintoi in farming systems of tropical America (CIAT, FAO AGRIS record) | https://agris.fao.org/search/es/records/6471eeb177fd37171a71944e
Jefwa et al. 2010, mycorrhizae in banana (Acta Horticulturae 879) | https://ishs.org/ishs-article/879_52/
WeatherSpark, Machala climate | https://es.weatherspark.com/y/19338/Tiempo-promedio-en-Machala-Ecuador-durante-todo-el-a%C3%B1o
Ecuador Times, low temperatures and banana production | https://www.ecuadortimes.net/low-temperatures-affect-the-banana-production/
Demenova source code (GitHub) | https://github.com/Robxter/NASA-Space-Apps-Demenova
Demenova live app | https://demenova-app.onrender.com/
Python | https://www.python.org/
uv | https://docs.astral.sh/uv/
pysheds | https://github.com/mdbartos/pysheds
earthaccess | https://github.com/nsidc/earthaccess
xarray | https://xarray.dev/
rasterio | https://rasterio.readthedocs.io/
FastAPI | https://fastapi.tiangolo.com/
React | https://react.dev/
Vite | https://vite.dev/
TypeScript | https://www.typescriptlang.org/
Tailwind CSS | https://tailwindcss.com/
Leaflet | https://leafletjs.com/
uPlot | https://github.com/leeoniya/uPlot
Supabase | https://supabase.com/
Resend (email) | https://resend.com/
Telegram Bot API | https://core.telegram.org/bots/api
hCaptcha | https://www.hcaptcha.com/
Render (hosting) | https://render.com/
GitHub Actions | https://github.com/features/actions
Playwright | https://playwright.dev/
Playwright MCP | https://github.com/microsoft/playwright-mcp
Claude by Anthropic (SI tool used for specification, code, data processing, documentation and design) | https://claude.ai/
Emil Kowalski design skills (SI design guidance) | https://github.com/emilkowalski/skills
Impeccable (SI design guidance) | https://impeccable.style
Taste skill (SI design guidance) | https://tasteskill.dev
