⚠️ DEGRADED: single-context (no sub-agent tool in this subagent run; Assessment A finished before the detector output was read)

# Critique and audit, app screens at commit 9c58796 (D-033, A3)

Target: the app on the dev server (`http://127.0.0.1:5174/`), screens `#home`, `#map`, `#lot/lot_demo-el-oro_1`,
`#strategies/lot_demo-el-oro_1`, `#alerts`, `#learn`, `#setup`; 35 screenshots (360x780 and 1440x900, light and dark,
plus 360 Spanish dark) in `.playwright-mcp/product-designer/a2/` (git-ignored). Mode: Operate (`mode-operate.md`,
`operate.md`). Snapshot not persisted to `.impeccable/critique/` (outside product-designer's paths).
Questions skipped: subagent run without a question tool; the questions are in the report under "Needs Roberto".

## Design health score (Nielsen, 0-4)

| # | Heuristic | Score | Key issue |
| --- | --- | --- | --- |
| 1 | Visibility of system status | 3 | Banner, freshness and origin badges are clear; "Updated" date sits beside the Demo chip, not by the status |
| 2 | Match system / real world | 2 | Source lines speak the system ("Domain table copied from domain/actions.yaml for the app"); "Share of W", "Data level 0" |
| 3 | User control and freedom | 3 | Back links and hash routes work; replay scrubber always reachable |
| 4 | Consistency and standards | 2 | Three badge styles (tint pill, outline pill, dashed pill); " · " meta joins in 10 places; A/B/C discs on Strategies only |
| 5 | Error prevention | 3 | Setup steps are skippable; nothing destructive without a step |
| 6 | Recognition rather than recall | 3 | Level word always beside the colour; core glyph height repeats the level |
| 7 | Flexibility and efficiency | 2 | Agronomist must open each lot to see the reason: row subtitles truncate at 360 ("Top factor: Ups...") |
| 8 | Aesthetic and minimalist design | 2 | Home at 360 puts a 9-line safety paragraph before the farm status; 8 identical "Estimated" outline pills in one list |
| 9 | Error recovery | 3 | "No data" is honest and consistent (dotted underline); offline notice exists |
| 10 | Help and documentation | 3 | Learn glossary and "How reliable is this?" exist; Learn repeats the same review caveat 15 times |
| **Total** | | **26/40** | **Acceptable** (one point under Good) |

Cognitive load (rubric checklist): 3 failures, moderate: visual hierarchy (Home status below the fold at 360),
chunking (Lot detail "Today" grid labels wrap to 3 lines), progressive disclosure (What to check shown in full twice:
Home and Lot).

## Design specificity verdict

**LLM assessment.** The system is authored, not interchangeable: the soil-core glyph, the wine Severe banner, the
blue-teal Normal and the light tabular W numerals could not be lifted onto another product unchanged. What drags it
toward generic is the screen layer, not the tokens: every group is a white rounded box on Mist with an outlined pill
in it; meta lines run together with middle dots; the map at 360 is a stack of controls with a grey map under it.
The signature (core + Severe onset) is present but its onset currently reads as a square ring around the banner
glyph, which looks like a stray focus box rather than water rising.

**Deterministic scan** (`impeccable.cmd detect --json http://127.0.0.1:5174/`): 2 warnings. `line-length` on the
Home "What to check" paragraph (~95 characters per line at 1440): agreed, cap prose at 65ch. `gray-on-color` on
`#b3c0cc` over `#12233a` (dark surface): false positive, the pair measures 8.9:1 and the "colour" is the navy surface.
The detector missed everything layout-level below (it scans one viewport of one route).

## What is working

1. Severity is never colour alone: core height, colour and word on every list, badge and banner, in both languages.
2. Missing data is shown as missing ("No data" / "Sin datos") with a consistent dotted underline; no gap is filled.
3. Dark theme is orbit blue, not black; Severe stays the only solid status in both themes.

## Priority issues

- **[P1] Lot rows truncate the lot name and the reason at 360.** "Lote 2 (de..." and "Top factor: Ups..." on Home
  and Alerts (en and es). The leading column spends ~70 px on the level word and the trailing column ~110 px on the
  value plus an outline pill. Fix: glyph-only leading column (14 px), level word moves into the subtitle in level ink,
  W and its origin badge stack in the trailing column. Command: `layout`.
- **[P1] Home answers "is anything wrong?" only after a 9-line paragraph.** At 360 the farm status card starts below
  the first viewport. Fix: banner, then status, then lots (SPEC 18 order); "What to check" moves under the lot list
  on Home (it stays in full on Lot detail). Command: `layout`, `distill`.
- **[P1] Map at 360 gives the map 43 % of the viewport.** Two segmented controls and two meta lines (250 px) sit
  above it; the lot labels (white boxes) cover the lot shapes they describe. Fix: imagery switch and credit move
  onto the map; labels sit beside the shape and carry glyph + word in level ink. Command: `layout`.
- **[P1] The Severe onset reads as a stray square ring on the solid banner.** Fix: the A4 pick (core floods, one
  ripple from the lot on the map, banner holds still). Command: `animate`.
- **[P2] Copy speaks the system.** Source lines quote file paths; Alerts says settings "arrive with the backend
  work"; em dashes in Learn (en, es); " · " joins in 10 places. Fix: `design/upgrade/copy-proposals.md`. Command: `clarify`.

## Persona red flags

**Sam (accessibility-dependent).** Focus ring is visible (3 px); targets are 48 px. Red flag: the outline origin pills
are 20 px tall inside rows; they are not interactive, so fine, but they read as buttons. Global reduced-motion rule
kills every transition to 0.01 ms, including state feedback (audit: "global 0.01ms kill").
**Alex (agronomist scanning eight lots).** Cannot compare reasons across lots without opening each one (truncation);
desktop keeps a 736 px phone column with the tab bar spanning the full 1440 px width.
**Casey / the farmer in sun, one hand.** The replay play button and tab bar sit in the thumb zone (good). The level
counts row wraps "Severe 2" onto a second line at 360; the long safety paragraph is the first thing under the banner.
**Judge (from PRODUCT.md).** Sees "Domain table copied from domain/actions.yaml" under the first card: it reads as a
debug string and undercuts the care elsewhere.

## Minor observations

- Lot detail repeats the source line inside and under the W card.
- "Today" grid: labels wrap to 3 lines ("Water balance, 7 days") and values lose their column.
- Strategies: A/B/C discs read as a ranking though A is "current management"; numbered-marker tell.
- Dark `shadow-banner` at 0.35 black reads heavy (high-end-visual-design §2); flat-by-default elsewhere.
- Status counts chips wrap; four equal columns would hold at 360.

## Audit (technical, `audit.md`)

| # | Dimension | Score | Key finding |
| --- | --- | --- | --- |
| 1 | Accessibility | 3 | AAA status text; global `0.01ms` reduced-motion kill removes state feedback instead of replacing it |
| 2 | Performance | 3 | 94.3 kB gzip initial JS; map stroke animation animates `stroke-width` (paint, short, acceptable once) |
| 3 | Theming | 3 | Full token system; SeverityGlyph carries an inline hard-coded transition and a hard-coded ripple colour |
| 4 | Responsive | 2 | 360 truncation in lists, map squeezed, tab bar not aligned to the content column on desktop |
| 5 | Implementation integrity | 3 | Coherent system; drift is in screens (separators, three badge styles) |
| **Total** | | **14/20** | **Good** |

## Anti-generic lens (Taste classics, named sections only)

Dials for Operate screens: variance 3, motion 3, density 6. Kept from the classics: v1 §3 rule 5 (full state
cycles, tactile `:active`), v1 §7 / v2 §9 (no pure black: met; no oversaturated accents: met; no decorative dots:
met, the core carries state), v2 §9.F-9.G (middle-dot rationing and the em-dash ban: both violated, see copy),
v2 §8 (hierarchy parity across themes: met), high-end §2 (no harsh dark shadows: dark banner shadow softened),
minimalist §2 (no heavy shadows, no pill-shaped primary buttons: met), minimalist §5 (one border style for tags).
Rejected as not applicable, with reason: their font bans (Roboto, system fonts) and icon packages (system fonts are a
zero-byte, offline, outdoor-legible choice; no new dependencies), double-bezel cards, scroll-entry fade-ups and
staggered reveals (Operate: "no orchestrated page-load sequences"), "messy fake numbers" (Rule zero: no invented
numbers of any kind), minimalist's warm palette and uppercase tags.

## ui components, review (emil-design-eng format)

| Before | After | Why |
| --- | --- | --- |
| `ListRow` leading slot holds a variable-width "Severe"/"Warning" badge | `level` prop: fixed 14 px core leading, word in the subtitle in level ink | Names align; the word still pairs with the colour |
| `SeverityGlyph` inline `style={{ transition: 'y 600ms ...' }}` | `.dn-core-water` class driven by `--dn-dur-onset` and `--dn-ease-out` tokens | One source for motion; reduced-motion handled in CSS |
| Ripple: `scale(2.6)` square border on a rounded glyph, `both` fill | Ripple only on map lots; in HTML the core water rises and the outline gives one soft swell | A square ring on the solid banner reads as a focus box |
| Global `*{animation-duration:.01ms;transition-duration:.01ms}` under reduced motion | Remove ripple and scale; keep 120-200 ms colour/opacity fades | Reduced motion means less movement, not lost feedback |
| `Button` `transition-[transform,opacity] duration-[120ms]` literal | `duration-press` token utility; `active:scale-[0.97]` | Tokens, and a press that is felt at arm's length |
| `AlertBanner` `active:scale-[0.99]` | `active:scale-[0.985]` + surface darkening | 0.99 on a 330 px banner is invisible |
| `Card` footer is one string, callers join with " · " | `footer` accepts an array; each part on its own line | Removes the middle-dot strings without touching callers' data |
