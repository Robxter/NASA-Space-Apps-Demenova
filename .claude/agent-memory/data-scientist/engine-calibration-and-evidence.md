---
name: engine-calibration-and-evidence
description: Demenova engine state after review T-025 and D-029 (15 Nov 2026) - lag, thresholds, per-episode tallies, sensitivity, lead-time facts, open items
metadata:
  type: project
---

Engine v1 on block/2-core (latest snapshots 9e0673a; reports docs/reports/data-scientist/2026-11-15-0450.md and -0510.md).
Re-verify any number from config/alerts.yaml or app/public/data/demo before reusing it (Rule zero).

- D-029: Severe >= 0.90, de-escalate < 0.80, origin design ("chosen after viewing the 2026 replay; not fitted").
  Replay window 2026-01-20..03-05; updates at end of UTC day + 4 h IMERG Early latency.
- travel_lag_days = 0 `calibrated` (in-sample, one event: El Universo 23 Feb 2026, published 09:54 local).
- Per-episode tally, farm's catchment, 2026: 1 hit, 0 misses, 4 false alarms; regional floods (other rivers) 3/3 inside
  Severe episodes = context only. No flood-specific lead time: lots Severe from earlier storms (episode 5 Feb..15 Mar).
- Sensitivity at 0.90: strict test not stable 10/10; lots 1, 2 Severe on flood days in every variant.
- Known limit: annual percentiles keep wet season high (P-017/T-048, class A post-hackathon). Cold level hidden.
- Review T-025 verdict was approve with changes; M1/M2/M4/M5 fixed.

**Why:** the team agronomist left (D-022); weights `design` (D-024); the pitch must not claim prediction or lead time.
**How to apply:** start any next run from P-015/P-017 status; never tune thresholds without recording evidence.
