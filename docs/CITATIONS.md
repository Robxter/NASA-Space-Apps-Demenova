# Citations

Owner: technical-writer (T-051). Every dataset, method and article that Demenova actually uses, with the URL that was
opened and the access date. Entries are copied from `config/datasets.yaml`, the provenance records
(`app/public/data/demo/manifest.json`, sidecars under `pipeline/data/processed/`), `domain/*.yaml`,
`config/alerts.yaml` and the agent reports. A source nobody opened is not cited (CLAUDE.md §1.3); see the last section.
Dates are 2026. "Data pulled" is the download time in the provenance record (UTC).

## 1. Earth observation and model data used

| Dataset | Identifier and version | Provider | URL opened (date) | Use in Demenova |
| --- | --- | --- | --- | --- |
| GPM IMERG Early Run, daily | `GPM_3IMERGDE` V07 (granules V07B to 03-03, V07C from 03-04), DOI 10.5067/GPM/IMERGDE/DAY/07 | NASA GES DISC | https://cmr.earthdata.nasa.gov/search/collections.umm_json?short_name=GPM_3IMERGDE&version=07 (14 Nov); latency "4 hours" on https://gpm.nasa.gov/data/imerg (14 Nov) | Only rain product end to end: catchment-mean and farm-cell daily rain 2015-01-01..2026-11-13 (4,335 granules, 0 missing), 72 h upstream rain, local rain. Data pulled 14 Nov 22:08 and 15 Nov 03:44-04:03 |
| GLDAS Noah Land Surface Model L4, 3-hourly 0.25° | `GLDAS_NOAH025_3H` 2.1, DOI 10.5067/E7TYRXPJKWOQ | NASA GES DISC | https://cmr.earthdata.nasa.gov/search/collections.umm_json?short_name=GLDAS_NOAH025_3H&version=2.1 (14 Nov) | Four soil-moisture layers in the replay stack 2026-01-20..03-05 (pulled 15 Nov 04:04). Not read by the alert index in this version; saturation comes from the antecedent precipitation index |
| NASA POWER | Daily API v2.10.3, community AG; hourly CSV for the replay window | NASA Langley Research Center | https://power.larc.nasa.gov/docs/services/api/temporal/daily/ (14 Nov) | Temperature, humidity, wind at 2 m, solar radiation for FAO-56 ETo; daily heat units. Pulled 14 Nov 22:00 and 15 Nov 03:56-04:01 |
| SRTM 1 arc second (~30 m) | `SRTMGL1` v003, DOI 10.5067/MEASURES/SRTM/SRTMGL1.003 | NASA LP DAAC (archive); downloaded from the OpenTopography open copy (NASA SRTM v3, voids filled) | https://cmr.earthdata.nasa.gov/search/collections.umm_json?short_name=SRTMGL1&version=003 and https://portal.opentopography.org/raster?opentopoID=OTSRTM.082015.4326.1 (14 Nov) | Terrain, D8 flow, TWI zones, Río Buenavista catchment (253.8 km²), Kirpich inputs. Pulled 14 Nov 21:55 |
| Sentinel-2 Level-2A | Earth Search STAC API v1, collection `sentinel-2-l2a` (Copernicus, ESA partner data) | Copernicus Sentinel-2 (ESA); COGs by Element 84 on AWS Open Data | https://registry.opendata.aws/sentinel-2-l2a-cogs/ (14 Nov); endpoint https://earth-search.aws.element84.com/v1 | NDVI on the replay scenes of 14 and 19 Feb 2026 and the 2025-11-01..2026-11-13 composite. Pulled 15 Nov 03:55-04:01 |
| NASA GIBS (WMTS) | Layers `ASTER_GDEM_Greyscale_Shaded_Relief` and `MODIS_Terra_CorrectedReflectance_TrueColor`, checked in GetCapabilities | NASA Global Imagery Browse Services | https://nasa-gibs.github.io/gibs-api-docs/access-basics/ (14 Nov) | Map base imagery in the app (tiles fetched live, cached by the PWA) |
| OpenStreetMap | Way 468343174 "Río Buenavista"; nodes 4930639815 "Pasaje", 249421920 "Buenavista" (ODbL, © OpenStreetMap contributors) | OpenStreetMap contributors, via the Overpass API | https://overpass-api.de/api/interpreter (14 Nov) | River burned into the DEM to fix the catchment outlet (science review M2); place names |

## 2. Evaluated, not used in the shipped alerts

- **SMAP Enhanced L3 9 km** (`SPL3SMP_E` v006, DOI 10.5067/M20OXIZHY3RJ, NASA NSIDC DAAC,
  https://nsidc.org/data/spl3smp_e/versions/6, 14 Nov). Downloaded for the replay window; every retrieval over the farm
  was flagged not recommended, so the recommended-quality layer has 0 days. Roberto chose not to use it (D-019); the app
  shows soil moisture as missing.
- Verified in `config/datasets.yaml` on 14 Nov but not used: IMERG Early half-hourly (`GPM_3IMERGHHE`), IMERG Late and
  Final daily, ECOSTRESS (`ECO_L2T_LSTE`), HLS (`HLSL30`), MODIS (`MOD13Q1`), VIIRS (`VNP13A1`), GRACE/GRACE-FO mascons,
  ERA5 (ECMWF, Copernicus CDS), ISRIC SoilGrids (https://www.isric.org/explore/soilgrids, 14 Nov; not used).
- FAO GAEZ: UNVERIFIED (https://gaez.fao.org/ returned only a title on 14 Nov). Not used, not cited.

## 3. Methods

| Method | Source opened (date) | Where |
| --- | --- | --- |
| FAO-56 Penman-Monteith ETo and crop coefficient Kc (Allen et al. 1998, FAO Irrigation and Drainage Paper 56) | https://www.fao.org/4/x0490e/x0490e0b.htm, Table 12 (14 Nov; re-checked by scientist-reviewer, T-025) | `pipeline/engine`, `config/alerts.yaml` kc_banana 1.10 (estimated) |
| Sentinel-2 scaling: offset not re-applied when `earthsearch:boa_offset_applied` is true | https://github.com/Element84/earth-search/issues/41 (15 Nov) | `pipeline/ingest` NDVI fix (4c606ad) |
| Kirpich (1940) time of concentration | Kirpich pages opened by scientist-reviewer in T-025 (15 Nov); URLs not recorded in the repo | First travel-time estimate only, used far outside its calibration range |
| Saaty (1990) AHP, EJOR 48: 9-26 | Tables used for tests of the unused `ahp.py`; URL not recorded | Not used for weights (D-024) |

Other formulas (D8, TWI, API, SCS-CN) follow the SPEC method table (`docs/spec/09`). Their original papers were not
opened by an agent, so they are not cited here.

## 4. Press reports (documented floods; origin `observed`, D-024)

- El Universo, 23 Feb 2026 (09:54 local), "Inundaciones en Machala y desbordamientos de rios paralizan parte de El Oro
  este 23 de febrero": https://www.eluniverso.com/noticias/ecuador/inundaciones-en-machala-y-desbordamientos-de-rios-paralizan-parte-de-el-oro-el-23-de-febrero-nota/
  (14 Nov). Río Buenavista overflow at the Buenavista-Pasaje road; the demo replay event, in the farm's catchment.
- Teleamazonas, SNGR table to Monday 12 Oct 2026, 07:00: https://www.teleamazonas.com/actualidad/noticias/ecuador/seis-rios-esteros-desbordados-tres-provincias-lunes-12-octubre-130196/
  (15 Nov). Río Chico and Río Caluguro, Santa Rosa; regional context, outside the catchment.
- Extra, 26 Oct 2026: https://www.extra.ec/noticia/ecuador/oro-tendales-inunda-segunda-vez-desbordamiento-rio-chaguana-166024.html
  (15 Nov). Chaguana river overflows on 19 and 26 Oct 2026, Tendales, El Guabo; regional context.
- Primicias, Alexander García, updated 1 Mar 2026, "Las inundaciones comprometen contención del Fusarium en El Oro":
  https://www.primicias.ec/economia/fusarium-inundaciones-contencion-hongo-eloro-lluvias-muro-contencion-quemado-116973/
  (agronomist 14 Nov; technical-writer 15 Nov). Rain on 23-24 Feb 2026 overtopped part of a containment wall built
  for Fusarium TR4, detected in December 2025 at a farm in El Quemado, Santa Rosa. Used in the project page only.

## 5. Agronomy and context

- Turner, D.W., Fortescue, J.A., Thomas, D.S. (2007). Environmental physiology of the bananas (Musa spp.). Brazilian
  Journal of Plant Physiology 19(4). https://www.scielo.br/j/bjpp/a/w6fWfdQLYKrby3L5m6xnvMP/?lang=en (15 Nov)
- Johns, G.G. (1994). Effect of Arachis pintoi groundcover on performance of bananas in northern New South Wales.
  Aust. J. Exp. Agric. 34(8), 1197-1204. doi:10.1071/EA9941197. https://connectsci.au/an/article/34/8/1197/153145/Effect-of-Arachis-pintoi-groundcover-on (15 Nov)
- De la Cruz, R., Suárez, S., Ferguson, J.E. (1994). The contribution of Arachis pintoi as a ground cover in some
  farming systems of Tropical America. CIAT, 102-108. https://agris.fao.org/search/es/records/6471eeb177fd37171a71944e (15 Nov)
- Jefwa, J. et al. (2010). Benefits and potential use of arbuscular mycorrhizal fungi (AMF) in banana and plantain
  (Musa spp.) systems in Africa. Acta Horticulturae 879, 479-486. doi:10.17660/ActaHortic.2010.879.52.
  https://ishs.org/ishs-article/879_52/ (15 Nov)
- Agrocalidad (Ecuador's plant-health agency), 1 Nov 2023, Fusarium prevention notice:
  https://www.agrocalidad.gob.ec/se-fortalecen-medidas-de-prevencion-para-evitar-el-ingreso-de-fusarium-2/ (15 Nov).
  The app's only TR4 line points to its official channels.
- WeatherSpark, Machala climate: https://es.weatherspark.com/y/19338/Tiempo-promedio-en-Machala-Ecuador-durante-todo-el-a%C3%B1o (14 Nov)
- Ecuador Times, low temperatures and banana production: https://www.ecuadortimes.net/low-temperatures-affect-the-banana-production/ (14 Nov)
- Team agronomist (archive), 14 Nov 2026: 2-day waterlogging tolerance and 70 cm root depth (`sourced`, D-023).

## 6. Named in the SPEC but not opened, so not cited

Kohler & Linsley 1951 (API k), Sentelhas et al. 2008 (leaf wetness), TEC Costa Rica, Atena and CORBANA PDFs
(Sigatoka, heat units; P-004), APS Sigatoka lesson and Phytopathology 1992 (HTTP 403), Bebber 2019 (captcha), FAO
banana page (404), Costa Rica MAG bulletin (404), FAO GAEZ (UNVERIFIED).
