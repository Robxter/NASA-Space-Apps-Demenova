---
name: screenshot-tooling
description: How to screenshot the Demenova app and design prototypes (Playwright MCP bridge since D-033; old headless Edge fallback)
metadata:
  type: reference
---

Since 2026-11-15 (D-033): `node scripts/pw_mcp.mjs <steps.json> --max-chars 300` drives Playwright MCP (headless Edge).
Prefix PowerShell with `$env:Path = 'C:\Program Files\nodejs;' + $env:Path`. Keep steps and shots in
`.playwright-mcp/product-designer/` (git-ignored); my generator `gen-steps.mjs` and static server `serve.mjs` live there.
- Dev server: `npm --prefix app run dev -- --port 5174 --strictPort --host 127.0.0.1` (4173 belongs to frontend-engineer).
- The language toggle is on `#settings` (Segmented "Español"/"English"), not `#setup`. PowerShell mangles "ñ" in
  generated JSON: match `startsWith('Espa')`.
- `file://` pages render blank in the MCP browser: serve the repo root (`node serve.mjs . 5175`). Prototypes opened
  from disk need classic scripts, not ES modules.
- Theme: `browser_emulate_media {colorScheme}`; always `browser_wait_for` before `browser_take_screenshot`.
- fullPage shots draw the fixed tab bar mid-page: an artefact, not a bug.
- `impeccable.cmd detect --json <url>` scans one viewport of one route only; engine 0.1.24 has no `motion-capture`.
- Screenshots take ~400 ms each, too slow for a 700 ms animation. Measure motion in the page instead: a
  `browser_evaluate` async function sampling computed styles per requestAnimationFrame (read the file with
  `[IO.File]::ReadAllText`, not `Get-Content -Raw`, or ConvertTo-Json sends an object). Example: `b2-sampler.js`.
- `browser_drag` args are `startTarget`/`endTarget` (refs from `browser_snapshot`), not `startRef`/`endRef`.
- `browser_emulate_media {reducedMotion: 'reduce'}` works for reduced-motion checks.
- The Flood can be replayed: focus `input.dn-range`, Home + ArrowRight x17 (6 Feb), click Play; it fires ~1.2 s later.
- Taste gate (2026-11-15, About page cut at OPEN 3): set `CHROME_PATH` to Edge before round 1, or check.mjs silently
  skips; only 3 rounds, so probe in-page first (section tops on screen multiples, split columns on the shared column
  line, the h1 filled to heroes.json maxChars). Kit inline head lines go in a file; no CSP violation from the kit.
Fallback without MCP: headless Edge `--screenshot` clamps to ~500 px wide; use a 360 px iframe wrapper.
