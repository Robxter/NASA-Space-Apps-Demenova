---
name: about-page
description: The cut "About Demenova" page (Taste 2.5.1, 2026-11-15) lives in git at fc3c12e; how to restore it and what still fails the gate
metadata:
  type: project
---

Roberto wants to keep the About page for later (2026-11-15: "save the about page in memory because I might use it later").
It was cut from `block/3-polish` by plan (c22fd70) after the Taste gate ended `OPEN 3`; the full page is in commit
**fc3c12e** (22 files under `app/public/about/`, 698 kB, 331 kB of it unchanged Taste kit files with their LICENSE).

**Why:** a short static "About Demenova" persuade page (kind software): centred hero with a real Home screenshot,
the pinned-chapters moment ("The alert index for each lot": Lot, Map and a NASA GIBS VIIRS image of the El Oro coast,
3 Sep 2025), "Demo farm limits" (counts only: 1 hit, 0 misses, 4 false alarms; no lead time for the Feb 2026 flood)
with a four-level soil-core scale, close "Open the app", footer credit "Built with NASA Earth observations".

**How to apply:**
- Restore: `git checkout fc3c12e -- app/public/about` (then commit on the branch Roberto names).
- Before deploying: re-capture the 3 app screenshots if the app changed (they are of the 15 Nov upgraded app).
- Open gate FAILs to fix first: `split-pair` at 1440 (Limits right column at x 841, must start on the page's shared
  column line at 732: use the grid's span-6/start-7 pair); `section-gaps` at 390 (527 px after `#how`, from
  `#how { min-height: calc(2 * 100svh) }` on phones); `hero-maxchars` at 390 (hero 2 px past the fold with a
  36-character h1: trim the lead or the pill). One waiver kept: `hero-lines` (the check fills the h1 to 39 chars).
- Re-run: `gate.mjs --start app/public/about/index.html --root app/public --kind software --category "Flood and
  waterlogging alerts for banana farms" --primary "Open the app" --new`, with `CHROME_PATH` set to Edge.
- CSP: already compliant (inline head lines in `head.js`, palette in `about.css`); frontend-engineer must keep
  `/about/` out of the service-worker precache (navigateFallbackDenylist, globIgnores).
Related: [[design-direction]], [[screenshot-tooling]]
