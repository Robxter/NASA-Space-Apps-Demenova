# Device checklist (T-044, D-026)

Filled in by Roberto on his own devices. Owner of this file: qa-demo-engineer.
Use the public HTTPS Render link (install to home screen and offline need HTTPS; no Render URL was published when this
was written, see docs/HANDOFF.md). Test on the release candidate commit; write it here: `commit: ________`.

How to fill a row: Result = `pass` or `fail`; Notes = what you saw (for a fail: steps, what you expected);
Screenshot = save it as the name given, in `docs/reports/qa/screens/` (create the folder; no personal data on screen).
Expected values (levels, dates, counts) are the ones the automated suite reads from the snapshots; you only check
that the screen looks right and reads well.

## iPhone 14 Pro (Safari, iOS)

| # | Item | How | Result | Notes | Screenshot |
| --- | --- | --- | --- | --- | --- |
| I-1 | Install to home screen | Safari > Share > Add to Home Screen. The icon and the name "Demenova" appear; it opens full screen without the Safari bar | | | iphone-install.png |
| I-2 | Replay opens on 23 Feb 2026 | Open from the icon. The replay date reads 23 Feb 2026; the red Severe banner names a lot and its top factor | | | iphone-replay-0223.png |
| I-3 | Replay scrub and play | Drag the day strip to 20 Jan, then press play. Lots step up Watch, Warning, Severe; every badge shows colour and word | | | iphone-replay-play.png |
| I-4 | Lot detail and reliability | Tap the banner. Factors with shares, charts, "How reliable is this?" shows counts only (no percentages) | | | iphone-lot.png |
| I-5 | Strategies | "See strategies for this lot": three options, badge "Not yet reviewed by a local agronomist", footer above the tab bar, cost and labour "Not estimated" | | | iphone-strategies.png |
| I-6 | Offline | After I-2, switch on Airplane mode, close the app fully, reopen from the icon. Replay works; a notice says offline with the data date | | | iphone-offline.png |
| I-7 | Language | Settings > Español. Every visible word changes (Severo, Aviso, Vigilancia); back to English | | | iphone-es.png |
| I-8 | Units | Settings > Imperial. Rain in inches, area in acres, dates MM/DD/YYYY; back to Metric restores the same numbers | | | iphone-imperial.png |
| I-9 | Farmer / agronomist mode | Settings > Farmer. W numbers and the "Today" card disappear; Agronomist brings them back | | | iphone-farmer.png |
| I-10 | Data saver | Settings > Data saver. App still loads; history charts show the last days only | | | iphone-saver.png |
| I-11 | Readability in sun | Outdoors, full sun, brightness auto. Level words, banner text and the date of the replay are readable at arm's length, in light and dark theme | | | iphone-sun.png |
| I-12 | Safe areas | Nothing hides under the notch / Dynamic Island or the home indicator (tab bar, replay control, strategies footer) | | | iphone-safe-area.png |

## iPad Air M2 (Safari, iPadOS)

| # | Item | How | Result | Notes | Screenshot |
| --- | --- | --- | --- | --- | --- |
| A-1 | Install to home screen | Share > Add to Home Screen; opens full screen | | | ipad-install.png |
| A-2 | Replay opens on 23 Feb 2026 | Portrait and landscape: banner, lot list and replay control fit; nothing stretched or cut | | | ipad-replay-0223.png |
| A-3 | Map | Map tab: lots coloured with the level word on each; tap a lot, the sheet opens, "Open lot" works | | | ipad-map.png |
| A-4 | Offline | Airplane mode, close and reopen: replay works with the offline notice | | | ipad-offline.png |
| A-5 | Toggles | Language, units, mode, data saver as I-7 to I-10 | | | ipad-toggles.png |
| A-6 | Farm setup levels 0-2 | Settings > Farm setup: drop a pin, draw an outline, type a lot; the confidence badge goes level 0 low, 1 medium-low, 2 medium; then "Delete my farm" | | | ipad-setup.png |
| A-7 | Readability in sun | As I-11 | | | ipad-sun.png |

## Lighthouse (manual, once, on the Render URL)

Chrome desktop > DevTools > Lighthouse > Mode Navigation, Device Mobile, category Performance. SPEC 11 target: 90 or more.

| Date (UTC) | URL | Commit | Performance score | Notes |
| --- | --- | --- | --- | --- |
| | | | | |

## Android, emulated (covered by the automated suite)

Chrome DevTools-style emulation in headless Microsoft Edge (Chromium), `tests/e2e`, project `android-360`:
360x780, touch, DPR 3; the performance tests add CPU 4x slowdown and the DevTools "Slow 4G" and "Fast 4G" network
presets via CDP. Run: `npm --prefix app run build`, then in `tests/e2e`: `npx playwright test` and
`npx playwright test --grep @perf --workers=1`.

| Item | Spec file | Covered |
| --- | --- | --- |
| Replay opens on 23 Feb; levels per lot and banner per day from the snapshots; colour AND word; Spanish words | specs/replay.spec.ts | yes |
| Home, Map (layers, sheet), Lot detail (factors, today, charts, facts), Strategies, Alerts, Learn | specs/screens.spec.ts | yes |
| "How reliable is this?" counts equal verification.json; no POD/FAR/CSI or % | specs/reliability.spec.ts | yes |
| English and Spanish on every screen: no raw keys, no strings left in the other language | specs/sweep.spec.ts | yes |
| Rule zero: no NaN/undefined/null, "No data" for missing, no NASA logo, credit in words, former agronomist never named, Demo label | specs/sweep.spec.ts, replay.spec.ts | yes |
| Units display-only (CSV keeps SI), farmer/agronomist mode, data saver | specs/toggles.spec.ts | yes |
| Offline reload after one visit | specs/offline.spec.ts | yes |
| Farm setup levels 0-2: pin, outline, typed lot, GeoJSON import, confidence badge, reset | specs/setup.spec.ts | yes |
| Usable under Slow 4G + CPU 4x; under 3 s with Fast 4G + CPU 4x (run alone, one worker) | specs/performance.spec.ts | yes |
| Build under test carries the committed snapshots | specs/build.spec.ts | yes |
| Real Android hardware, Samsung Internet (only if Roberto borrows an Android phone, D-026) | manual: repeat I-2, I-3, I-6, I-7, I-11 | not covered |
| WebKit / Safari rendering | manual: iPhone and iPad sections above | not covered by automation |
