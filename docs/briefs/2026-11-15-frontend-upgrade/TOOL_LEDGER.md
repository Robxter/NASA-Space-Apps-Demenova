# Tool ledger, block 3 frontend upgrade (D-033)

Append-only. One row per tool, skill file or command used, newest at the bottom. Spain time. Agents:
product-designer, frontend-engineer, qa-demo-engineer. "Tool / skill" is the exact file or command (for example
`impeccable/reference/layout.md`, `impeccable.cmd detect http://127.0.0.1:4173/`, `pw_mcp.mjs sweep.json`).
"Result" is a count or an outcome (for example "3 findings, 2 fixed", "PASS", "gate green at abc1234"), never a log.
The tool-use matrix in `00-plan.md` is audited against this table at the end of the block.

| Time | Agent | Tool / skill | Target | Result |
| --- | --- | --- | --- | --- |
| 09:05 | product-designer | `impeccable.cmd context` | repo root | NO_PRODUCT_MD, EXISTING_VISUAL_SYSTEM; CONTEXT_STALE hook-not-installed (hooks off by D-033, not repaired); Taste-kit PENDING entry skipped per D-034 |
| 09:05 | frontend-engineer | `impeccable.cmd context` | repo (A0) | NO_PRODUCT_MD + EXISTING_VISUAL_SYSTEM: scoped refinement allowed; subagent, no question tool, brief used as substitute; hooks left off (D-033) |
| 09:10 | frontend-engineer | Gate (typecheck, Vitest, build, check_bundle_size, e2e, e2e @perf) | baseline e1cafb2 | tsc ok, 76 tests, 94.3 kB gzip; e2e see next row |
| 09:20 | frontend-engineer | `mobile-native/SKILL.md` (Hard Rules, Symptom Table, Fixes 1-11, Baseline, Never Ship) | app/src screens, shell, index.html | 11 symptoms checked: 4 absent (ungated hover, 100vh, input zoom, carousel), 6 fixed in own files, 1 needs a phone (fix 11); 3 global CSS rules to CHANGE_LIST for PD |
| 09:15 | product-designer | `impeccable/reference/init.md` (no interview: subagent, no question tool) | PRODUCT.md | written; 9 sections, every fact marked "from <file>"; questions to report "Needs Roberto" |
| 09:20 | product-designer | `impeccable/reference/document.md` scan mode + `degraded/documenter.md` | DESIGN.md | written; frontmatter 30 colours, 7 type roles, 5 radii, 8 spacing, 7 components; sidecar not written (`.impeccable/` not PD-owned) |
| 09:20 | product-designer | `animation-vocabulary/SKILL.md` | DESIGN.md motion section | 9 terms used (Press feedback, Slide in, Ease-out, Ripple, Loop, Orchestration, Reduced motion; Scroll reveal, Stagger as not used) |
