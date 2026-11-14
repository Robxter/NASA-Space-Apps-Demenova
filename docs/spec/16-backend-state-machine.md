## Backend state machine

*Diagram "A lot escalates one level at a time and emails only on confirmed Severe", transcribed to text from the
Claude Doc widget on 2026-11-14 (the Markdown export drops diagrams). Alert state per lot, re-evaluated on every data
update.*

| From | To | Condition (as drawn) | Notification |
| --- | --- | --- | --- |
| Normal | Watch | W ≥ 0.40 | Watch: yellow badge |
| Watch | Warning | W ≥ 0.60 | Warning: orange banner |
| Warning | Severe | W ≥ 0.80 twice (two consecutive updates) | Severe: red banner + email |
| Severe | Warning | W < 0.70 | - |
| Warning | Watch | W < 0.50 | - |
| Watch | Normal | W < 0.30 | Normal: no notification |
| any state | Stale | rain data older than 12 h | Stale never sends email |
| Stale | recomputed level | fresh data recomputes the level | - |

Escalation is one level at a time (no direct jumps such as Normal → Severe), per the diagram's title.

The gap between each escalation and de-escalation threshold (0.10) is the hysteresis that stops a lot flickering between levels; the two-update rule for Severe stops a single noisy rain estimate from emailing anyone.

**Pipeline run, one cycle per data update.** Idle, then Fetching (new IMERG and other files), Processing (harmonize, features), Scoring (alert engine, state transitions above), Publishing (write JSON, send any Severe emails), back to Idle. Any failure moves the run to Degraded: the app keeps serving the last good files, and lots whose data ages past 12 hours turn Stale.

