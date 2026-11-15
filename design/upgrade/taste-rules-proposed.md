# Taste rules proposed (learn-taste phases 1-5, D-033 C1)

Owner: product-designer, 2026-11-15. Nothing here is written into DESIGN.md: phase 6 ("write on approval") waits for
Roberto. Sources (phase 1): Roberto's words and choices in `docs/decisions/DECISIONS.md` (D-015, D-025, D-026,
D-027, D-029, D-031, D-033) and the brief he gave for this role ("The brief (from Roberto)" in
`.claude/agents/frontend/product-designer.md`). Roberto made no design correction in this session's turns (his only
message was "continue"), and the reports in `docs/reports/` quote him only on process and data, not on design.

## Rules to add

| # | You said / chose | Rule | Why | Where |
| --- | --- | --- | --- | --- |
| 1 | Picked logo option 1 "Core" over "Torn leaf" and "Nova D" (D-015, reason recorded: "Logo and severity glyph are one idea") | New icons, illustrations and empty-state art are drawn from the soil core (rounded rectangle, water line, dashed when out of reach); never a second motif (leaf, globe, satellite, sparkle) | The recorded reason: logo and severity glyph are one idea, so one object carries brand and state | DESIGN.md › Do's and Don'ts |
| 2 | "The memorable moment: a lot turning from calm to Severe on the map during the flood replay. Spend boldness there; keep everything else quiet." (role brief) | Only one orchestrated motion exists: the Flood (`dn-core-flood`, `dn-lot-spill`). Every other motion answers a touch and lasts at most 320 ms. A new `@keyframes` needs Roberto's approval first | Roberto's words: boldness in one place, everything else quiet | DESIGN.md › Motion (exists as "The One Moment Rule": make it a check, #C1) |
| 3 | "Light and dark mode following the phone" (role brief) | Theme follows `prefers-color-scheme` unless the user sets it in Settings; never a theme picked by screen | Roberto's words | DESIGN.md › Colors (one line; the tokens already do this) |
| 4 | "Never claim the engine predicted the Feb 2026 flood" and the threshold wording (D-029) | No screen, label or empty state says the app predicted, forecast or anticipated the 22-23 Feb 2026 flood; in Spanish neither "predijo", "pronosticó" nor "anticipó". The threshold is described as "a design choice", never "calibrated" | D-029: the demo lots escalated earlier from earlier storms; the threshold was chosen after seeing the 2026 floods | DESIGN.md › Do's and Don'ts + check #C2 |

## Needs your answer

- Rule 1: the why is the recorded reason in D-015, not a quote of your words. Is it right? Recommendation: yes.
- Rule 2: should "at most 320 ms" bind sheets too (320 ms is the sheet duration today)? Recommendation: yes, 320 ms is the ceiling.
- DESIGN.md is read only if an agent is told to. Add `Before building or changing UI, read DESIGN.md.` to CLAUDE.md
  (owned by you and lead-architect)? Recommendation: yes.

## Conflicts

- Your agronomy-badge wording "General guidance — not reviewed by an agronomist" (FIX2 via D-025, D-026; asserted by
  `actions.test.ts`) contains an em dash. Taste's copy rules (v2 §9.G, copy-lint) ban the em dash, and copy proposal
  CL-07 replaced it with a comma, which frontend-engineer held back. Keep your wording as written (recommended: it is
  your decision text and a test asserts it), or approve the comma ("General guidance, not yet reviewed by a local agronomist").

## Make it a check

- C1 (rule 2) Vitest next to the styles (`app/src/styles/motion.test.ts`, product-designer): read `index.css` and
  `theme.css`, collect `@keyframes` names and assert they equal `['dn-core-flood', 'dn-lot-spill']`; scan
  `app/src/**/*.tsx` for `animate-` classes and assert none. Flags today: 0.
- C2 (rule 4) Vitest next to the dictionaries (`app/src/i18n/claims.test.ts`, frontend-engineer):
  `/predic|predij|forecast|pron[oó]stic|anticip/i` must not match any value in `en.ts` or `es.ts`.
  Flags today: 0.

## Skipped

- "USE THEM FULLY except for Figma" (D-033): a workflow instruction for this block, not a visual rule.
- Never naming the former team agronomist (D-027, D-031): already a rule in CLAUDE.md and the briefs, with a check (the e2e name sweep).
- "Not yet reviewed by a local agronomist" on strategy and action screens (D-025): already enforced by tests and the brief guardrails; see the conflict above for its punctuation.
- Severity as colour AND word, the NASA credit in words, and the "Demo" label: already rules in CLAUDE.md §1-2 with e2e checks.
- The hCaptcha and data-scope decisions (D-028, D-032): product and security, not taste.

Say `write all` or `write 1, 3`, and answer the questions above.

## Status

Approved by Roberto on 2026-11-15 ("APPROVE ALL"): rules 1-4, both checks, the three recommendations, and keeping
the D-025 badge wording with its dash. Written into DESIGN.md › Do's and Don'ts › "Approved by Roberto" and the
Motion section. C1 implemented (`app/src/styles/motion.test.ts`, 0 flags). C2 is CL-32 (frontend-engineer, its
dictionary path). The CLAUDE.md line is for the main session (`docs/HANDOFF.md`): product-designer does not own CLAUDE.md.
