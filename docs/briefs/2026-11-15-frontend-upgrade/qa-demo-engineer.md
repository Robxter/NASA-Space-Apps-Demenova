# Brief: qa-demo-engineer, block 3 frontend upgrade (D-033)

Goal: a GREEN or RED verdict on the block/3-polish release candidate by 13:00 (re-check by 13:20), backed by the full
e2e suite, Impeccable's detector on the served build, a Playwright MCP visual sweep, worst-case and a11y checks and
the performance budget, so the main session can merge with confidence before the 15:00 recording.
Context: plan in `00-plan.md`; tools in `docs/DESIGN_TOOLS.md`; what changed in `design/upgrade/CHANGE_LIST.md`, in
frontend-engineer's HANDOFF.md entry and in the latest product-designer and frontend-engineer reports; your baseline
`docs/reports/qa/2026-11-15-0607.md`. Your C1 run is the full e2e gate for phase B (frontend-engineer ran only tsc,
Vitest and the build). Skills are under `.claude/skills/`; you have no Skill tool, so Read only the files named here.

## Guardrails (reasons in CLAUDE.md §1-2, §7)
1. Rule zero is what you protect most: every number keeps its origin badge and timestamp; missing shows "No data"/
   "Sin datos"; the "Demo" label is visible wherever synthetic data appears; no text says the app predicted the
   Feb 2026 flood; verification shows counts (hits, misses, false alarms), never %.
2. Severity colour AND word (Normal, Watch, Warning, Severe / Normal, Vigilancia, Aviso, Severo); badges "Not yet
   reviewed by a local agronomist", "Experimental", "Estimated"; "Built with NASA Earth observations" in words; no
   NASA logo; the former team agronomist is never named.
3. Expected values come from `app/public/data/demo/`, never from a guess.
4. You fix only test code (`tests/e2e/`, `docs/reports/qa/`). If a selector broke because of an intended CL item,
   update the selector and keep the assertion's meaning; if behaviour regressed, file it for the owner in TASKS.md
   and mark it a blocker. Never weaken an assertion to pass.
5. No new dependencies; no edits outside your paths; screenshots stay in `.playwright-mcp/qa-demo-engineer/`.
Every step: append a row to `TOOL_LEDGER.md`; commit `git commit -m "test(e2e): ... (D-033)" -- <paths>`.

## C1 (12:20-13:00)
1. (5 min) `git switch block/3-polish`; PowerShell `$env:Path = 'C:\Program Files\nodejs;' + $env:Path`;
   `.claude\skills\impeccable\scripts\impeccable.cmd context` (once); `npm --prefix app run typecheck`;
   `npm --prefix app run test`; `npm --prefix app run build`; `node scripts/check_bundle_size.mjs`; start
   `node tests/e2e/serve.mjs 4173` in the background.
2. (5 min; needed because the local server sends no CSP) Add an opt-in `--csp` flag to `tests/e2e/serve.mjs` that
   sends the exact Content-Security-Policy value from `render.yaml` (path `/*`), and one spec that opens every screen
   under it and fails on any CSP violation in the console. It catches inline `style=""`, inline scripts and external
   fonts the upgrade might add.
3. (10 min) `cd tests/e2e; npx playwright test`, then `npx playwright test --grep @perf --workers=1` alone. Expect
   149 + 2 passed, plus the new CSP spec. Triage each failure with guardrail 4.
4. (3 min) `...impeccable.cmd detect http://127.0.0.1:4173/` (also with `#map` and `#lot/lot_demo-el-oro_1` if the
   detector accepts a hash). Count findings by rule; a finding on contrast, focus or target size is a blocker.
5. (10 min) Playwright MCP sweep: `node scripts/pw_mcp.mjs .playwright-mcp/qa-demo-engineer/sweep.json --max-chars 600`
   (`--list-tools` once for the exact tool names). Matrix: all 7 screens (`#home`, `#map`, `#lot/lot_demo-el-oro_1`,
   `#strategies/lot_demo-el-oro_1`, `#alerts`, `#learn`, `#setup`) at 360x780 en light and 360x780 es dark; Home,
   Map, Lot, Strategies at 393x852, 820x1180, 1440x900 in light and dark (en). Wait for content (`browser_wait_for`)
   before each screenshot. Per shot, check guardrails 1-2 by eye and in the `browser_snapshot` text;
   `browser_console_messages` has no errors. With `browser_emulate_media` reduced motion the Severe pulse does not
   play. Drag the replay scrubber (`browser_drag`) from 20 Jan to 23 Feb: the Severe moment plays once per transition.
6. (5 min) Worst case: read `break-ui/SKILL.md` "Phase 4" and the states rows of `CATALOG.md`; run
   `npm --prefix app run dev -- --port 5175 --strictPort` with `?data=worst` and screenshot Home, Lot, Alerts at 360.
   The fixture must be absent from the build: `Select-String -Path app/dist/assets/*.js -Pattern 'worst-case'`.
7. (5 min) a11y, motion, performance: read `impeccable/reference/audit.md` (a11y, responsive, performance parts),
   `review-animations/SKILL.md` with `STANDARDS.md`, and `animation-performance/SKILL.md`, as checklists. Check Tab
   order and visible focus on Home and Setup; 44 px targets on the tab bar, scrubber and sheet close; contrast of
   severity words on their tints in both themes; `lang` follows the language. Performance: the @perf numbers against
   3 s (Fast 4G + CPU 4x) and the bundle number against 150 kB.
8. Report (template in `docs/AGENTS.md`, at most 60 lines): verdict GREEN or RED on the first line; blockers with
   owner, steps and screenshot name; non-blocking findings; ledger rows written.
Blocker = a failing test, a Rule zero or severity-word violation, a CSP violation, an a11y regression, a budget over
its limit, a broken offline reopen or broken en/es parity.

## C3 (13:10-13:20)
Rebuild, rerun the specs that failed, then the full suite and @perf alone. GREEN only if all pass. Write the green
commit hash in the ledger and the report; the main session merges only that hash.

## S-QA (14:20-14:35, only if the stretch reached gate PASS)
1. Build and serve with `--csp`; open `/` (registers the service worker), then `/about/`: the About page loads, not
   the app shell; no CSP violation; no external font request; images only from `'self'` and
   `gibs.earthdata.nasa.gov`.
2. Claims: every sentence on `/about/` is backed by `README.md` or `docs/project-page/project-page.md`; no
   photographs of people or farms; the logo is Demenova's own; the NASA credit is in words, with no NASA logo.
3. Screenshots at 360x780 and 1440x900, light and dark; then the full e2e suite and @perf again (the service-worker
   change touches offline). Any failure: verdict RED for the stretch; its owners revert it.

## Definition of done
Verdict and green hash in the report and the ledger; e2e suite green; new CSP spec committed; device checklist rows
for Roberto unchanged; TASKS.md updated with every bug and its owner.
