## Stack and deployment · New

Judge's verdict on your proposal: GitHub, Render and Supabase are the right trio, with one rule. The app a judge opens must never wait on a sleeping server, so the frontend is a static site that reads data directly, and the backend only does background work.

| Layer | Choice | Why | Watch out |
| --- | --- | --- | --- |
| App type | Progressive Web App (PWA) | One codebase for Android and iOS, installable to the home screen, works offline, no app store | iOS installs via Safari's Share, Add to Home Screen; test it on an iPhone once |
| Frontend | Vite + React + TypeScript + Tailwind | Strongest tooling in Claude Code and ECC; fast builds; small output | Keep to the performance budget below |
| Map | Leaflet + NASA GIBS imagery tiles | Lightweight and touch-friendly; GIBS is NASA's own tile service, which adds visibility | Cite GIBS and the base map provider |
| Charts | uPlot | Tiny and very fast for time series on low-end phones | Plain styling; theme it to match |
| Offline | vite-plugin-pwa (Workbox) | Caches the app shell and the last data | Show "offline, data from …" when cached |
| Database | Supabase (Postgres) | Farms, lots, daily features, alerts, email log; instant REST API | Public read-only access for demo tables via row-level security; service key only on the server |
| Scheduled pipeline | GitHub Actions on a schedule | Free on public repos; runs the Python pipeline hourly and writes to Supabase | Scheduled runs can start late; replay mode never depends on them |
| Backend | Python FastAPI on Render | Same language as the pipeline; handles email and manual re-runs | Free web services sleep when idle and wake slowly; nothing the judge sees may depend on it |
| Frontend hosting | Render Static Site | Served from a CDN and does not sleep | Connect it to the GitHub repo for auto-deploy on push |
| Code | GitHub + local Git | Branches per block: data, engine, app | Secrets only in Render and GitHub encrypted secrets, never in the repo |

**Apple-like design on Android-first hardware.**

- System fonts (San Francisco on iPhone, Roboto on Android): native feel on both, zero font download.
- Bottom tab bar, large titles, cards with soft borders, 8-point spacing grid, light and dark mode.
- Motion only on state changes (a lot turning red), never decorative.

**Performance budget, checked before submitting.**

- Initial JavaScript under about 150 KB compressed.
- Usable in under 3 seconds on a mid-range Android phone over 4G; test with Chrome DevTools throttling.
- Lighthouse mobile performance score of 90 or more.
- Works on current Chrome for Android, Samsung Internet and Safari on iOS. Test device: Tyson's Samsung Galaxy A55, an upper mid-range phone, plus Chrome CPU and network throttling to mimic cheaper ones.

