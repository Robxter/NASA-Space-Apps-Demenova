# Demenova — project instructions for Claude Code

Demenova is a mobile-first Progressive Web App that turns NASA Earth observations into
waterlogging and flood alerts, field-condition history and soil-management strategies for
banana farms in coastal El Oro, Ecuador. Built for the 2026 NASA Space Apps Challenge,
challenge "Field Shift: Adapting Farms with NASA Data".

- Team: Roberto (Cristian Roberto Terán Paredes), product owner, builder and final approver. Solo since 14 Nov 2026.
- Deadline: submission closes Sunday 15 Nov 2026, 23:59 Spain time (CET, UTC+1). Target: submit by 20:00.
- Source of truth: `docs/SPEC.md`. Contracts: `docs/contracts/CONTRACTS.md`. Data rules: `docs/DATA_POLICY.md`.
  Agent roster and approval flow: `docs/AGENTS.md`. Run order: `docs/WORKFLOW.md`. Tasks: `TASKS.md` + GitHub Issues.

---

## 1. Rule zero: NO INVENTED DATA

This rule outranks every other instruction, deadline or request. Read `docs/DATA_POLICY.md` in full before
producing any value, file, chart, text or test fixture.

1. Every number the app stores or shows comes from exactly one of:
   a. a downloaded dataset file with a provenance record (`docs/contracts/CONTRACTS.md` §Provenance);
   b. a documented formula from the Prediction science table in `docs/SPEC.md` applied to (a);
   c. a value a user typed or imported, tagged `origin: provided` or `origin: observed`;
   d. a demo value tagged `origin: synthetic`, shown in the UI with a visible "demo" label;
   e. an expert default tagged `origin: estimated`, with `estimated_by`, `reason` and a TASKS.md item to replace it.
2. If a value is unavailable: show it as missing. Never interpolate, guess, round into plausibility or
   "fill in a reasonable value". Gap-filling is allowed only by a method listed in the SPEC, and the result is tagged `estimated`.
3. Never fabricate a citation, dataset name, version, URL, DOI, coefficient or study result. Fetch and read the
   source before citing it. If you cannot verify a source, write `UNVERIFIED` and stop that line of work.
4. Never claim accuracy, skill or validation that has not been measured. Report verification as counts
   (hits, misses, false alarms), never as unmeasured percentages.
5. If any task cannot be completed without inventing data, stop and add an entry to `docs/decisions/PENDING.md`
   explaining exactly what is missing. Stopping is a correct outcome; inventing is a failure.

## 2. Other absolute rules

- No secrets in code, logs, commits, screenshots or reports. Secrets live only in `.env` (git-ignored), Render
  environment variables and GitHub encrypted secrets. Never read or print `.env` contents.
- Storage is SI (mm, °C, m, ha, m³/s, kg). Imperial units are a display-only conversion. Never store converted values.
  (Rationale: NASA lost the Mars Climate Orbiter in 1999 to a metric/imperial mismatch.)
- Time is stored in UTC (ISO 8601). Displayed in America/Guayaquil (UTC−5) unless the user changes it.
- Coordinates are stored in EPSG:4326. The analysis grid is EPSG:32717 (UTM 17S) at 30 m.
- Severity is always colour AND word: Normal, Watch, Warning, Severe (Spanish: Normal, Vigilancia, Aviso, Severo).
- The app supports, never replaces, the agronomist's judgment. Strategy screens say so.
- Do not use the NASA logo or imply NASA endorsement. Credit "Built with NASA Earth observations" in words.
- Nothing a judge opens may depend on a sleeping server: the app reads Supabase or static JSON snapshots directly.
- The demo is the replay of the 22–23 February 2026 Buenavista river flood (Pasaje, El Oro). It must never
  depend on a live download.

## 3. Architecture (summary; details in SPEC and CONTRACTS)

```
NASA + partner data (global only)
  -> pipeline/ingest   (data-engineer)      download, cache, harmonize to 30 m grid
  -> pipeline/engine   (data-scientist)     features, alert index W, state machine, calibration
  -> Supabase          (database-engineer)  farms, lots, zones, features, alerts, logs
  -> app/public/data   JSON snapshots for replay and offline
  -> app/              (frontend-engineer + product-designer) PWA: Home, Map, Lot, Strategies, Alerts, Learn, Setup
  -> backend/          (api-engineer)       FastAPI on Render: email (Resend), Telegram bot, protected re-runs
  -> .github/workflows (devops-engineer)    hourly pipeline in GitHub Actions; deploys to Render
```

Global datasets only: GPM IMERG, SMAP, GLDAS, SRTM, NASA POWER, ECOSTRESS, Landsat, MODIS/VIIRS, GRACE/GRACE-FO,
Sentinel-2 and ERA5 (ESA partner), FAO GAEZ, ISRIC SoilGrids (non-NASA, cite it). US-only datasets are forbidden
(Web Soil Survey, SSURGO, STATSGO2, CDL, PRISM, NAIP, NLCD, NLDAS, CoCoRaHS, NWIS, OpenET, LANDFIRE, AMS, NASS).

## 4. Stack

| Layer | Choice |
| --- | --- |
| Frontend | Vite + React + TypeScript + Tailwind, PWA via vite-plugin-pwa, Leaflet + NASA GIBS tiles, uPlot, @supabase/supabase-js. No router, i18n or state library: hand-rolled hash navigation, dictionaries and React context |
| Pipeline | Python 3.11, uv, earthaccess, xarray, rasterio, rioxarray, numpy, pandas, pysheds or WhiteboxTools |
| Backend | Python 3.11, FastAPI, httpx, Resend REST API, Telegram Bot API |
| Database | Supabase Postgres, row-level security, anonymous sign-in for device identity |
| CI/CD | GitHub Actions (hourly pipeline, checks), Render (Static Site for app, Web Service for backend) |
| Tests | pytest (pipeline, engine, backend), Vitest (app logic), Playwright (end-to-end, phone viewports) |

Package managers: npm for the app, uv for Python. Pin exact versions in lockfiles. New dependencies need approval (§6).

## 5. Environment: Windows 11 + PowerShell

Roberto develops on Windows 11 with PowerShell, VS Code, Node 22.11, Python 3.11.9, Git 2.47, Claude Code 2.1.325.
- Prefer cross-platform commands (`npm`, `uv`, `python`, `git`). When a shell command is needed, write it for PowerShell.
- Use forward slashes in code paths; never hard-code `C:\`.
- Set `PYTHONUTF8=1` when Python reads or writes text files.
- Test devices: iPhone 14 Pro, iPad Air M2; Android via Chrome DevTools emulation (360×780, CPU 4× slowdown, Slow 4G).

## 6. Approvals (who decides what)

Subagents cannot ask the user questions. When a decision needs Roberto, the agent writes it to
`docs/decisions/PENDING.md` and stops that branch of work. The main session reads PENDING.md after every block.

Always needs Roberto's approval (class A):
- new or upgraded dependencies; database schema changes; alert weights or thresholds;
- any change touching Rule zero or the data policy; substitution of a data source;
- High-importance changes to agent files (tools, model, effort, permissions, scope, rules).

Lead-architect may approve alone and must log in `docs/decisions/DECISIONS.md` (class B):
- Low-importance agent-file changes proposed by agent-ops-engineer (wording, clarity, examples, formatting);
- backward-compatible additions to contracts that change no existing field.

Everything else: the owning agent decides within its own paths and reports it.

## 7. Ownership: write only where you own

| Path | Owner |
| --- | --- |
| `docs/contracts/`, `docs/decisions/DECISIONS.md`, repo skeleton | lead-architect |
| `pipeline/ingest/`, `config/datasets.yaml` | data-engineer |
| `pipeline/engine/`, `config/alerts.yaml` | data-scientist |
| `supabase/` | database-engineer |
| `backend/` | api-engineer |
| `.github/`, `render.yaml`, `scripts/` | devops-engineer |
| `app/src/` (logic, state, data access) | frontend-engineer |
| `design/`, `app/src/styles/`, `app/src/components/ui/` | product-designer |
| `domain/` | agronomist |
| `tests/e2e/`, `docs/reports/qa/` | qa-demo-engineer |
| `docs/reports/`, `docs/SI_USE_LOG.md`, `docs/CITATIONS.md`, `docs/project-page/` | technical-writer |
| `docs/briefs/`, `docs/proposals/` | agent-ops-engineer |
| `docs/guide/` | instructor |
| `docs/reports/science/` | scientist-reviewer (read-only elsewhere) |

Anyone may append to `docs/decisions/PENDING.md` and `docs/HANDOFF.md`. Unit tests live next to the code of their owner.

## 7b. ECC test-coverage override

ECC's default rules require 80% test coverage. For this hackathon: tests are mandatory for `pipeline/engine`
(alert index, state machine, AHP, verification) and for the provenance checker. Elsewhere, test what is risky.
No coverage target outside the engine.

## 8. Workflow conventions

- Branch per build block: `block/0-skeleton`, `block/1-data`, `block/2-engine`, `block/3-app`, ...
- Conventional commits: `feat(engine): ...`, `fix(app): ...`, `docs(report): ...`. Reference task IDs: `T-012`.
- Engine and schema changes go through a pull request reviewed by ECC `code-reviewer` and `scientist-reviewer`
  (engine) or `database-reviewer` (schema). Other changes may be committed directly to the block branch.
- Every agent ends its run with a report in `docs/reports/<agent>/<YYYY-MM-DD-HHmm>.md` using the template in
  `docs/AGENTS.md`, and updates `TASKS.md`.
- Run `python scripts/check_provenance.py` before any commit that touches data files.
- Before building or changing UI, read `DESIGN.md`.
- Before you sleep or hand off: update `docs/HANDOFF.md` and run `/save-session`.

## 9. Definition of done (any task)

- Works on a 360 px wide viewport and on desktop.
- No invented data; provenance present; provenance checker passes.
- Owner's tests pass; engine tests always pass.
- Report written; TASKS.md updated; anything blocking is in PENDING.md.

## 10. Normal and energy mode

Normal mode (`scripts/start.ps1`): the main session and every custom agent run on Claude Opus 5.5 (`model: opus`).
Effort: `xhigh` for lead-architect, data-scientist and scientist-reviewer (where a mistake spreads); `high` for every
other agent. Energy mode (`scripts/start-energy.ps1`): main session on Opus 5.5, every subagent forced onto Sonnet via
`CLAUDE_CODE_SUBAGENT_MODEL=sonnet` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`; use it near the usage limit and for
documentation, reports and review sweeps. Do not edit agent files to switch modes. (D-008)

## 11. Token budget rules

- Read only the SPEC sections listed in your agent file (docs/spec/). Use `Grep` to find a passage before reading a file.
- Reports at most 60 lines. Summarise command output; never paste logs, data or whole files.
- One review per diff: either ECC `/code-review` or `/ponytail-review`, never both. Engine diffs add scientist-reviewer.
- At most 2 subagents at a time. Finish and commit a block before starting the next.
- Start a fresh session per build block; `/save-session` at the end of each block.
- Watch the Ponytail band (cost per task). If one task passes the equivalent of 15% of the 5-hour window, stop and
  ask the main session to split it.
- Near the limit: commit, write HANDOFF.md, `/save-session`, then restart with `scripts/start-energy.ps1`.
- claude-mem is a convenience, not a source of truth. HANDOFF.md, DECISIONS.md and reports remain authoritative.
  Memory is never a data source (Rule zero): any value recalled from memory must be re-verified from its file or source.
- Wrap anything sensitive in <private>…</private> so claude-mem never stores it.

## 12. Ponytail precedence

Ponytail runs in LITE mode only (never full or ultra). It may shorten implementation; it may never remove or skip:
Rule zero checks, provenance blocks, the provenance checker, tests required by §7b, contract fields, error handling at
trust boundaries, accessibility, or i18n keys. If Ponytail and this file disagree, this file wins.

## 13. Solo-build rules (since 14 Nov 2026)

- No task may wait on a human other than Roberto. If an agent needs domain input, it researches for at most
  15 minutes, then either cites what it opened or labels the item "estimated" / "not reviewed" and moves on.
- Class A questions go to Roberto in one batch per block, each with a recommended default. If Roberto has not
  answered by the end of the block, the recommended default applies and is logged as such.
- Unknown values are shown as unknown. Never invent a number to fill a gap left by the team change.
- Prefer cutting a nice-to-have over slowing a must-have.
