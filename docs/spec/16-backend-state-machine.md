## Backend state machine

&#91;embedded content: alert state machine per lot · 5 states\]

The gap between each escalation and de-escalation threshold (0.10) is the hysteresis that stops a lot flickering between levels; the two-update rule for Severe stops a single noisy rain estimate from emailing anyone.

**Pipeline run, one cycle per data update.** Idle, then Fetching (new IMERG and other files), Processing (harmonize, features), Scoring (alert engine, state transitions above), Publishing (write JSON, send any Severe emails), back to Idle. Any failure moves the run to Degraded: the app keeps serving the last good files, and lots whose data ages past 12 hours turn Stale.

