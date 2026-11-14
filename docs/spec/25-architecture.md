## Architecture
- /pipeline: Python (earthaccess, xarray, rasterio, pysheds or whitebox). Harmonizes to a 30 m grid, computes features, alert index and state; writes to Supabase and to /app/public/data as JSON/GeoJSON snapshots. Runs hourly in GitHub Actions.
- /backend: FastAPI on Render. Email (Resend), protected manual re-run and /email/test. Nothing user-facing depends on it.
- /app: Vite + React + TypeScript + Tailwind PWA on Render Static Site. Leaflet + NASA GIBS tiles, uPlot charts, vite-plugin-pwa. Reads Supabase (public read-only) or the JSON snapshot; works offline.

