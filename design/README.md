# design/

Owner: product-designer. The current, normative design system is `DESIGN.md` at the repo root (tokens in its
frontmatter, rules in its sections); product truth is `PRODUCT.md`. This folder holds the work behind them.

## Read in this order
1. `../DESIGN.md`: colours, type, layout, depth, shapes, components, motion (including "Motion, block 5"), and the
   rules Roberto approved.
2. `BRIEF.md`: the original brief (14 Nov): subject, audience, token plan, the severity palette with measured
   contrast (all status text 7:1 or more), and the review against AI-default looks.
3. `components/`: one spec per presentational component (props, states, proposed copy); `components/Motion.md` lists
   every motion token and utility with its reduced-motion value.

## Work and decisions by block
- Block 1 (14 Nov): `logo/` (three options with rationales; option 1 "Core" chosen, D-015), `screens/` (specimens).
- Block 3 (15 Nov, frontend upgrade, D-033): `upgrade/critique-a3.md` (Impeccable critique and audit),
  `upgrade/copy-proposals.md` (en/es), `upgrade/CHANGE_LIST.md` (every change, owner, check and status; the review
  round), `prototypes/severe-moment.html` (three variants of a lot turning Severe; "Flood" chosen),
  `upgrade/taste-rules-proposed.md` (Roberto's rules, approved and written into DESIGN.md).
- Block 4 (D-036): the Welcome page, built in `app/src/screens/Welcome/` (copy in `content.en.ts`, `content.es.ts`;
  intro video link in `app/public/site.json`).
- Block 5 (D-038): richer graphics and motion: DESIGN.md "Motion, block 5", the Welcome hero illustration
  (`app/src/screens/Welcome/HeroArt.tsx`), illustrated empty states, `components/Motion.md`.
- Not shipped: a static "About" page built with the Taste kit (cut by plan when its gate stayed OPEN); it is kept in
  git history at fc3c12e (`git checkout fc3c12e -- app/public/about`).

## Where it lives in code
Tokens in `app/src/styles/` (`tokens.css` raw values, `theme.css` Tailwind 4 theme, `index.css` utilities and motion),
components in `app/src/components/ui/`. `app/src/styles/motion.test.ts` checks the approved motion set.

## Fixed rules
Severity is always colour AND word (Normal, Watch, Warning, Severe / Normal, Vigilancia, Aviso, Severo). No invented
data in any mockup or illustration (the demo farm is synthetic and labelled "Demo"). No NASA logo and no implied
endorsement: "Built with NASA Earth observations", in words.
