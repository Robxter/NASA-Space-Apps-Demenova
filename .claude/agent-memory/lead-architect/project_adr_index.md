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

Contract versioning (set by D-020, 2026-11-14): CONTRACT_VERSION in models.py; additive change = minor bump
(1.0.0 -> 1.1.0 for telegram_code). Server-generated columns are optional + nullable (default None) in client-facing
models, required in backend-only models; string patterns copy the SQL check, never stricter. List each version's
deltas in CONTRACTS.md §9 (§3 keeps the v0 field lists).

**Why:** AGENTS.md §8 asks lead-architect memory to hold conventions and the ADR index.
**How to apply:** before any contract change, edit models.py, run export, run tests/test_contracts.py, log in DECISIONS.
Phase 0 questions P-001, P-002 (resolved D-017), P-003 (resolved D-016): verify in PENDING.md before relying on this.
