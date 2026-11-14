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

