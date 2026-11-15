# Design tools for the frontend (set up 15 Nov 2026, D-033)

Roberto asked for the frontend to be upgraded with these tools (Figma MCP excluded at his request). They are installed
on the build machine only: `.claude/skills/` is git-ignored, so no third-party kit is vendored into this repo.

## What is installed

| Tool | Source and pinned commit | Where | Licence |
| --- | --- | --- | --- |
| Emil Kowalski skills (19 skills) | github.com/emilkowalski/skills @ `0f2e23b32bb1265e84cff8d3e75785fec953fb1b` | `.claude/skills/<skill>/` | MIT |
| Impeccable 4.9.1 (skill + engine 0.1.24) | github.com/pbakaus/impeccable @ `2b86d9c07b97d4bed7de23583e1bd1e58dd2baae` (`.claude/skills/impeccable` folder) | `.claude/skills/impeccable/` | Apache-2.0 |
| Taste skill 2.5.1 | github.com/Leonxlnx/taste-skill @ `f6b76575f949707b4e3c37cd86cb44b0b98643e8` | `.claude/skills/design-taste-frontend/` | MIT |
| Taste classics (v1, v2 experimental, high-end-visual-design, minimalist-ui) | github.com/Leonxlnx/taste-skill-classics @ `5e08c9383dc4ad7fc0df70e1ac8cfa09ec356305` | `.claude/skills/<name>/` | MIT |
| Playwright MCP 0.0.85 | npm `@playwright/mcp` (Microsoft), pinned in `~/.claude/mcp-servers/playwright-mcp/package.json` | outside the repo | Apache-2.0 |

Emil Kowalski skills: animate, animate-expo, animation-performance, animation-vocabulary, apple-design, ask-sonner,
break-ui, choreograph, emil-design-eng, find-animation-opportunities, gestures, improve-animations, learn-taste,
mobile-native, pick-ui-library, prototype, remove-animations, review-animations, write-swift. Not applicable to this
PWA: animate-expo (React Native), write-swift, ask-sonner (no toast library; new dependencies are class A).

## Checks made before installing (main session)

- Each repo was cloned into its own scratch folder and read before anything was copied; a keyword scan of every
  skill document for credential, network, shell and instruction-override wording found only design vocabulary.
- Impeccable's engine is a native binary. The copy in `scripts/bin/windows-x64/impeccable.exe` was downloaded from the
  project's GitHub release `engine-v0.1.24`; its SHA-256 `c4e71217677f53beaabec1cd4823a9bb2587355615f1170cf5508e69be4587bc`
  equals the value pinned in the skill's `engine-checksums.txt`; its Authenticode signature is valid (signer
  "Renaissance Geek, Inc.", the signer named in the project's own Windows signing doc); Windows Defender found nothing.
- Impeccable telemetry is off (`impeccable telemetry off`; `~/.impeccable/config.json`). No account is signed in.
- Taste scripts contact only local headless Chrome/Edge, Wikimedia Commons (photo search), GitHub and font hosts;
  none of them is run unless a brief says so.

Not enabled, on purpose: Impeccable's hooks (they would run the detector after every edit by every agent) and its
five helper sub-agents (our agents cannot spawn agents; the skill's `reference/degraded/*.md` covers this). Never run
`impeccable login`, `world`, `health`, `walkthrough`, `install`, `update` or `telemetry on`: they talk to an online
account or change the installation. Taste 2.5.1 declares a Stop hook in its frontmatter; it only acts on a build armed
with its `gate.mjs --start`.

## How agents use them

- Skills: read `.claude/skills/<name>/SKILL.md` (and the reference file a step names) with the Read tool, or invoke
  the skill by name where the agent has the Skill tool.
- Impeccable engine (PowerShell): `.claude\skills\impeccable\scripts\impeccable.cmd context` once per session, and
  `... impeccable.cmd detect http://127.0.0.1:4173/` on the served build (source-only scans skip the rendered-page
  rules). Serve the build with `node tests/e2e/serve.mjs 4173` after `npm --prefix app run build`.
- Playwright MCP: registered for this project (`claude mcp add playwright --scope local`, headless Edge, isolated
  profile). A session started before 15 Nov 08:45 does not have its tools; `scripts/pw_mcp.mjs` drives the same server:

  ```powershell
  $env:Path = 'C:\Program Files\nodejs;' + $env:Path
  node scripts/pw_mcp.mjs --list-tools
  node scripts/pw_mcp.mjs steps.json --max-chars 1500
  ```

  `steps.json` is a list of `{ "tool", "args", "save" }`; `save` writes the step's text or its screenshot to a file.
  Wait for content before a screenshot (`browser_wait_for`). Example:
  `[{"tool":"browser_resize","args":{"width":360,"height":780}},{"tool":"browser_navigate","args":{"url":"http://127.0.0.1:4173/"}},{"tool":"browser_wait_for","args":{"text":"Severe"}},{"tool":"browser_take_screenshot","args":{"fullPage":true},"save":"out/home-360.png"}]`

## Reinstall on another machine

```powershell
git clone https://github.com/emilkowalski/skills; git -C skills checkout 0f2e23b32bb1265e84cff8d3e75785fec953fb1b
git clone https://github.com/pbakaus/impeccable; git -C impeccable checkout 2b86d9c07b97d4bed7de23583e1bd1e58dd2baae
git clone https://github.com/Leonxlnx/taste-skill; git -C taste-skill checkout f6b76575f949707b4e3c37cd86cb44b0b98643e8
git clone https://github.com/Leonxlnx/taste-skill-classics
# copy skills/* (Emil), .claude/skills/impeccable (Impeccable), skills/taste-skill as design-taste-frontend,
# and the four classics into <repo>/.claude/skills/, then:
# npm install @playwright/mcp@0.0.85 in ~/.claude/mcp-servers/playwright-mcp and `claude mcp add playwright --scope local -- node <path>/cli.js --browser msedge --headless --isolated`
```
