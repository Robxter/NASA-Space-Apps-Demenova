---
name: Demenova
description: Satellite water intelligence for banana farms, from orbit to the root zone
colors:
  orbit: "#0E2135"
  mist: "#EEF2EF"
  surface: "#FFFFFF"
  surface-2: "#E3E9E5"
  line: "#D2DBD6"
  line-strong: "#56677A"
  ink-2: "#44566A"
  ink-3: "#56677A"
  leaf: "#2A6343"
  focus: "#1D5FC2"
  alluvium: "#5A4A36"
  starlight: "#F4DF8E"
  normal-fill: "#3591A0"
  normal-ink: "#0F5258"
  normal-tint: "#DCEEEE"
  watch-fill: "#F0C63A"
  watch-ink: "#5C4100"
  watch-tint: "#FAEFC2"
  warning-fill: "#D4560A"
  warning-ink: "#7F2E00"
  warning-tint: "#FBE0CB"
  severe-fill: "#93154F"
  severe-ink: "#7E1046"
  severe-tint: "#F7DCE8"
  stale-fill: "#8A949C"
  stale-ink: "#3F4A55"
  stale-tint: "#E4E9EC"
  night: "#0A1726"
  night-surface: "#12233A"
  night-ink: "#E7EDF2"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 300
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' 1"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.47
  callout:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9375rem"
    lineHeight: 1.34
  footnote:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8125rem"
    lineHeight: 1.38
  caption:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.34
rounded:
  glyph: "3px"
  control: "10px"
  group: "14px"
  sheet: "22px"
  chip: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.orbit}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.orbit}"
    rounded: "{rounded.control}"
    height: "48px"
  list-group:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.group}"
  list-row:
    height: "56px"
    padding: "0 16px"
  severity-badge-severe:
    backgroundColor: "{colors.severe-tint}"
    textColor: "{colors.severe-ink}"
    rounded: "{rounded.chip}"
  demo-chip:
    textColor: "{colors.alluvium}"
    rounded: "{rounded.chip}"
---

# Design System: Demenova

<!-- Scan-mode record of the incumbent system (impeccable document + degraded/documenter.md), 2026-11-15, D-033.
Sources: app/src/styles/tokens.css, theme.css, index.css, app/src/components/ui/*, design/BRIEF.md.
The sidecar .impeccable/design.json is not written: .impeccable/ is outside product-designer's paths (CLAUDE.md §7).
Dark values live in tokens.css; the frontmatter carries the light theme plus the three dark anchors. -->

## Overview

**Creative North Star: "The Soil Core"**

A soil core is the sample pulled from the ground to see where the water sits. Demenova's logo is a core in section
(space above, a curved Earth limb, leaf ground, water in the root zone); the severity glyph is a small core whose
water rises with the level; the one orchestrated moment is that core flooding when a lot turns Severe. Everything
else is a quiet field instrument: Apple Weather's numeral grammar and Linear's discipline, in cool leaf greys and deep
orbit blue.

The register is Operate (every app screen): dense enough for an agronomist scanning eight lots, calm enough for a
farmer glancing in sun. Ambition is restraint. Boldness is spent once, on the Severe onset.

**Key Characteristics:**
- Inset grouped lists with hairlines, not shadowed cards.
- Large light (300) tabular numerals with a small unit; no monospace "data" face.
- Severity has three redundant cues: water height in the core, colour, and the word.
- Synthetic content is marked in Alluvium clay with a hatch, so made-up data never looks measured.
- Light and dark follow the phone; dark is orbit blue, never black.

## Colors

A cool, leaf-and-orbit palette where only status is allowed to be loud, and only Severe is solid.

### Primary
- **Orbit** (#0E2135): ink and primary buttons in light; the night sky of the dark theme (#0A1726).
- **Leaf** (#2A6343; dark #86CDA2): brand, links, selected tab. Never a severity.

### Secondary
- **Alluvium** (#5A4A36; dark #D9C6AA): coastal clay; the "Demo" chip and synthetic values only.

### Tertiary
- **Starlight** (#F4DF8E): the nova in the logo only.

### Neutral
- **Mist** (#EEF2EF): page background, the bloom on a banana leaf's underside; a cool grey-green, not cream.
- **Surface** (#FFFFFF; dark #12233A) and **Surface 2** (#E3E9E5; dark #1A2F4A): groups and pressed rows.
- **Hairline** (#D2DBD6): decorative separators only. **Strong line** (#56677A): control borders, at least 3:1.
- **Ink 2** (#44566A) and **Ink 3** (#56677A): secondary text; both at least 4.7:1 on every surface.

### Severity
Each level has fill (map, core water), ink (text, outlines) and tint (badge background); ink on tint is at least 7:1
in both themes (table with measured ratios in `design/BRIEF.md`). Normal is blue-teal, so red versus green never
carries meaning.

**The One Solid Rule.** Only Severe is ever a solid fill behind text (white on #93154F, 8.53:1). Every other level is
ink on tint.

**The Not-Green Rule.** Leaf green never signals status, and no status is green.

## Typography

**Body Font:** system UI (SF Pro on iOS, Roboto on Android, Segoe UI on Windows). Zero font bytes; works offline.

**Character:** the system face carries legibility; the personality is in the numerals, set large, light and tabular,
with a small semibold unit beside them.

### Hierarchy
- **Display** (300, 44px, 1.05, -0.02em, tabular): the index W and headline values.
- **Title** (600, 28px, 1.2): screen titles.
- **Headline** (600, 20px, 1.3): group headers and card titles.
- **Body** (400, 17px, 1.47): rows and paragraphs; max line about 65ch.
- **Callout** (15px), **Footnote** (13px): meta lines, sources, "updated 2 h ago".
- **Caption** (500, 12px): the smallest size used; never below 12px.

**The Sentence-Case Rule.** Headers, buttons and badges are sentence case. No all-caps eyebrows.

## Layout

Single column at 360px with a 16px gutter (24px from 600px); 8-point spacing (4, 8, 12, 16, 24, 32, 48, 64). Touch
targets at least 48px; list rows at least 56px. Groups stack with a sentence-case header above and a source line
below. Desktop widens the column; it does not add decorative panels.

## Elevation & Depth

Flat by default: hairlines and tonal surfaces separate, not shadows. Two shadows exist: **sheet**
(`0 -1px 0 rgb(14 33 53 / .06), 0 -8px 24px rgb(14 33 53 / .08)`) for the bottom sheet and scrubber dock, and
**banner** (`0 1px 2px rgb(14 33 53 / .08), 0 6px 16px rgb(14 33 53 / .1)`), now used only to lift the selected
segment of a segmented control. In dark mode both are orbit-tinted (`rgb(3 10 19)`), never black. The alert banner
itself is flat since B4 (the one accessory removed): its solid wine or level tint already separates it from Mist.

Browser surfaces are themed too: text selection in focus-blue at 20% (30% dark), the caret in focus-blue, native
controls in Leaf (`accent-color`), link underlines offset 0.18em.

**The Two Shadows Rule.** A third shadow needs a reason recorded here first.

## Shapes

Radii shrink inwards by hierarchy: sheet 22px, group 14px, control 10px, glyph 3px, chip fully round. The core glyph
is a rounded rectangle whose water line is the only fill.

## Components

### Buttons
- **Shape:** gently curved (10px), at least 48px tall, verb labels ("Open lot"), no arrows.
- **Primary:** Orbit fill, white text (inverted in dark). **Secondary:** surface with a strong-line border.
- **Press:** Press feedback, scale 0.97 over 120ms strong ease-out (`.dn-press`). Focus: 3px focus-blue outline,
  2px offset, never animated.

### Chips
- **Severity badge:** level ink on level tint, fully round, glyph plus word; Severe may be solid.
- **Demo chip:** Alluvium text with the hatch; the word "Demo" alone.

### Cards / Containers
- **Inset grouped list:** surface, 14px radius, no shadow, hairline inset 16px from the leading edge.

### Lists
- **Lot row:** fixed 14px core leading, lot name up to two lines, level word in level ink opening the subtitle,
  value and origin at the trailing edge, chevron when it navigates. Rows never lead with a variable-width badge.

### Map labels
- Surface chip with a 1px level-ink border, 8px radius, glyph and level word in level ink, 12px semibold; sits
  above its lot, never on it.

### Navigation
- Bottom tab bar with four tabs; selected tab in Leaf. Rows that navigate end in a chevron (iOS convention).

### The Soil Core (signature)
`SeverityGlyph`: water at 25/50/75/100% for Normal/Watch/Warning/Severe (a `scaleY` from the bottom); dashed empty
core for "Out of date". A level change is the water rising or falling in place.

**The Flood (the app's signature moment).** When a lot turns Severe in the replay, water rises inside the lot on the
map (700ms, `cubic-bezier(.77,0,.175,1)`), the label's core fills with it, and one ring spills out of the lot
(starts at 560ms, 900ms, scale 1 to 1.5, fading). Then still. Timeline and trigger rules: `design/upgrade/CHANGE_LIST.md`
"Severe moment"; prototype `design/prototypes/severe-moment.html`.

### Motion vocabulary (Emil Kowalski's terms; tokens in `design/components/Motion.md`)
- **Press / Tap feedback**: scale 0.97 (0.985 on wide surfaces) over 120ms; **state changes** 200ms; **Slide in** for
  sheets 320ms on the drawer curve; strong **Ease-out** `cubic-bezier(.23,1,.32,1)` for everything that answers a touch.
- **Orchestration**: the Flood is the app's strongest motion that does not answer a touch, a **Sequence** with a 140ms
  overlap. Since block 5 (D-038) entrances, reveals and the Welcome illustration also move on their own; see "Motion, block 5".
- **Reduced motion**: no movement, no scale, no flood or ring; colour and opacity fades stay. The level never
  depends on motion.
- Not used: **Idle animation** or **Pulse** loops on data, **Ripple** on taps, count-ups. **Scroll reveal** and **Stagger**
  are used only as "Motion, block 5" lists them.

**The One Moment Rule (superseded on 15 Nov 2026 by D-038; kept for history).** A second orchestrated motion needed
Roberto's approval and a line here first. He gave it in block 5: see "Motion, block 5".

- **(Superseded by D-038.) Only one orchestrated motion exists: the Flood (`dn-core-flood`, `dn-lot-spill`). Every other motion answers a
  touch and lasts at most 320 ms, sheets included. Never add `@keyframes` or an `animate-*` class without Roberto's
  approval.** Check: `app/src/styles/motion.test.ts`.
  Why: "Spend boldness there; keep everything else quiet." (Roberto, role brief)
  <!-- 2026-11-15: Roberto approved learn-taste rule 2 ("APPROVE ALL"); source: "The memorable moment: a lot turning from calm to Severe on the map during the flood replay." -->

## Motion, block 5

Roberto, 15 Nov 2026: "Improve the frontend graphics and animations, doesnt matter if it makes it a little bit
heavier" (D-038). This relaxes the One Moment Rule above (D-035 rule 2): the Flood stays the app's strongest motion,
and more motion is now allowed when each piece has a purpose (Emil Kowalski's test: feedback, orientation,
continuity, or a rare moment), a `prefers-reduced-motion` path, and animates transform and opacity only.

Now allowed (tokens and utilities in `design/components/Motion.md`):
- **Entrances** (`.dn-enter`, `.dn-scale-in`, `.dn-enter-fade`): rise 12 px and fade, 420 ms on a gentle spring
  (`--dn-ease-spring`, a CSS `linear()` curve with about 1 % overshoot; strong ease-out where `linear()` is missing).
- **Stagger** (`.dn-stagger`): 60 ms steps, the eighth child onwards together, so a group finishes under 500 ms.
- **Reveal once on scroll** (`<Reveal>`): only content that starts below the fold, once, 600 ms; never hidden
  without JavaScript.
- **Branded skeleton** (`.dn-skeleton`): a translated sheen, not a moving background.
- **View transitions** between screens: a 200 ms crossfade on the root.
- **Ambient illustration loops** on the Welcome page only (`dn-orbit`, `dn-rain`, `dn-wave`): paused off screen,
  still under reduced motion, never on data.

Still never: a count-up or tweened number on a data value (an intermediate number is not data); motion on keyboard
actions; generic Tailwind loops; invented imagery of farms or people (illustrations and abstract motifs only).
Check: `app/src/styles/motion.test.ts` pins the approved keyframes.

## Do's and Don'ts

### Do:
- **Do** pair every severity colour with its word and the core glyph.
- **Do** show origin and "updated X ago" under every value; show "No data" when a value is missing.
- **Do** use tabular numerals (`.dn-num`) for any number that changes while the user watches.
- **Do** keep Severe the only solid status fill.

### Don't:
- **Don't** use green for any status, or Leaf for severity.
- **Don't** add shadows to list groups or cards.
- **Don't** use all-caps eyebrows, middle-dot meta strings, monospace data labels or arrows on buttons.
- **Don't** add motion that answers no user action, except the Severe onset and what "Motion, block 5" allows.
- **Don't** load external fonts or inline styles in HTML (CSP `'self'`).

### Approved by Roberto (learn-taste, 2026-11-15):

- **New icons, illustrations and empty-state art are drawn from the soil core (rounded rectangle, water line, dashed
  when out of reach). Never a second motif: no leaf, globe, satellite or sparkle.**
  Why: the logo and the severity glyph are one idea, so one object carries brand and state.
  **Amended by Roberto (P-022, option a, 15 Nov 2026): Welcome illustrations may show the logo's own world around the
  core: orbit and satellites, the Earth's limb, rain over the catchment. The app's screens keep the core alone.**
  Why: it tells "from orbit to the root zone" from the pitch; the Core logo already contains space and the Earth's limb.
  <!-- 2026-11-15: Roberto answered "a" to P-022 (keep the block 5 hero's satellites and cloud, amend rule 1). -->
  <!-- 2026-11-15: Roberto approved learn-taste rule 1; source: D-015, logo option 1 "Core" chosen over "Torn leaf" and "Nova D", reason "Logo and severity glyph are one idea". -->
- **The theme follows the phone's light or dark setting (`prefers-color-scheme`) unless the user picks one in
  Settings. A screen never forces a theme.**
  Why: "Light and dark mode following the phone." (Roberto, role brief)
  <!-- 2026-11-15: Roberto approved learn-taste rule 3. -->
- **No screen, label or empty state says the app predicted, forecast or anticipated the 22-23 Feb 2026 flood
  (Spanish: never "predijo", "pronosticó", "anticipó"). The Severe threshold is "a design choice", never "calibrated".**
  Why: the demo lots escalated earlier, from earlier storms, and the threshold was chosen after the 2026 floods were seen (D-029).
  Check: a Vitest test on the dictionaries (CHANGE_LIST CL-32, frontend-engineer).
  <!-- 2026-11-15: Roberto approved learn-taste rule 4; source: D-029 "Never claim the engine predicted the Feb 2026 flood". -->
- **Roberto's decision wording is kept exactly as written, punctuation included: the badge "General guidance — not
  reviewed by an agronomist" keeps its dash, even though the copy rules ban dashes elsewhere.**
  Why: it is Roberto's decision text (D-025, D-026), and a test asserts it.
  <!-- 2026-11-15: Roberto approved the recommendation in learn-taste's conflict section ("APPROVE ALL"). -->
