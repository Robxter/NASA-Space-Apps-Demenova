# app/

Owner: frontend-engineer (logic, state, data access in `src/`); product-designer (`src/styles/`, `src/components/ui/`,
icons). Skeleton: lead-architect (phase 0).

Purpose: the Demenova Progressive Web App (Vite + React + TypeScript + Tailwind, vite-plugin-pwa, Leaflet + NASA GIBS,
uPlot, supabase-js; ADR-001). It reads Supabase and the static snapshots in `public/data/demo/` directly and never
depends on the backend (CLAUDE.md §2).

| Path | Content |
| --- | --- |
| `public/manifest.webmanifest`, `public/icons/` | PWA manifest; icons come from product-designer (T-016) |
| `public/data/demo/` | replay and offline snapshots (CONTRACTS.md §4); checked by `scripts/check_provenance.py` |
| `src/types/contracts.ts` | GENERATED from `pipeline/common/models.py`; never edit by hand (ADR-005) |
| `src/{data,state,i18n,screens,components}/` | data layer, React context, en/es dictionaries, the seven screens |

Commands (Node 22.x, npm): `npm --prefix app install`, `npm --prefix app run dev`, `npm --prefix app run build`,
`npm --prefix app test`. Versions are exact (`.npmrc` save-exact); a new or upgraded package is class A (PENDING.md).
