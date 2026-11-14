## Solution overview

Demenova is three modules sitting on one alert engine. The engine scores every lot on every data update; the modules show the score, its history and what to do about it.

| Component | Question it answers | Main inputs | Output |
| --- | --- | --- | --- |
| Alert engine | How serious is the water situation on each lot right now? | Upstream and local rain, soil wetness, terrain wetness, water balance | Risk index 0 to 1, severity level, top contributing factors, email on Severe |
| Module 1: Water risk | Where and when will my lots flood or stay waterlogged? | GPM IMERG, SMAP, GLDAS, SRTM | Lot risk map, upstream flood warning, month-by-month risk calendar |
| Module 2: Field history | How have conditions changed this week, month and quarter? | GPM, SMAP, NASA POWER, ECOSTRESS, Landsat/Sentinel-2 NDVI | Charts against prior years for rain, soil moisture, temperature, crop greenness |
| Module 3: Soil strategies | What should I do with this lot? | Lot risk profile, Tyson's practice table, farmer priorities | Current management versus two alternatives, each with reasons, evidence, benefits, gaps and risks |

**Prediction, defined honestly.** Demenova predicts in two ways that the data supports. Short term, observed upstream rain forecasts lowland flooding hours to days ahead. Seasonal, years of history give each lot a month-by-month risk calendar. It does not forecast tomorrow's weather; that would need a separate forecast service, kept out of the core.

