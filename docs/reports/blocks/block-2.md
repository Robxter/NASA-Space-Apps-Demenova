# Block 2 report (core: engine, app, backend, CI), 2026-11-15
Branch `block/2-core`, commits 2ea3983..886d9a9 (`git log 06aac64..HEAD`, 38 commits to 886d9a9, not pushed). Writer: technical-writer, T-030.
Solo build from 15 Nov ~00:30 (FIX2.md): Roberto is the only human; the team agronomist left on 14 Nov (D-022, D-027).

## 1. What was built, by whom
- **Engine** (data-scientist, [04:50](../data-scientist/2026-11-15-0450.md), [05:10](../data-scientist/2026-11-15-0510.md);
  c39de04, 83d8cf0, 8b1194e, 969e4c8, 7e1f49c, 940cd32, ee9d6e4, d70d7b2, 9e0673a, bce0806): TWI terciles and ranks,
  Kirpich first lag, API, FAO-56 ETo/ETc, daily balance, 2-day floor, alert index W with factor shares, state machine
  per docs/spec/16, experimental Sigatoka, verification counts, ±0.10 weight sensitivity, replay snapshots 20 Jan-5 Mar.
- **Data** (data-engineer, [06:15](../data-engineer/2026-11-15-0615.md); 4c606ad, 8cf2ed1, 9288577): Sentinel-2 offset
  applied twice (NDVI > 1) fixed; contract lot ids; 45-day replay stack 2026-01-20..03-05 (D-029).
- **App** (frontend-engineer, [23:55](../frontend-engineer/2026-11-14-2355.md), [06:00](../frontend-engineer/2026-11-15-0600.md);
  2ea3983, c5c2db4, a0067a9, 613f4f5, 029b64e, 0f1f9b2): shell, hash nav, IndexedDB, Home/Map/Lot/Alerts/Settings,
  Strategies (not-reviewed badge), farm setup levels 0-2 with confidence badge, "How reliable is this?" (counts only),
  Learn, records saved by default with CSV export, units and language toggles.
- **Backend** (api-engineer, [04:34](../api-engineer/2026-11-15-0434.md); 32ae9c6, a46d5ae): FastAPI health/run/email-test,
  Severe email via Resend with per-episode dedupe; security-review fixes.
- **CI/CD** (devops-engineer, [04:44](../devops-engineer/2026-11-15-0444.md); 0a8024a, f0635be): CI, hourly pipeline
  workflow (live ingest step still a TODO), Render blueprint, size gate, CSP and headers, actions pinned to SHAs.
- **Contracts** (lead-architect, [05:36](../lead-architect/2026-11-15-0536.md); b2458b1): 1.2.0, additions only (D-030).
- **Domain** (agronomist, [07:30](../agronomist/2026-11-15-0730.md); 584061c): FIX2 mandate, actions as checks,
  review tags, one Agrocalidad line for TR4, former agronomist removed from domain files.
- **Guides** (instructor, [14:00](../instructor/2026-11-15-1400.md); 886d9a9): farmer es/en, agronomist en/es, judge quick start.
- **Main session**: FIX2 applied (c2e2000), D-029 entries (72ae27e, 5f0afd8, 94fdbbf), P-014/P-016 (7912315, 3f3658a).

## 2. Decisions
- D-021..D-028 (FIX2, Roberto): name Roberto; agronomist tasks closed; archive values kept; engine without an expert
  (design weights, sensitivity instead of AHP, press-documented floods only); agronomist mandate; agents adapted;
  former agronomist not named (D-027; Members tab fixed by Roberto 15 Nov); solo-build scope.
- D-029 (Roberto): Severe at W ≥ 0.90, "a design choice made after viewing the 2026 replay to make Severe rarer ...
  It is not fitted or validated; the 2026 floods were seen when choosing it." Replay starts ~20 Jan.
- D-030 (lead-architect, class B): contract 1.2.0 (sensitivity, experimental flag, review tags), P-013 and P-015.
- Class A open for Roberto: **P-016** email_log unique index (default: defer); **P-017** seasonal percentiles (post-hackathon).

## 3. Data used (details and URLs in docs/CITATIONS.md)
- GPM IMERG Early daily `GPM_3IMERGDE` V07 (V07B, V07C from 4 Mar), NASA POWER daily v2.10.3 + hourly, SRTMGL1 v003
  (OpenTopography), Sentinel-2 L2A (Earth Search; scenes 14 and 19 Feb), GLDAS Noah 2.1 (in stack, not in W), GIBS,
  OSM. SMAP evaluated, not used (D-019). Accessed 14-15 Nov 2026.
- Floods `observed` from press: 22-23 Feb Buenavista (in catchment); 11-12 Oct Santa Rosa, 19 and 26 Oct Chaguana (regional).
- `synthetic`: the demo farm and its 8 lots. `design`: weights, thresholds, hysteresis. `estimated`: api_k, Kc 1.10,
  Kirpich tc, Sigatoka (T-047, T-065). `pending`: CN, drainage D, strategy cost and labour. `calibrated`: lag 0 d (in-sample).

## 4. Tests and reviews
- pytest 424 passed (re-run by technical-writer, 15 Nov); Vitest 61 passed (frontend-engineer report, not re-run); provenance checker OK.
- Science review T-025 ([report](../science/2026-11-15-0356-t025-engine.md)): approve with changes; M1, M2, M4, M5 and
  minors fixed in ee9d6e4; M3 kept as a known limit (P-017).
- Security review (ECC, backend and deploy; no separate file in the repo): M1, L1-L4 fixed in a46d5ae (10 regression
  tests), M3 and L5 in f0635be, M2 partly fixed in code, its unique index is P-016.
- Verification (verification.json, farm catchment 2026-01-01..11-13): 1 hit, 0 misses, 4 false alarms. No
  flood-specific lead time: lots 1 and 2 were already Severe from earlier storms (episode from 5 Feb), and the 23 Feb
  rain reaches W only at 24 Feb 04:00 UTC, after the overflow was reported.
- Sensitivity: not stable in 10 of 10 variants; lots 1 and 2 are Severe on the flood days (21-24 Feb) in every run.

## 5. Risks for block 3 and submission
- Not deployed yet: Render, Supabase apply and the `<app URL>` are Roberto's steps (docs/DEPLOY.md).
- No real Severe email sent yet from replay data in Supabase (api-engineer definition of done).
- Hourly live ingest + score is a TODO step in pipeline.yml; the demo does not depend on it.
- Known limit: annual percentiles keep wet-season days high (M3, P-017). SPEC 09's line "caught the February 2026 flood
  in replay" is contradicted by the results and must not be repeated.
- Instructor list of app vs SPEC gaps (no actions shown, no email settings, level 3, KML/CSV import, sliders, month view).
- QA e2e (T-044) in progress in parallel.
