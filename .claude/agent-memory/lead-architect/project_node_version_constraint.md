---
name: project-node-version-constraint
description: Node on PATH reports 22.11.0 (not the 22.23.5 D-011 mentions), which caps app tooling at Vite 6.x, Vitest 4.x, plugin-react excluded
metadata:
  type: project
---

On 2026-11-14 `node` resolved to AppData/Local/nodejs-portable/node.exe and reported v22.11.0, although D-011 says a
Node 22.23.5 portable was added. Vite 7+/8, Vitest 5 and @vitejs/plugin-react 6 declare engines `>=22.12`, so the
app pins vite 6.4.6, vitest 4.1.12, vite-plugin-pwa 2.0.0 (engines >=20.19), typescript 5.9.3.

**Why:** the build must pass on Roberto's machine, CI and Render; CLAUDE.md §5 still states Node 22.11.
**How to apply:** do not propose Vite/Vitest major upgrades unless the team standardises on Node >= 22.12; any
upgrade is class A (PENDING.md). Re-check `node --version` before trusting this.

2026-11-15: in the agent's PowerShell, `node`/`npx` were NOT on PATH; `C:/Program Files/nodejs/npx.cmd` worked.
When frontend-engineer edits app/src in parallel, its half-done files break `tsc`; to prove a contracts.ts change
clean, `git archive HEAD app` into %TEMP%, copy the new contracts.ts, junction node_modules, run tsc there.
Delete the junction with `[System.IO.Directory]::Delete(path, $false)` BEFORE `Remove-Item -Recurse` (PS 5.1 can
follow junctions and wipe the real node_modules).
