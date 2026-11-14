# Decisions log

Architecture decision records (ADR-nnn) by lead-architect and approved class A/B decisions. Newest first.

| ID | Date | Class | Decision | Reason | Approved by |
| --- | --- | --- | --- | --- | --- |
| D-019 | 2026-11-15 | A | P-010: SMAP values with "not recommended" quality flags are NOT used in the replay; only recommended-quality (flag 0/8) layers, which are empty for 2026-02-15..03-05 | SMAP v6 user guide: only flags 0 or 8 are high quality | Roster ("approve all", main session's recommendation) |
| D-018 | 2026-11-15 | A | P-009: Supabase schema T-015 approved as committed in 19eb697 (14 tables, RLS at creation, 4 security-invoker views, column-level grants, 79-check RLS test), to be applied per supabase/README.md | Database review: no CRITICAL; HIGH/MEDIUM fixed | Roster |
| D-017 | 2026-11-15 | A | P-002 (b): Telegram onboarding uses a random per-farm `telegram_code`, not the farm id (contract addition T-015b) | Guessable farm ids would expose private farms' alerts | Roster |
| D-016 | 2026-11-15 | A | P-003 (a): Farm country, province and canton are nullable | A level-0 farm is only a pin; filling them would mean guessing | Roster |
| D-015 | 2026-11-15 | A | P-006: logo option 1 "Core" (design/logo/option-1-core.svg); PWA icons already derive from it | Logo and severity glyph are one idea | Roster |
| D-014 | 2026-11-15 | A | P-004 (a): Sigatoka thresholds and the 14 °C heat-unit base stay `estimated` until Tyson validates (review queue Q-02, Q-04) | Cited PDFs could not be read; no unverified citation | Roster |
| D-013 | 2026-11-14 | B | Contracts v1 formalised in phase 0 (ADR-005): v1 deltas listed in CONTRACTS.md §9 (`origin` on Farm, DailyFeature, AlertState, AlertEvent; `ndvi_date`; replay `events`; dataset `origin`/`notes`; UserPrefs `device_id` + `user_id`); CONTRACTS.md §8 (origin and provenance rules the checker enforces) and §9 added; `docs/contracts/openapi.yaml` sketch added. The one type widening (Farm country/province/canton nullable) waits on Roster: PENDING P-003 | Backward-compatible additions to a draft with no consumers yet; §8 was cited by the checker but missing | lead-architect (class B); P-003 to Roster |
| D-012 | 2026-11-14 | A | FreeLLMAPI overflow lane: Roster asked to install it. Installer v0.16.29 downloaded from the project's GitHub Releases, SHA-256 matches the published digest, but the .exe is NOT code-signed, so the main session did not run it; Roster runs it if he accepts that. Lane is off by default; when used, only FIX.md §6 rules apply (separate terminal, `npx freellmapi launch`, never `setup-claude`, drafting of guide/README/Learn/translation text only, `draft(overflow):` commits, SI-use log with the serving model). OmniRoute: not to be used; a global npm package `omniroute@3.8.48` was found installed but inactive (no base URL or proxy set, not running); removal waits on Roster | Extra capacity for low-risk drafting near the usage limit | Roster (install request); running the installer pending |
| D-011 | 2026-11-14 | A | claude-mem v15.18.3 installed with setup deferred to Roster. Off-plan: `CLAUDE_MEM_PROVIDER` and `CLAUDE_MEM_QUOTA_FALLBACK_PROVIDER` set to `gemini` (installer default was `claude`, i.e. the Anthropic plan), `CLAUDE_MEM_MODE=code--chill`, telemetry disabled, cloud sync off. Needs Roster's Gemini key; not registered in Claude Code until Roster finishes setup. Prerequisites: Node 22.23.5 portable (SHA-256 verified) added first on user PATH, keeping the 22.x line of CLAUDE.md §5; Bun 1.4.4 via winget. CLAUDE.md §11 memory rules added | Cross-session memory without spending the Claude plan | Roster (install request) |
| D-010 | 2026-11-14 | A | Ponytail installed from DietrichGebert/ponytail (marketplace scanned: no .exe/.dll), user scope; `PONYTAIL_DEFAULT_MODE=lite` as user env var and in project settings; optional webhook left empty (nothing leaves the machine). LITE only; `/ponytail-review` is the single review on non-engine diffs (CLAUDE.md §11, §12) | Smaller diffs and per-task cost visibility | Roster (install request) |
| D-009 | 2026-11-14 | A | Context diet (FIX.md §3): SPEC split into `docs/spec/` by `scripts/split_spec.py` (SPEC.md stays the full source); every agent's "Read first" names only its spec files per the FIX.md table, plus CONTRACTS/DATA_POLICY once per session, only touched sections; CLAUDE.md §11 token rules and §12 Ponytail precedence; settings.json env `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=2` and `PONYTAIL_DEFAULT_MODE=lite`. Note: the concurrency variable was not checked against Claude Code docs in this run; the §11 rule "at most 2 subagents" enforces the limit either way | Two Fable usage-limit stops; agents re-read the whole SPEC every run | Roster (FIX.md) |
| D-008 | 2026-11-14 | A | Supersedes D-000. Every agent `model: opus` (Opus 5.5); effort `xhigh` for lead-architect, data-scientist, scientist-reviewer, `high` for the rest; `maxTurns: 40` for scientist-reviewer, technical-writer, instructor, agent-ops-engineer. Launchers: `scripts/start.ps1` (normal) replaces `start-max.ps1`; `scripts/start-energy.ps1` forces Sonnet subagents. CLAUDE.md §10 and AGENTS.md §2 updated | Fable 5-hour limit hit twice during phase 0 | Roster (FIX.md) |
| D-000 | 2026-11-14 | A | (Superseded by D-008) All custom agents on Fable 5.2 at effort max; energy mode forces Opus 5.5 via environment variables | Roster: "every agent at max development"; Opus 5.5 as energy saving | Roster |
| D-001 | 2026-11-14 | A | AI-engineer changes go through lead-architect: low importance approved by lead, else Roster | Roster, questionnaire 4.4 | Roster |
| D-002 | 2026-11-14 | A | Units: metric default, imperial display toggle for judges; storage always SI | Roster, questionnaire 3.6 | Roster |
| D-003 | 2026-11-14 | A | No login in v0; device identity via Supabase anonymous sign-in; local-only fallback | Roster, questionnaire 2.7 | Roster |
| D-004 | 2026-11-14 | A | Farm data stored on device and in Supabase; Full and Data-saver storage modes | Roster, questionnaire 2.8 | Roster |
| D-005 | 2026-11-14 | A | Demo lots created by an agent as synthetic; Tyson redefines them later | Roster, questionnaire 3.9 | Roster |
| D-006 | 2026-11-14 | A | Tasks tracked in both GitHub Issues and TASKS.md | Roster, questionnaire 4.7 | Roster |
| D-007 | 2026-11-14 | A | Domain visionai.one available for email only if needed and approved | Roster, questionnaire 1.10 | Roster |

## Architecture decision records (lead-architect)

Newest first. Status: accepted unless stated. Changing an ADR follows the class rules of CLAUDE.md §6.

### ADR-005 Contracts: one Pydantic source, generated JSON Schema and TypeScript (2026-11-14)
- Context: four agents in three languages build against the same shapes; hand-synced copies drift.
- Decision: `pipeline/common/models.py` is the only hand-written contract. `scripts/export_contracts.py` generates
  `docs/contracts/schemas/**` (JSON Schema 2020-12, `x-contract-version`) and `app/src/types/contracts.ts` (interfaces
  plus `*_VALUES` enum arrays). `tests/test_contracts.py` fails on drift and validates every committed data and config
  file listed in `models.DATA_FILE_CONTRACTS` (with size limits). `openapi.yaml` is hand-written and `$ref`s the
  generated schemas. Supabase SQL (database-engineer) mirrors the entity schemas by hand; database-reviewer checks it.
- Consequences: a contract change is one edit to models.py, then `uv run python scripts/export_contracts.py`, then
  commit all three. Generated files are never edited by hand. Contract version starts at 1.0.0.

### ADR-004 Offline storage and data-saver mode (2026-11-14; from D-004)
- Decision: the app shell is precached by vite-plugin-pwa (Workbox `generateSW`, `registerType: autoUpdate`). Demo
  snapshots (`app/public/data/demo/`) are static files; the whole replay window is fetched and cached on first load
  so replay works offline afterwards; user farms, lots and notes live in
  IndexedDB (no extra library: hand-rolled wrapper) and sync to Supabase when online. Two modes (`storage_mode`):
  `full` = status + 90 days of history + imagery tile cache; `saver` = status + 7 days, no imagery cache. Every cached
  value keeps its timestamp; offline screens say "offline, data from ..." (SPEC Stack). Replay never needs the network
  after the first load.
- Consequences: frontend-engineer owns the runtime caching rules and IndexedDB schema (T-026, T-042); cache sizes are
  measured, not assumed. Raw data is never shipped; committed demo data stays under 5 MB (CONTRACTS.md §4).

### ADR-003 Identity: Supabase anonymous sign-in plus device id (2026-11-14; from D-003)
- Decision: on first launch the app creates a random `device_id` (stored locally) and calls Supabase anonymous
  sign-in; the returned auth user id is `owner_id` of farms created on the device and `user_id` in `user_prefs`.
  If sign-in fails or is disabled, the app runs local-only (`user_id: null`), says so, and syncs later. No email or
  password login in v0. RLS: demo tables public read-only; device-owned rows readable and writable only by their
  `auth.uid()`; the service-role key exists only in the backend and GitHub Actions.
- Consequences: clearing site data loses an anonymous identity and its unsynced farms; Setup explains this. Schema and
  policies are class A (database-engineer, T-015).

### ADR-002 Coordinates, time and units (2026-11-14)
- Coordinates: stored in EPSG:4326, GeoJSON position order [longitude, latitude]. Analysis grid EPSG:32717 (UTM 17S),
  30 m, aligned to the SRTM tile; reprojection happens only in `pipeline/`. The app never reprojects.
- Time: instants stored as UTC ISO 8601 with `Z`; displayed in America/Guayaquil unless the user changes it. Rolling
  windows (24/48/72 h) end at a stored UTC instant. Day boundary: a `date` (YYYY-MM-DD) that the pipeline aggregates
  itself (for example daily rain from sub-daily IMERG, `replay/<date>.json`) is the farm's local calendar day in
  America/Guayaquil (UTC-5, no daylight saving), so "22 Feb" means the farmer's 22 Feb. A daily product used as
  published keeps its own day definition, recorded in the provenance record's `temporal_resolution` or `processing`.
- Units: storage SI, with the unit in the field name suffix (`_mm`, `_c`, `_m`, `_ha`, `_m3s`, `_kg`; `_cm` only where
  CONTRACTS.md names it); unitless indices bare; percentages stored as 0..1 fractions even when the field name says
  `_pct`. Imperial (in, °F, ft, acres) is a display conversion in one module, `app/src/units.ts`; converted values are
  never stored or sent. Missing is `null` with origin `pending`, never 0.

### ADR-001 Stack (2026-11-14)
- Decision: exactly CLAUDE.md §4. App: Vite 6.4.6, React 19.3.1, TypeScript 5.9.3, Tailwind 4.3.5 (+ `@tailwindcss/vite`),
  vite-plugin-pwa 2.0.0, Leaflet 1.9.4 (+ `@types/leaflet`) with NASA GIBS tiles, uPlot 1.6.32,
  @supabase/supabase-js 2.119.0, Vitest 4.1.12; exact pins in `app/package.json` and `package-lock.json`
  (`.npmrc` save-exact). Python 3.11 with uv: httpx, pydantic, pyyaml (base); earthaccess, numpy, pandas, rasterio,
  rioxarray, xarray (`pipeline` group); fastapi, uvicorn (`backend` group); pytest (`dev`); exact pins in `uv.lock`.
  Hosting: Render Static Site (app), Render Web Service (backend), Supabase, GitHub Actions hourly pipeline.
- Unavoidable peers (not named in §4): `@tailwindcss/vite` (Tailwind 4's Vite integration), `@types/react`,
  `@types/react-dom`, `@types/leaflet` (Leaflet ships no types), npm-installed peers of vite-plugin-pwa
  (workbox-build, workbox-window); uvicorn (ASGI server for FastAPI), pydantic (FastAPI's model layer, also the
  contract source), pyyaml (CONTRACTS.md names YAML config and domain files), typing_extensions (pydantic dependency
  imported by models.py).
- Not installed: `@vitejs/plugin-react` (Vite's esbuild compiles JSX from tsconfig `react-jsx`; cost: no React Fast
  Refresh in dev); Playwright (qa-demo-engineer adds it with `tests/e2e`, T-044); pysheds or WhiteboxTools
  (data-engineer picks one in T-011).
- Version lines: Vite 7+, Vitest 5 and plugin-react 6 require Node >= 22.12, but the Node on Roster's PATH reports
  22.11.0 (CLAUDE.md §5), so the app uses the newest lines that support 22.11. TypeScript 5.9 rather than 7.0 (new
  native-port major) for editor and tool compatibility. Any upgrade is class A.
- Consequences: the empty app builds to 69.67 kB gzip of JS, almost all React, against the ~150 kB initial JS budget
  (SPEC Stack): Leaflet, uPlot and supabase-js must load lazily per screen. `npm audit`: 0 in production
  dependencies; 6 in dev tooling (2 low, 4 moderate), all in the build-time chain vite-plugin-pwa > workbox-build
  (glob, minimatch, deepmerge, @rollup/plugin-node-resolve); no fix without a breaking change; revisit after submission.
