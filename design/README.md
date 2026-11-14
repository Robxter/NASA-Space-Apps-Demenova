# design/

Owner: product-designer.

- `BRIEF.md`: subject, audience, the revised token plan, the severity palette with measured contrast, motion, and
  the AI-default review.
- `logo/`: three options with rationales (`logo/README.md`), the icon sources and a preview sheet.
- `components/`: one spec per presentational component (props, states, proposed copy).
- `screens/`: specimen screenshots at 360 px and desktop, light and dark (synthetic demo farm, "Demo" visible,
  no measured values).

Tokens are implemented in `app/src/styles/` (`tokens.css` raw values, `theme.css` Tailwind 4 theme) and components
in `app/src/components/ui/`. Severity is always colour AND word (Normal, Watch, Warning, Severe / Normal,
Vigilancia, Aviso, Severo). No NASA logo, no implied endorsement.
