---
name: project-adr-index
description: Index of lead-architect ADRs (ADR-001..005) and key conventions decided in phase 0; details live in docs/decisions/DECISIONS.md
metadata:
  type: project
---

ADRs live in the "Architecture decision records" section of docs/decisions/DECISIONS.md (newest first, below the
D-table). Class-B log rows go in the D-table (D-013 was the first lead-architect row).

- ADR-001 stack: exact pins; Vite 6 / Vitest 4 / TS 5.9 lines because PATH Node is 22.11.0 (newer majors need >= 22.12).
  No @vitejs/plugin-react. See [[project-node-version-constraint]].
- ADR-002: EPSG:4326 [lon, lat]; UTC `Z` instants; pipeline-aggregated `date` = America/Guayaquil local day; SI with
  unit suffix; percent as 0..1 fractions even when named `_pct`.
- ADR-003: Supabase anonymous sign-in + local device_id; local-only fallback (user_id null).
- ADR-004: Workbox generateSW app shell; replay window cached on first load; IndexedDB hand-rolled; full vs saver.
- ADR-005: pipeline/common/models.py is the only contract source; export_contracts.py generates schemas + contracts.ts;
  tests/test_contracts.py catches drift and validates committed data/config files.

**Why:** AGENTS.md §8 asks lead-architect memory to hold conventions and the ADR index.
**How to apply:** before any contract change, edit models.py, run export, run tests/test_contracts.py, log in DECISIONS.
Open questions raised in phase 0: PENDING P-001 (state-machine diagram placeholder), P-002 (Telegram farm code),
P-003 (nullable Farm country/province/canton). Verify their status in PENDING.md before relying on this.
