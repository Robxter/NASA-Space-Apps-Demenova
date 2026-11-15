---
id: AP-001
status: proposed
date: 2026-11-15
author: agent-ops-engineer
suggested_class: A (scope change to an agent file, CLAUDE.md §6)
---

# AP-001: give product-designer ownership of `app/public/about/`

## Agent file
`.claude/agents/frontend/product-designer.md`, section "You own".

## Exact diff
```diff
 ## You own
 `design/` (brief, tokens, component specs, logo files, screen mockups), `app/src/styles/` (tokens CSS, Tailwind theme),
 `app/src/components/ui/` (presentational components: Button, Card, Badge, SeverityPill, Value, Sheet, TabBar,
-Chart frame, Empty and Error states).
+Chart frame, Empty and Error states), `app/public/about/` (the static About page: HTML, its CSS and JS files, and
+its images), and `PRODUCT.md`, `DESIGN.md` at the repo root (Impeccable project files, D-033).
```
CLAUDE.md §7 would gain one row: `app/public/about/` -> product-designer (main session or lead-architect edits it).

## Reason
The block 3 plan (`docs/briefs/2026-11-15-frontend-upgrade/00-plan.md`) builds a stretch "About Demenova" page with the
Taste 2.5.1 flow at `app/public/about/`. No agent owns that path today (frontend-engineer owns `app/src/`,
`app/vite.config.ts` and the manifest only), so without an owner the page cannot be built without breaking CLAUDE.md §7.
PRODUCT.md and DESIGN.md are already granted for this block by D-033; the diff makes both grants durable.

## For this run
The briefs do not rely on this proposal. The stretch starts only if the main session records the assignment under
D-033 in DECISIONS.md; otherwise the stretch is cut (cut order 1).
