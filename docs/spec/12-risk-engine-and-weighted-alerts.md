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

