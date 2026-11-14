## Rules
- Never invent data. A failed dataset shows as missing, never fabricated. The demo farm is labelled synthetic.
- Every number in the UI shows its source and timestamp.
- Severity = colour AND word. Spanish and English labels.
- Alert weights and thresholds live in one config file.
- Secrets only in environment variables. Never commit keys.
- Performance budget: initial JS under 150 KB gzipped; Lighthouse mobile 90+.
- The demo depends on replay of a past flood, never on live downloads.

