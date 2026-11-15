# Block 3 frontend upgrade: plan (D-033)

Written by agent-ops-engineer, 2026-11-15 09:20 Spain. Branch `block/3-polish` (stacked on `block/2-core`; the live
site deploys from `block/2-core`, so nothing here is live until QA is green and the main session merges).

## Goal
Every app screen looks and feels like a precise, native-quality field tool at 360 px and on desktop, in en/es and
light/dark. Every tool Roberto named is used and logged, and Rule zero, accessibility and the budgets stay intact.
QA-green on the release candidate by about 13:20; demo recording starts at 15:00.

Roberto, verbatim: "use the ai coordinator agent so it coordinates all the correspondent agents to upgrade the
frontend using the following tools ... every tool except figma, and set up all of them, USE THEM FULLY except for Figma".

## Phases (Spain time; at most 2 agents at once; flat delegation: the main session launches every agent)

| Phase | Time | Agents | Brief sections | Ends with |
| --- | --- | --- | --- | --- |
| A | 09:25-11:00 | product-designer + frontend-engineer | `product-designer.md` A, `frontend-engineer.md` A | `design/upgrade/CHANGE_LIST.md` by 10:20; tokens + ui components; mobile-native, break-ui and perf fixes |
| Gate A | 11:00-11:15 | frontend-engineer | Gate | tsc, Vitest 76, build + bundle check, e2e 149 + 2 perf alone, all green; hash in the ledger |
| B | 11:15-12:20 | frontend-engineer + product-designer | B sections | change list applied screen by screen; motion and gesture review |
| Gate B-lite | 12:15-12:20 | frontend-engineer | Gate B-lite | tsc, Vitest, build + bundle green (the full e2e runs in C1) |
| C1 | 12:20-13:00 | qa-demo-engineer (+ product-designer learn-taste, docs only) | `qa-demo-engineer.md` C1 | verdict GREEN or a blocker list |
| C2 | 13:00-13:10 | frontend-engineer (+ product-designer if a ui component) | Fix round | blockers fixed, one commit each |
| C3 | 13:10-13:20 | qa-demo-engineer | C3 | QA-GREEN hash; main session may merge |
| S (stretch) | 13:20-14:20 | product-designer, then frontend-engineer (10 min) | Stretch sections | About page `app/public/about/` passes the Taste gate |
| S-QA | 14:20-14:35 | qa-demo-engineer | S-QA | `/about/` green, app suite still green |
| Buffer | to 15:00 | main session | | merge, deploy check, HANDOFF.md |

Rules for every phase
- Commit after every step: `git add <own paths>` then `git commit -m "<type>(<scope>): <what> (D-033)" -- <own paths>`.
  The `-- <paths>` form commits only your paths even if the other agent has staged files. No push.
- Only frontend-engineer runs `npm --prefix app run build` and the e2e suite in phases A and B (one `app/dist`, one
  port 4173). product-designer looks at the dev server on port 5174. qa-demo-engineer owns 4173 in phase C.
- A usage-limit stop loses at most one step: before stopping, write the step's state to `docs/HANDOFF.md`.
- If a gate is red at its end time, the owner reverts its commits since the last green hash (`git revert`), records
  why, and moves on; no phase starts on a red gate.
- Screenshots and steps files live in `.playwright-mcp/<agent>/` (git-ignored). Never commit them in bulk; the About
  page may commit at most 3 real app screenshots that it uses.
- `TOOL_LEDGER.md` (this folder) is append-only for the three agents, like PENDING.md, at the main session's request;
  the main session records this exception under D-033. One row per tool use; if a write fails because the file
  changed, re-read it and append again.

## Cut order (first line is cut first)
1. Stretch About page (at 14:20 it is reverted unless the gate says PASS; S-QA must then be green).
2. learn-taste report and prototype harness polish.
3. Sheet drag-to-dismiss (the close button, Escape and focus return stay).
4. Choreography beyond the one Severe moment.
5. Phase B on Strategies, Learn, Setup (they keep phase A tokens and components only).
6. QA sweep reduced to 360 px (en light, es dark) + 1440 px light.
Never cut: Rule zero checks, a11y, en/es parity, the gates, QA-green.

## Owned paths in this block
product-designer: `design/`, `app/src/styles/`, `app/src/components/ui/` (includes `ReplayScrubber.tsx`),
`PRODUCT.md`, `DESIGN.md` (D-033). frontend-engineer: the rest of `app/src/` (includes `screens/Lot/ReliabilitySheet.tsx`),
`app/vite.config.ts`, `app/public/manifest.webmanifest`, Vitest tests. qa-demo-engineer: `tests/e2e/`, `docs/reports/qa/`.
`app/public/about/` is owned by nobody yet. The stretch starts only if the main session (lead-architect) records
"`app/public/about/` owned by product-designer for D-033" in DECISIONS.md; proposal AP-001 makes it permanent.
Touched by nobody: `app/public/data/`, `pipeline/`, `supabase/`, `backend/`, `docs/contracts/`, `render.yaml`,
`app/index.html` (needed edits are reported to the main session), the hCaptcha connect flow, offline behaviour.

## Tool-use matrix (audit "used fully" against TOOL_LEDGER.md)
PD = product-designer, FE = frontend-engineer, QA = qa-demo-engineer. Paths under `.claude/skills/`.

| Tool / skill / command | Used by, where | Or: not applicable because |
| --- | --- | --- |
| Impeccable engine `impeccable.cmd context` | PD A0, FE A0, QA C1 (once per session each) | |
| Impeccable engine `impeccable.cmd detect <url>` | PD A2 (dev 5174), QA C1 (built 4173) | |
| impeccable `init` (PRODUCT.md) | PD A1 | |
| impeccable `document` (DESIGN.md) + `degraded/documenter.md` | PD A1 | |
| impeccable `critique` + `critique-rubric.md` | PD A3, degraded single-context run with its banner | |
| impeccable `audit` | PD A3 (design), QA C1 step 7 (release candidate) | |
| impeccable `layout`, `typeset`, `colorize` | PD A5 (tokens, ui); FE B (layout on screens) | |
| impeccable `polish` + `degraded/finish-reviewer.md` | PD A5, PD B2 | |
| impeccable `harden`, `clarify` | FE A4 | |
| impeccable `adapt`, `onboard`, `distill`, `animate` | FE B (animate also PD A5) | |
| impeccable `delight`, `quieter` | PD B3 (Severe moment, empty states); PD B2 (noise check) | |
| impeccable `extract` | PD A5 (patterns on 2+ screens become ui components) | |
| impeccable `optimize` | FE A3 (diagnose; render-path fixes only) | |
| `craft-floor.md`, `mode-operate.md`, `operate.md` | PD and FE before any UI edit | |
| `degraded/motion-reviewer.md` | PD B2 | |
| impeccable `shape`, `craft` | | no new feature to plan; craft is a deprecated alias |
| impeccable `bolder`, `overdrive` | | Operate mode: ambition is restraint; the brief spends boldness only on the Severe moment |
| impeccable `live`, `generate`, `degraded/manual-edit-applier.md` | | a human picks in a live browser overlay that injects scripts (CSP); no human in the loop today |
| `new-work*.md`, `mode-persuade.md`, `degraded/asset-producer.md` | | refinement of an incumbent world; the one new surface follows Taste 2.5.1 by main-session direction |
| `ios.md`, `android.md`, `*.native.md` | | web PWA, not a native platform |
| `pin`, `hooks`, `doctor`, `foundations` | | change the installation, hooks disabled by D-033, or outside scope (secrets, CI); a CONTEXT_STALE line is reported only |
| engine `login`, `world`, `health`, `walkthrough`, `install`, `update`, `telemetry on` | | forbidden by docs/DESIGN_TOOLS.md (online account, installation changes) |
| Emil `emil-design-eng` | PD A3 (review format), FE B (review checklist) | |
| Emil `animation-vocabulary` | PD A1 (motion names in DESIGN.md) | |
| Emil `prototype` (+ `PICKER.md`), `choreograph` (+ `RECIPES.md`) | PD A4 (Severe-moment variants); FE B (implements the pick) | |
| Emil `animate` | PD A5 (motion tokens), FE B (screens) | |
| Emil `mobile-native`, `break-ui` (+ `CATALOG.md`) | FE A1, FE A2; QA C1 step 6 (break-ui phase 4 check) | |
| Emil `animation-performance`, `find-animation-opportunities` | FE A3; QA C1 step 7 (performance checklist) | |
| Emil `gestures`, `apple-design` | PD B1 (ReplayScrubber), FE B (ReliabilitySheet) | |
| Emil `improve-animations`, `review-animations` (+ `STANDARDS.md`), `remove-animations` | PD B2; QA C1 step 7 (review-animations as checklist) | |
| Emil `pick-ui-library` | FE A5, consult only; any library goes to PENDING (class A) | |
| Emil `learn-taste` | PD C1, phases 1-5 only (report); phase 6 needs Roberto | |
| Emil `animate-expo`, `write-swift`, `ask-sonner` | | React Native, Swift, a toast library (new dependency) |
| Taste classics v1, v2-experimental, high-end-visual-design, minimalist-ui | PD A3 anti-generic pass (named sections only) | their stacks, icon packages and palettes do not apply: no new deps, the brief's palette wins |
| Taste 2.5.1 `references/copy.md`, `copy-voice.md`, `copy-tells.md`, `scripts/copy-lint.mjs` | PD A3 copy proposals (en/es); FE A4 applies them | |
| Taste 2.5.1 `references/motion.md`, `system.md` | PD A5 motion and system notes | |
| Taste 2.5.1 full flow: `start.mjs`, `moments.mjs`, `assets/layout/deal.mjs`, `consistency.mjs`, `shoot.mjs`, `perf.mjs`, `gate.mjs` | PD stretch S (About page only) | |
| Taste 2.5.1 `photos.mjs`, `icons.mjs`, `library/palettes.json` | | no stand-in photographs or third-party icons (Rule zero, main session); the Demenova palette is fixed |
| Taste 2.5.1 page rules (sections, heroes, scenes) on app screens | | written for marketing pages; Operate screens keep native patterns |
| Playwright MCP via `node scripts/pw_mcp.mjs` | PD A2/B1/B4, FE B look loop, QA C1 sweep, S-QA | |
| ECC `frontend-design` (PD's preloaded skill) | PD throughout, as before | |
| Figma MCP | | excluded by Roberto |

## Hard guardrails (every brief repeats them)
Rule zero; severity colour AND word; badges and credit stay; 360 px + desktop + a11y + en/es parity; no new npm
dependencies; CSP (`script-src 'self'`, `style-src 'self'`, `font-src 'self'`: no inline `<style>`, `<script>` or
`style=""` in HTML, no external fonts); initial JS at most 150 kB gzip; cold load under 3 s; no data, engine,
contract, backend, Supabase, snapshot, hCaptcha or offline changes; own paths only; QA updates tests, never weakens them.

## Open items for the main session
- Record under D-033: the TOOL_LEDGER append exception and the `app/public/about/` ownership (or cut the stretch).
- PD A0 writes a PENDING entry: vendoring Taste kit files (MIT) into `app/public/about/` is third-party code (class A).
- `app/index.html` (theme-color for light/dark, if mobile-native asks for it) has no owner in CLAUDE.md §7.
- Report template conflict: agent-ops-engineer may write only briefs and proposals, so this plan stands as its report.
