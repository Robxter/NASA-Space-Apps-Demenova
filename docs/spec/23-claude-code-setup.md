## Claude Code setup · Updated

Harness ECC, but selectively: use its plan, review, security and session tools everywhere, and its test-first workflow only on the alert engine. [ECC](https://github.com/affaan-m/ECC) runs a plan, test, implement, review loop with 71 agents and 314 skills; its default rules demand 80% test coverage, which would sink a 24-hour build, so CLAUDE.md overrides that. Add Graphify for a map of the codebase and Anthropic's frontend-design plugin for the visual layer.

**Setup status: ECC and Graphify are already installed in your Claude Code.**

1. **Prerequisites.** Node.js 18 or newer, Git, Claude Code 2.1 or newer, Python 3.10 or newer.
2. **ECC: installed. For reference, one path only.** Inside Claude Code run `/plugin marketplace add https://github.com/affaan-m/ECC` then `/plugin install ecc@ecc`, or run `npx ecc-universal@2.2.3 setup` and choose project scope with Standard hooks. Never both: stacked installs duplicate hooks. Install only from the official repo or npm package, as its README warns. Check with `/plugin list`.
3. **ECC rules: check they are in place.** Plugins cannot ship rules, so clone the repo once and copy `rules/common`, `rules/python` and `rules/typescript` into your project's `.claude/rules/ecc/`.
4. **frontend-design.** `/plugin install frontend-design@claude-plugins-official`, then `/reload-plugins`. It is a taste layer for typography and layout, not a correctness check; give it the design rules from Stack and deployment.
5. **Graphify: installed. Build the graph after the first working skeleton.** `uv tool install graphifyy` (or `pipx install graphifyy`), then `graphify install --project`, then `/graphify .` in Claude Code. Use the original [safishamsi/graphify](https://github.com/safishamsi/graphify); many copies of it exist on GitHub. Its `graph.html` is also a ready architecture visual for the project page.
6. **Project files.** Export this doc as Markdown to `SPEC.md`; create `CLAUDE.md` with the block below.

**ECC workflow per build block.**

| Moment | Command | Use it for |
| --- | --- | --- |
| Start of a block | `/ecc:plan "<block goal from SPEC.md>"` | A plan you approve before any code |
| Alert engine only | `tdd-workflow` skill | Tests for the index, thresholds and state machine; a wrong threshold is the bug judges would catch |
| End of a block | `/code-review`, `/python-review` | Fresh-context review before you commit |
| Build breaks | `/build-fix` | Fast repair of build and type errors |
| Before the first deploy | `/security-scan` | Catches leaked Supabase, Resend or GitHub keys |
| Session slows down | `/context-budget` | Trims context instead of restarting |
| Before you sleep | `/save-session`, plus HANDOFF.md for Tyson | Resume tomorrow with `/resume-session` |
| Feature freeze | `/update-docs` | README and data citations in sync |

Skip the `multi-*` commands: they need an extra runtime ECC doesn't install.

```markdown
# Demenova — instructions for Claude Code

Read SPEC.md first. It is the source of truth. Deadline: 15 Nov, 23:59 Spain time.

