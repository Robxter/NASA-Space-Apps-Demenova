## Agronomic and hydrological foundation

The tool rests on four well-established ideas; the former team agronomist supplies the crop-specific thresholds that turn them into decisions.

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

**4. Soil management instead of rotation.** Banana lots run on a fixed harvest cycle, so the levers are management practices, defined by the former team agronomist. Candidates from his answers: living cover with maní forrajero (Arachis pintoi, a legume that also fixes nitrogen), timing of mycorrhizae and mountain microorganism (MM) drench applications, and drainage work.

**Thresholds, now set.** Banana tolerates at most 2 days of waterlogging and its roots sit at 70 cm (the former team agronomist), so a water table above 70 cm for 2 days is the damage line. Black Sigatoka pressure rises with mean temperature above 23 °C, relative humidity above 75% and wet leaves, and falls below 70% humidity (sources in Open questions).

**Local check, resolved.** In Machala the cool season runs roughly July to mid-November, with August the coldest month; producers report that nights near 20 °C slow fruit filling and delay harvest. Cold stress applies in El Oro, but mid-year rather than at year-end as in Costa Rica.

