## System data flow · Updated

*Diagram "Satellite data reaches the phone as a scored, explained alert", transcribed to text from the Claude Doc
widget on 2026-11-14 (the Markdown export drops diagrams).*

- NASA and partner data, global coverage: GPM IMERG (rain, 30 min); SMAP · GLDAS (soil moisture); SRTM (terrain, 30 m);
  NASA POWER, ECOSTRESS (ET); Landsat · S-2 (NDVI greenness).
- → Pipeline · GitHub Actions: hourly download, harmonize to one 30 m grid; features per lot per day.
- → Alert engine: weighted index W from 0 to 1 per lot; Normal, Watch, Warning, Severe; top two contributing factors.
  Tyson's table (practices, costs and thresholds) feeds the engine its thresholds.
- Alert engine → Supabase (Postgres): farms, lots, features, alerts, email log.
- Alert engine → Backend · Render (on Severe): FastAPI emails the agronomist via Resend.
- Supabase → PWA on Render Static Site (reads Supabase, works offline): Home (farm status, alerts), Risk map (lots and
  day replay), Lot detail (factors and history), Strategies (3 options compared). Tyson's table → Strategies (strategy options).
- Foundation: GitHub and local Git, branches per block, secrets kept out of code; every push redeploys Render.

Global satellite layers are harmonized onto one 30 m grid, scored per lot by the alert engine in an hourly GitHub Actions run, stored in Supabase and read directly by the phone app; the Render backend only sends Severe emails, so nothing a judge opens waits on a sleeping server; Tyson's table sets the thresholds and supplies the strategy options. The step-by-step user flow is in the UI section below.

