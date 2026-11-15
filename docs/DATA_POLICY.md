# Data policy: NO INVENTED DATA

This is Demenova's first rule and it outranks speed, aesthetics and deadlines. A demo that shows one invented number
loses the trust the whole project is built on. Every agent reads this file before producing any value.

## 1. The six legitimate origins

Every stored or displayed value carries exactly one `origin`:

| origin | Meaning | Required metadata | UI treatment |
| --- | --- | --- | --- |
| `sourced` | Read from a dataset or publication someone opened | provenance id or source URL + access date | Source tooltip |
| `calibrated` | Fitted on documented events with recorded evidence | calibration note id | Source tooltip |
| `provided` | Typed or imported by a user | user id or device id, timestamp | "Provided" badge |
| `observed` | A field observation (water table reading, flood memory) | observer, date | "Observed" badge |
| `estimated` | Expert or literature default awaiting confirmation | `estimated_by`, `reason`, TASKS id | "Estimated" badge |
| `synthetic` | Demo-only invented content (Finca Demo El Oro) | `to_be_redefined_by` | Visible "Demo" label |

`design` is reserved for engineering parameters (hysteresis, two-update rule, 12 h Stale) and `pending` for values
that do not exist yet (they are `null` in data and shown as missing).

## 2. Hard rules

1. No value without an origin. The provenance checker (`scripts/check_provenance.py`) fails the build otherwise.
2. Missing stays missing. Show "No data" with the reason. No silent interpolation, smoothing or forward-fill.
   The only gap-filling allowed is a method in the SPEC's Prediction science table, and its output is `estimated`.
3. Synthetic data appears only in the demo farm and only with the visible "Demo" label. It never enters
   calibration or verification.
4. No fabricated citations. A source is cited only after an agent opened it; record URL and access date.
   If verification fails, write `UNVERIFIED`, do not use the value, and add a PENDING.md entry.
5. No unmeasured claims. Accuracy language ("accurate", "predicts", "validated") needs measured verification counts.
   Use "caught the February 2026 flood in replay" (true, measured) rather than "95% accurate" (invented).
6. Language models are not data sources. An agent's general knowledge may suggest where to look; the value must
   still come from an opened source.
7. When in doubt, stop and write to `docs/decisions/PENDING.md`. Stopping is success; inventing is failure.

## 3. Provenance record (attached to every data file)

```json
{
  "provenance": {
    "id": "prov-imerg-final-2026-02",
    "dataset": "<exact product short name>",
    "version": "<exact version>",
    "provider": "<e.g. NASA GES DISC>",
    "url": "<landing page or DOI actually opened>",
    "accessed": "2026-11-14T18:30:00Z",
    "spatial_resolution": "<as published>",
    "temporal_resolution": "<as published>",
    "aoi": "<aoi id>",
    "time_range": ["2026-02-15", "2026-03-05"],
    "processing": ["subset to AOI", "reproject EPSG:32717 30 m (method: ...)", "..."],
    "code_commit": "<git sha>",
    "agent": "data-engineer",
    "notes": ""
  }
}
```

SI (AI) generation: every processed data file and snapshot in this repository was produced by code written with SI
assistance and run by Claude Code agents. The `agent` field of each provenance record names the Claude Code agent
(for example `data-engineer`, `data-scientist`) whose code and run produced the file; `code_commit` names the commit.
Roberto (the human owner) chose the datasets and approved the methods. Full log: `docs/SI_USE_LOG.md`.

## 4. Values without an expert since the team change (14 Nov 2026; D-023)

The team agronomist left on 14 Nov 2026 and answers nothing more. No value waits on him. Archive:
`domain/agronomist-answers-archive.md`.

| Item | Origin now | Rule |
| --- | --- | --- |
| Questionnaire 5.1–5.10 defaults (variety Cavendish Williams, planting density, soil type loam, drain depth and spacing, actions per level, vocabulary, channel, solo-farmer actions, review time) | `estimated`, reason "team agronomist left; default retained" | Closed; the defaults are the v1 values |
| Biosecurity (Fusarium TR4) | none | No recommendations of our own; at most one neutral line to Ecuador's official plant-health authority, only if its official page was opened and cited (D-025) |
| Sigatoka Watch after 3 days; cold-stress threshold | `estimated` | Experimental, nice-to-have, "Experimental" badge in the UI |
| Strategy scores (soil, water, cost, labour) | `estimated` | Drafted by Claude, never validated; badge "Not yet reviewed by a local agronomist" |
| Strategy costs and labour | `pending` | Shown as "not estimated"; never guessed |
| Alert weights 0.35 / 0.25 / 0.20 / 0.10 / 0.10 (SPEC starting weights) | `design`, reason "engineering choice; no expert AHP matrix available" | Backed by the ±0.10 sensitivity check on the Feb 2026 replay (D-024) |
| AHP pairwise matrix | none | Never answered; `ahp.py` stays as the path for a future local agronomist |
| Flood memories | none | Use documented floods only, `observed`, observer = press source URL from the SPEC |
| Agronomic statements in domain files | `sourced` (agent opened the source) or labelled "General guidance — not reviewed by an agronomist" | `reviewed_by: [agronomist-agent, scientist-reviewer]`, `human_review: none` (D-025) |

Open questions for a future local agronomist live in `domain/review-queue.md`. No task waits on them.

## 5. Kept from the team agronomist (`origin: sourced`, source "team agronomist, 14 Nov 2026")

Banana tolerates at most 2 days of waterlogging and roots reach 70 cm (used by the 2-day floor rule); Machala/El Oro
is the right area; field problems, signals, users, phone-first, trust via history and adoption barriers are product
requirements. His family farm keeps no records and does not use maní forrajero: kept internally as the founding case,
anonymous in public. Evidence of zero-data farms: only his own farm, as an anonymous anecdote with no statistics.
Consent to use his name, voice or photo is treated as withdrawn unless he reconfirms in writing (D-027). He is not
named in public materials.
