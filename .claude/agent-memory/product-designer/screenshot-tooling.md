---
name: screenshot-tooling
description: How to render specimens and icon PNGs on Roberto's Windows box without Playwright or new deps (headless Edge quirks)
metadata:
  type: reference
---

No Playwright or image libraries in app/ (adding one is class A). Use headless Edge at
`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` via PowerShell `Start-Process -Wait` with
`--headless=new --hide-scrollbars --allow-file-access-from-files --virtual-time-budget=3000 --screenshot=... --window-size=W,H`.
- Headless Edge clamps windows to about 500 px wide, so a "360 px" shot is really cropped. Load the page in a
  360 px iframe inside a wrapper HTML file.
- Transparent PNG icons: add `--default-background-color=00000000`.
- Specimen: a temporary folder inside app/ (node_modules resolution) with a CSS file that `@import`s
  `../src/styles/index.css` and adds `@source` lines, built with `npx --prefix app vite build <dir> --config
  app/vite.config.ts --base ./ --outDir %TEMP%/...`. Delete the folder afterwards (the GateGuard hook asks for facts first).
- Contrast and CVD scripts lived in %TEMP%/dn-design (contrast.mjs, cvd.mjs with Machado 2009); rewrite them if %TEMP% was cleared.
