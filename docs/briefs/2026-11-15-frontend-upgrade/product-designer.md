# Brief: product-designer, block 3 frontend upgrade (D-033)

Goal: the visual system (tokens, `app/src/components/ui/`, motion) gives every Operate-mode screen precision and
restraint, with one bold moment (a lot turning Severe in the replay), plus a prioritised change list frontend-engineer
can apply without guessing. Roberto: "upgrade the frontend ... USE THEM FULLY except for Figma".
Context: plan and times in `00-plan.md`; tools in `docs/DESIGN_TOOLS.md`; your system in `design/BRIEF.md` (palette,
severity table with measured contrast, logo option 1 "Core", D-015). Skills live in `.claude/skills/`; read only the
files and sections named here, never a whole kit.

## Guardrails (reasons in CLAUDE.md §1-2, §6-7)
1. Rule zero: every number keeps its origin badge and timestamp; missing shows "No data"/"Sin datos"; the "Demo"
   label stays; nothing says the app predicted the Feb 2026 flood; verification is counts only.
2. Severity is colour AND word (Normal, Watch, Warning, Severe / Normal, Vigilancia, Aviso, Severo). Keep the badges
   "Not yet reviewed by a local agronomist", "Experimental", "Estimated" and "Built with NASA Earth observations" in
   words; no NASA logo; never name the former team agronomist.
3. 360 px and desktop; WCAG AA (severity text keeps its measured AAA), visible focus, 44 px targets, reduced motion.
   Severity hex values stay unless you measure a failure; then record old and new ratios in DESIGN.md.
4. No new npm dependencies (class A: PENDING.md entry with a recommendation, continue without). Motion is CSS and the
   platform. No external fonts or CDNs; no inline `<style>`, `<script>` or `style=""` in HTML (CSP `'self'`).
   Initial JS at most 150 kB gzip (94.3 now); nothing may delay first render.
5. No changes to data, engine, contracts, backend, Supabase, snapshots, the hCaptcha flow or offline behaviour.
6. Write only `design/`, `app/src/styles/`, `app/src/components/ui/`, `PRODUCT.md`, `DESIGN.md` (`app/public/about/`
   only in the stretch, once recorded). Keep ui props backward-compatible (add, never rename) so screens still compile.
7. In A and B do not build or run e2e (frontend-engineer owns `app/dist` and port 4173). Before each commit:
   `npm --prefix app run typecheck` and `npm --prefix app run test` green.
Every step: append a row to `TOOL_LEDGER.md`, then `git commit -m "<type>(design): ... (D-033)" -- <paths>`.

## Phase A (09:25-11:00)
A0 (5 min) `.claude\skills\impeccable\scripts\impeccable.cmd context` (once). Append to `docs/decisions/PENDING.md`
   (next free P-number): "Vendor Taste 2.5.1 kit files (MIT, `assets/system.css`, `system.js`) with their LICENSE into
   `app/public/about/assets/` for the stretch About page? (a) yes (b) no, hand-written CSS/JS. Recommend (b) unless
   the gate needs the kit". Continue without waiting.
A1 (15 min) Read `impeccable/reference/init.md`, `document.md`, `degraded/documenter.md`, `animation-vocabulary/SKILL.md`.
   Write `PRODUCT.md` and `DESIGN.md` from these sources only: `design/BRIEF.md`, `README.md`, `docs/spec/17-*.md`,
   `docs/spec/18-*.md`, the brief in `.claude/agents/frontend/product-designer.md`, `app/src/styles/*.css`. You cannot
   run init's interview: mark each inference "from <file>", list questions under "Needs Roberto" in your report.
   Mode Operate for all app screens; motion named with animation-vocabulary terms.
A2 (20 min) `npm --prefix app run dev -- --port 5174 --strictPort` (background). Look first:
   `node scripts/pw_mcp.mjs .playwright-mcp/product-designer/a2.json --max-chars 800` for `#home`, `#map`,
   `#lot/lot_demo-el-oro_1`, `#strategies/lot_demo-el-oro_1`, `#alerts`, `#learn`, `#setup` at 360x780 and 1440x900,
   light and dark (`browser_emulate_media`), plus 360 Spanish dark (app's own language toggle); `browser_wait_for`
   before each `browser_take_screenshot`. Then `...impeccable.cmd detect http://127.0.0.1:5174/`. Done: 35 shots and
   detect counts in the ledger.
A3 (20 min) Read `impeccable/reference/critique.md`, `critique-rubric.md`, `audit.md`, `mode-operate.md`, `operate.md`
   (no sub-agent tool: degraded single-context critique, opened by the playbook's banner). Anti-generic lens, these
   sections only: `design-taste-frontend-v1` §3, §7, §10 (dials variance 3, motion 3, density 6; skip §2's stack and
   icon packages); `design-taste-frontend-v2-experimental` §0, §8, §9, §14; `high-end-visual-design` §2, §4, §8;
   `minimalist-ui` §2, §3, §5 (not its palette); `emil-design-eng` "Review Format (Required)" for ui components.
   Copy: `design-taste-frontend/references/copy.md`, `copy-voice.md`, `copy-tells.md` -> en and es proposals in
   `design/upgrade/copy-proposals.md` (new wording of existing facts only); run
   `node .claude/skills/design-taste-frontend/scripts/copy-lint.mjs design/upgrade/copy-proposals.md --kind software`.
   By 10:20 commit `design/upgrade/CHANGE_LIST.md`: items `CL-01...` in P1/P2/P3, one line each with target, owner
   (PD or FE), change as a checkable statement, finding, check. Example:
   `CL-04 P1 FE Home lot list: severity word and lot name share one 17 px baseline; meta line 13 px ink-2 (critique H3) - check 360 en/es`.
A4 (15 min) Read `prototype/SKILL.md` (phases 1-5) with `PICKER.md`, and `choreograph/SKILL.md` with the
   `RECIPES.md` entry you use. At most three variants of "lot turns Severe" in standalone
   `design/prototypes/severe-moment.html` (CSS and JS files beside it, no CDN, sample lot labelled "Demo"). Pick one
   by `review-animations/SKILL.md` + `STANDARDS.md`; add the pick and timings to CHANGE_LIST (owner FE). Roberto may
   override before 15:00.
A5 (to 11:00) Read `impeccable/reference/craft-floor.md` first, then `typeset.md`, `layout.md`, `colorize.md` (colour
   outside severity only), `extract.md`, `polish.md` + `degraded/finish-reviewer.md`, `animate.md`, `animate/SKILL.md`,
   `design-taste-frontend/references/motion.md` and `system.md`, `apple-design/SKILL.md` §14-§15. Implement in
   `theme.css`, `tokens.css`, `index.css` (duration and easing tokens with reduced-motion fallback, type scale,
   spacing) and the ui components your CL items name; extract a new component only for a pattern on 2+ screens.
   Done: typecheck and Vitest green, `design/components/<Name>.md` updated, one commit per component group.

## Phase B (11:15-12:20)
B1 (20 min) `ReplayScrubber.tsx`: read `gestures/SKILL.md` (two phases, Touch checklist, Reduced motion) and
   `apple-design/SKILL.md` §2, §8, §9. Keep the native `input type="range"`; thumb hit area at least 44 px; track,
   thumb and pressed state from tokens; no data change. Check with `browser_drag` at 360 and 1440.
B2 (25 min) Review frontend-engineer's commits (`git log --oneline -15`): `review-animations/SKILL.md` + `STANDARDS.md`
   + `impeccable/reference/degraded/motion-reviewer.md`; `improve-animations/SKILL.md` on `dn-ripple`, `dn-lot-onset`;
   `remove-animations/SKILL.md` for motion that answers no user action (the Severe moment excepted); `quieter.md` if
   Home or Map read noisy; `polish.md` on ui components. FE findings go to CHANGE_LIST "Review round".
B3 (10 min) `impeccable/reference/delight.md`, only on the Severe moment and the empty states.
B4 (10 min) Look again at 360 and 1440, both themes, en and es; remove one accessory; commit; report.

## Phase C
C1 (12:20-13:00, docs only) `learn-taste/SKILL.md` phases 1-5 over Roberto's verbatim words (Grep `Roberto` in
   `docs/decisions/DECISIONS.md`, `docs/reports/`) -> `design/upgrade/taste-rules-proposed.md`; no phase 6.
C2 (13:00-13:10) Fix QA blockers in your paths, one commit each.

## Stretch S (13:20-14:20; only after QA-GREEN and the recorded `app/public/about/` ownership)
Goal: a short static "About Demenova" page, `app/public/about/index.html`, built with the full Taste 2.5.1 flow.
Read `design-taste-frontend/SKILL.md` §1, §4 (steps 0-7), §5, §6 and `references/gate.md` "Arm it", "What it does".
1. Kind `software`. Material: real screenshots of the built app with the "Demo" label visible (at most 3 PNGs
   committed), one NASA GIBS image from `https://gibs.earthdata.nasa.gov` (CSP `img-src` allows it), and
   `design/logo/option-1-core.svg`. No photographs of people or farms: never run `photos.mjs` or `icons.mjs`; house
   rules 6 and 7 yield to this.
2. Copy only from `README.md` and `docs/project-page/project-page.md`; no `data-assumed` facts; footer credit in
   words: "Built with NASA Earth observations" plus the GIBS imagery credit. Primary action: open the app (`/`).
3. Arm: `node .claude/skills/design-taste-frontend/scripts/gate.mjs --start app/dist/about/index.html --root app/dist --kind software --category "<from README>" --primary "Open the app"`.
   Colours via `start.mjs brand` with Demenova hexes, not `deal`. Delete the Google Fonts links `start.mjs` prints;
   use the app's system font stack (CSP `font-src 'self'`). CSS and JS as files, never inline.
4. Kit files only if Roberto answered (a) to the A0 entry; otherwise hand-write.
5. In S you build (QA and frontend-engineer are idle): `npm --prefix app run build` before every gate run. Ask
   frontend-engineer in HANDOFF.md for the `/about/` service-worker exclusion. Done: `gate.mjs app/dist/about/index.html`
   says PASS. At 14:20 without PASS: `gate.mjs --done "cut by plan at 14:20 (00-plan.md cut order 1)"`, revert.
6. Anything beyond the CSP: "devops must change: ..." in your report and in PENDING.md.

## Definition of done
CHANGE_LIST by 10:20; tokens and components committed; review round done; typecheck and Vitest green; ledger rows
for every tool; report `docs/reports/product-designer/<YYYY-MM-DD-HHmm>.md` (template in `docs/AGENTS.md`, at most
60 lines) with CL items done and open; memory updated with what worked.
