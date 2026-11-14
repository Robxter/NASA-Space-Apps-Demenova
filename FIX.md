# FIX.md — usage-limit recovery and tool setup

**For Claude Code (main session), executed in order.** Steps marked **[ROSTER]** need Roster at the keyboard
(browser sign-ins, API keys, approvals): stop there, say exactly what to do, and wait. Log every decision in
`docs/decisions/DECISIONS.md` (D-008 onward). CLAUDE.md Rule zero still outranks everything in this file.

---

## 0. What happened and what we decided

- Phase 0 is not finished, and Roster hit the 5-hour usage limit **twice** running every agent on Claude Fable 5.2
  at `effort: max`.
- Decision (Roster, 14 Nov): **Claude Opus 5.5 from now on.** Fable is no longer the default for any agent.
- Root causes beyond the model choice, fixed below: every subagent re-reads the full SPEC (a long document) plus
  CLAUDE.md, DATA_POLICY and CONTRACTS on every run; up to 20 subagents can run at once by default; reviews were
  duplicated (ECC and others on the same diff); no visibility of token cost per task.
- Tools evaluated (repos read on 14 Nov 2026):

| Tool | Verdict | Why |
| --- | --- | --- |
| Ponytail (DietrichGebert/ponytail) | **Install, LITE mode only** | Cuts code and tokens; shows cost per task. Roster's warning: some users report it truncates logic, so lite only, with CLAUDE.md overriding it |
| claude-mem (thedotmack/claude-mem) | **Install, configured off-plan** | Cross-session memory saves re-reading. But its observer can run on the Anthropic plan, which spends the same limits: must use a Gemini or OpenRouter key, or not install |
| FreeLLMAPI (tashfeenahmed/freellmapi) | **Optional overflow lane, off by default** | Routes Claude Code to free non-Anthropic models. Its own README warns there are no frontier models. Never for engine, data, agronomy, contracts or agent files |
| OmniRoute (cheaper-inference/OmniRoute) | **Do not install** | Duplicates FreeLLMAPI, and advertises subscription pooling and "TLS stealth" to evade provider blocks. Routing a Claude Team seat through it risks breaking the plan's terms; a suspended seat on Saturday night ends the project |

The legitimate ways to add Claude capacity are more plan capacity or an Anthropic API key billed per use, which
Claude Code can run on. Neither needs a gateway.

---

## 1. Checkpoint before changing anything (5 min, cheap)

1. Run `git status` and `git log --oneline -15`. List what phase 0 already produced against TASKS.md T-001…T-005.
   Do not redo finished work.
2. If a saved session exists, run `/resume-session` and summarise it in five lines.
3. Commit whatever is valid: `git add -A; git commit -m "chore: checkpoint before FIX.md"`.
4. Write a HANDOFF.md entry: "Applying FIX.md; phase 0 status: …".

## 2. Switch every agent to Opus 5.5 with sane effort (5 min)

Effort policy: `xhigh` only where a mistake spreads (lead-architect, data-scientist, scientist-reviewer);
`high` for everyone else. Run from the repo root in PowerShell (writes UTF-8 without BOM so frontmatter stays valid):

```powershell
$noBom = New-Object System.Text.UTF8Encoding $false
$xhigh = @('lead-architect','data-scientist','scientist-reviewer')
Get-ChildItem .claude/agents -Recurse -Filter *.md | ForEach-Object {
  $t = [IO.File]::ReadAllText($_.FullName)
  $t = $t.Replace('model: fable', 'model: opus')
  if ($xhigh -contains $_.BaseName) { $t = $t.Replace('effort: max', 'effort: xhigh') }
  else { $t = $t.Replace('effort: max', 'effort: high') }
  [IO.File]::WriteAllText($_.FullName, $t, $noBom)
}
Select-String -Path .claude/agents/*/*.md -Pattern '^model:|^effort:' | Format-Table Filename, Line
```

Add `maxTurns: 40` to the frontmatter of scientist-reviewer, technical-writer, instructor and agent-ops-engineer
(their runs should be short; partial output can be resumed).

Replace the launchers:

```powershell
Remove-Item scripts/start-max.ps1
@'
# Demenova - normal mode: main session and every custom agent on Claude Opus 5.5 (per-agent effort).
Remove-Item Env:CLAUDE_CODE_SUBAGENT_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:CLAUDE_CODE_SUBAGENT_MODEL_FORCE -ErrorAction SilentlyContinue
$env:PYTHONUTF8 = "1"
Write-Host "Demenova: NORMAL mode (Opus 5.5)" -ForegroundColor Green
claude --model opus @args
'@ | Set-Content scripts/start.ps1 -Encoding ascii

@'
# Demenova - energy mode: orchestrator on Opus 5.5, every subagent forced onto Sonnet.
# Use near the usage limit, and for documentation, reports and review sweeps.
$env:CLAUDE_CODE_SUBAGENT_MODEL = "sonnet"
$env:CLAUDE_CODE_SUBAGENT_MODEL_FORCE = "1"
$env:PYTHONUTF8 = "1"
Write-Host "Demenova: ENERGY mode (Opus 5.5 main, Sonnet subagents)" -ForegroundColor Yellow
claude --model opus @args
'@ | Set-Content scripts/start-energy.ps1 -Encoding ascii
```

Then edit CLAUDE.md §10 and docs/AGENTS.md §2 to describe exactly this: normal = Opus 5.5 everywhere with the effort
policy above; energy = Sonnet subagents. Log as **D-008**.

## 3. Context diet: the fix that matters most (20 min)

### 3a. Split the SPEC so agents read only their sections

```powershell
@'
import re, pathlib
src = pathlib.Path("docs/SPEC.md").read_text(encoding="utf-8")
parts = re.split(r"(?m)^## ", src)
out = pathlib.Path("docs/spec"); out.mkdir(exist_ok=True)
(out / "00-overview.md").write_text(parts[0], encoding="utf-8")
rows = ["| File | Section | ~tokens |", "| --- | --- | --- |"]
for i, p in enumerate(parts[1:], 1):
    title = p.splitlines()[0].replace("· New", "").replace("· Updated", "").strip()
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:48]
    name = f"{i:02d}-{slug}.md"
    (out / name).write_text("## " + p, encoding="utf-8")
    rows.append(f"| {name} | {title} | {len(p)//4} |")
(out / "INDEX.md").write_text("# SPEC sections\n\n" + "\n".join(rows) + "\n", encoding="utf-8")
print("\n".join(rows))
'@ | Set-Content scripts/split_spec.py -Encoding utf8
python scripts/split_spec.py
```

Keep `docs/SPEC.md` as the full source. Then rewrite each agent's **"Read first"** list so it names only these
files (match by section title):

| Agent | SPEC sections to read |
| --- | --- |
| lead-architect | INDEX.md, Stack and deployment, Data architecture, Data modes |
| data-engineer | Data architecture, Prediction science, Demo farm data |
| data-scientist | Prediction science, Risk engine and weighted alerts, Backend state machine, Data modes |
| database-engineer | Data modes, Demo farm data, Stack and deployment |
| api-engineer | Email alerts, Alert channels |
| devops-engineer | Stack and deployment |
| frontend-engineer | UI and UX, Screen specifications, Data modes |
| product-designer | UI and UX, Screen specifications, Pitch angle |
| scientist-reviewer | Prediction science, Agronomic and hydrological foundation |
| agronomist | Agronomic and hydrological foundation, Demo farm data, Data modes |
| qa-demo-engineer | Scope, Screen specifications |
| technical-writer | Pitch angle, Submission checklist, Data modes |
| agent-ops-engineer | none by default (reads agent files and reports) |
| instructor | Data modes, Screen specifications, Alert channels |

Also in every agent file: read `docs/contracts/CONTRACTS.md` and `docs/DATA_POLICY.md` **once per session** and only
the sections the task touches; never paste whole files into reports.

### 3b. Add token rules to CLAUDE.md (new §11, append verbatim)

```markdown
## 11. Token budget rules

- Read only the SPEC sections listed in your agent file (docs/spec/). Use `Grep` to find a passage before reading a file.
- Reports at most 60 lines. Summarise command output; never paste logs, data or whole files.
- One review per diff: either ECC `/code-review` or `/ponytail-review`, never both. Engine diffs add scientist-reviewer.
- At most 2 subagents at a time. Finish and commit a block before starting the next.
- Start a fresh session per build block; `/save-session` at the end of each block.
- Watch the Ponytail band (cost per task). If one task passes the equivalent of 15% of the 5-hour window, stop and
  ask the main session to split it.
- Near the limit: commit, write HANDOFF.md, `/save-session`, then restart with `scripts/start-energy.ps1`.

## 12. Ponytail precedence

Ponytail runs in LITE mode only (never full or ultra). It may shorten implementation; it may never remove or skip:
Rule zero checks, provenance blocks, the provenance checker, tests required by §7b, contract fields, error handling at
trust boundaries, accessibility, or i18n keys. If Ponytail and this file disagree, this file wins.
```

### 3c. Limit concurrency in `.claude/settings.json`

Add to the existing `env` block (documented Claude Code variable; default limit is 20):

```json
"CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS": "2",
"PONYTAIL_DEFAULT_MODE": "lite"
```

Log 3a–3c as **D-009**. Commit: `chore: context diet and token rules (FIX.md §3)`.

## 4. Ponytail in LITE mode (5 min)

**[ROSTER]** In Claude Code, as two separate prompts:

```text
/plugin marketplace add DietrichGebert/ponytail
```

```text
/plugin install ponytail@ponytail
```

Then: `/reload-plugins`, `/ponytail lite`, and make lite the default for future sessions:

```powershell
[Environment]::SetEnvironmentVariable("PONYTAIL_DEFAULT_MODE", "lite", "User")
```

Install only from `DietrichGebert/ponytail` (its author warns that copies shipping `.exe` or `.dll` files are not his).
Verify: the startup text shows **lite**; the band above the prompt shows cost and tokens (needs Claude Code 2.1.290+,
you have 2.1.325; it shows in the terminal, not in the VS Code chat panel). Never run `/ponytail full` or `ultra`.
Use `/ponytail-review` as the single review on non-engine diffs. Log as **D-010**.

## 5. claude-mem, configured so it does NOT spend the Claude plan (15 min)

### 5a. Upgrade Node.js first (required)

claude-mem needs Node 20.19+ or **22.12+**; this machine has **22.11.0**. **[ROSTER]**:

```powershell
winget install OpenJS.NodeJS.LTS
# or download the current LTS installer from nodejs.org; then close and reopen the terminal
node -v   # must print v22.12 or later (or a newer LTS)
```

### 5b. Install and choose an off-plan provider

**[ROSTER]** Create a free Gemini API key (Google AI Studio) or use an OpenRouter key. Then:

```powershell
npx claude-mem install
```

In the browser page it opens: sign in (email magic link), then for **memory provider choose "your own Gemini key"
(or OpenRouter)**. Do **not** choose "Anthropic plan" (it spends the same limits) and skip the paid observer trial
unless Roster wants it. Restart the terminal so the `claude-mem` launcher is on PATH, then:

```powershell
npx claude-mem doctor
npx claude-mem telemetry disable
```

### 5c. Settings (`~/.claude-mem/settings.json`)

```json
{ "CLAUDE_MEM_MODE": "code--chill" }
```

`code--chill` records fewer observations, so less is injected at session start. In the viewer's Settings, turn
**Keep images** off and leave **Cloud Sync** off.

### 5d. Rules for using it (append to CLAUDE.md §11)

```markdown
- claude-mem is a convenience, not a source of truth. HANDOFF.md, DECISIONS.md and reports remain authoritative.
  Memory is never a data source (Rule zero): any value recalled from memory must be re-verified from its file or source.
- Wrap anything sensitive in <private>…</private> so claude-mem never stores it.
```

Log as **D-011**. If Roster has no Gemini/OpenRouter key, **skip claude-mem entirely**; ECC `/save-session` and
HANDOFF.md already cover continuity.

## 6. FreeLLMAPI overflow lane (optional, Roster decides: class A)

Default: **not used.** If Roster approves it as an emergency lane for low-risk drafting when Claude limits are hit:

1. **[ROSTER]** Install the Windows desktop app from the project's GitHub Releases page; add free-tier keys you
   already have (e.g. Google, Groq). Keys stay encrypted locally.
2. Launch Claude Code against it **only in a separate terminal**, with the project's own launcher, which keeps
   credentials out of config files: `npx freellmapi launch`. Do **not** run `setup-claude`: it edits Claude Code's
   config and would silently reroute every future session.
3. Allowed: first drafts of guide text, README wording, Learn-card wording, translation drafts. A Claude agent must
   review every draft before merge.
4. Forbidden: `pipeline/`, `backend/`, `supabase/`, `domain/`, `config/`, `docs/contracts/`, `.claude/`, CLAUDE.md,
   any data file, any agronomic or scientific claim. Never run it at the same time as the main session in the same
   working tree.
5. Every commit made from this lane uses the prefix `draft(overflow):` and is listed in the SI-use log with the model
   that actually served it (`X-Routed-Via` header).

Log the decision either way as **D-012**.

## 7. Plugin and hook load check (5 min)

ECC, Graphify, Ponytail and claude-mem all register hooks. Run `/plugin list` and confirm each is enabled once.
If sessions feel slow or tool calls lag, re-run `npx ecc-universal@2.2.3 setup` and choose the **minimal** hook profile
(ECC's README documents changing the hook profile this way). Keep Graphify in its default soft mode (no `--strict`).

## 8. Re-plan the remaining time (10 min)

1. Re-estimate phase 0 to finish within 45 minutes from now, reusing everything already produced.
2. Update TASKS.md and WORKFLOW.md times from the current clock (Spain time); keep the deadline: submit by 20:00 on
   15 Nov, hard close 23:59.
3. Apply the SPEC cut order early: nice-to-haves are off unless the must-haves are green by day 2, 10:00.
4. Write a HANDOFF.md entry for Tyson if the night-shift timing changed.

## 9. Verify and commit

- [ ] Every agent file shows `model: opus` and the effort policy; `claude plugin validate .claude/agents` passes.
- [ ] `docs/spec/INDEX.md` exists; agents' "Read first" lists point to `docs/spec/` files.
- [ ] CLAUDE.md has §11 and §12; settings.json has the two new env entries.
- [ ] Ponytail shows **lite**; band visible in the terminal.
- [ ] claude-mem `doctor` passes and its provider is NOT the Anthropic plan (or it was skipped).
- [ ] OmniRoute not installed; FreeLLMAPI decision logged.
- [ ] DECISIONS.md has D-008 to D-012; HANDOFF.md updated.

```powershell
git add -A
git commit -m "chore: apply FIX.md (Opus 5.5, context diet, ponytail lite, claude-mem off-plan)"
git push
```

Then restart with `scripts/start.ps1` and continue phase 0 from the checkpoint.
