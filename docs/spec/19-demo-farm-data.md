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

