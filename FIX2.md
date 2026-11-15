# FIX2.md — the former team agronomist has left the team: solo build by Roberto

**For Claude Code (main session), executed in order after FIX.md.** Steps marked **[ROBERTO]** need him at the
keyboard. Log every decision in `docs/decisions/DECISIONS.md` (D-013 onward). CLAUDE.md Rule zero still outranks
everything here. Goal: zero stagnation. Nothing in the build may wait on the former team agronomist again.

---

## 0. What changed

1. **The former team agronomist (team agronomist) left the team on 14 Nov 2026.** He will answer nothing more. Everything he answered
   before leaving stays valid as data (see §3). Everything still pending from him is closed now.
2. **The product owner's name.** The owner is **Cristian Roberto Terán Paredes; preferred name Roberto.** "Roster"
   was a chat handle. Use **Roberto** in every file, prompt, report and commit. Use the full legal name only where an
   official form requires it (Space Apps registration, licence notices if any).
3. **The team is now one human: Roberto.** He is product owner, final approver and the only person testing on
   devices. There is no human domain expert and no night shift.

## 1. Rename "Roster" to "Roberto" everywhere (5 min)

Run from the repo root (writes UTF-8 without BOM; skips Git, dependencies and data):

```powershell
$noBom = New-Object System.Text.UTF8Encoding $false
$skip = '\\(\.git|node_modules|\.venv|dist|pipeline\\data|app\\public\\data)\\'
Get-ChildItem -Recurse -File -Include *.md,*.yaml,*.yml,*.json,*.ps1,*.py,*.ts,*.tsx,*.toml |
  Where-Object { $_.FullName -notmatch $skip } |
  ForEach-Object {
    $t = [IO.File]::ReadAllText($_.FullName)
    if ($t -match 'Roster') {
      [IO.File]::WriteAllText($_.FullName, ($t -replace 'Roster', 'Roberto'), $noBom)
      Write-Host "updated $($_.FullName)"
    }
  }
Select-String -Path (Get-ChildItem -Recurse -File -Include *.md,*.yaml,*.ps1 | Where-Object { $_.FullName -notmatch $skip }) -Pattern 'Roster'
```

The last command must print nothing. In CLAUDE.md's header, set the team line to:
`Team: Roberto (Cristian Roberto Terán Paredes), product owner, builder and final approver. Solo since 14 Nov 2026.`
Log as **D-013**.

## 2. Close everything that was waiting on the former team agronomist (10 min)

In TASKS.md mark these **[x] closed: won't do (team change, D-014)**: T-046 and T-060 to T-064. Remove the former team agronomist from
every "Waiting on" line in HANDOFF.md. In `docs/AGENTS.md`, the humans are now Roberto only. Add to DECISIONS.md:

| ID | Decision |
| --- | --- |
| D-014 | All tasks owned by the former team agronomist are closed. No agent may create a task that waits on a human domain expert. |

## 3. What his answers mean now (data policy)

Rename `domain/agronomist-answers-archive.md` to `domain/agronomist-answers-archive.md` and put this header at the top:

```markdown
# Agronomist answers archive (closed 14 Nov 2026)
Provided by the team's agronomy student before he left the team. Valid as data, origin `sourced`,
source "team agronomist, 14 Nov 2026". Do not name him in public materials (§7). No new entries.
```

| Item | Status now | Origin tag |
| --- | --- | --- |
| Banana tolerates at most 2 days of waterlogging; roots at 70 cm | **Keep**, used by the 2-day floor rule | sourced (team agronomist) |
| Machala / El Oro is the right area | Keep | sourced (team agronomist) |
| Field problems, signals, users, phone-first, trust via history, adoption barriers | Keep as product requirements | sourced (team agronomist) |
| His family farm keeps no records; does not use maní forrajero | Keep internally as the founding case; anonymous in public | sourced (team agronomist) |
| Questionnaire 5.1–5.10 (variety, density, soil, drains, actions, vocabulary, channel, biosecurity, solo actions, review time) | **Closed.** Defaults become the v1 values | estimated, reason "team agronomist left; default retained" |
| Sigatoka Watch after 3 days; cold-stress threshold | Experimental; labelled in UI | estimated |
| Draft strategy scores (soil, water, cost, labour) | Drafted by Claude, never validated | estimated |
| Strategy costs and labour | **Unknown: show "not estimated"**, never guess | pending |
| AHP pairwise matrix (his Task 7) | Never answered: see §4 | none |
| Flood memories (his Task 6) | Never answered: use documented floods only | none |
| Evidence of zero-data farms (his Task 5) | Only his own farm: anonymous anecdote, no statistics | sourced (team agronomist) |
| Consent to use his name, voice or photo (5.11) | **Treat as withdrawn** because he left: do not use them unless he reconfirms in writing | n/a |

Update `docs/DATA_POLICY.md` §4 and §5 to match this table. Log as **D-015**.

## 4. Engine decisions without an expert (data-scientist)

1. **Weights.** Keep the SPEC starting weights (0.35 upstream, 0.25 saturation, 0.20 terrain, 0.10 local, 0.10
   balance) with `origin: design` and the reason "engineering choice; no expert AHP matrix available".
2. **Replace AHP with a sensitivity check** (cheaper and more convincing with no expert): perturb each weight by ±0.10
   (renormalising the rest) and re-run the 22–23 Feb 2026 replay. Report whether the same lots reach Severe on the same
   days. Write the result to `app/public/data/demo/verification.json` and a short note in the engine report. If the
   result is stable, that is the evidence the pitch needs; if not, report it honestly.
3. `ahp.py`: if already implemented and tested, keep it unused and documented as the path for a future local
   agronomist. If not implemented, do not implement it now (roadmap).
4. **Calibration** uses only documented events: 22–23 Feb 2026 (Buenavista, Pasaje; Pital, Santa Rosa), 11–12 Oct 2026
   (Santa Rosa), 19 and 24 Oct 2026 (Chaguana, El Guabo). Tag them `observed (press)` with their URLs from the SPEC.
5. Side indicators (Sigatoka, cold stress) move to nice-to-have and, if built, show an "Experimental" badge.

Log as **D-016**.

## 5. Agronomic content without an agronomist (agronomist agent)

The agronomist agent stays, with a new mandate. Edit `.claude/agents/validation/agronomist.md`:

- Remove every mention of the former team agronomist approving work, `approved_by: The former team agronomist`, the Spanish review queue for him, and the memory
  note about him redefining demo lots. Replace the memory note with: "The synthetic demo farm is final for v1."
- New fields on every domain item: `reviewed_by: [agronomist-agent, scientist-reviewer]`, `human_review: none`.
- New rule: **sourced or labelled.** Each agronomic statement must cite a source the agent opened (FAO, CORBANA,
  national extension or plant-health agencies, peer-reviewed papers), or be shown with the label
  "General guidance — not reviewed by an agronomist". Timebox: 15 minutes of searching per item, then label and move on.
- **Recommended actions are checks, not prescriptions.** Allowed: "Check the drainage channels of this lot",
  "Avoid heavy machinery on saturated soil", "Inspect for standing water after the rain stops". Forbidden: products,
  doses, chemicals, diagnoses, yield or cost promises.
- **Biosecurity (Fusarium TR4):** no recommendations of our own. At most one neutral line pointing to Ecuador's official
  plant-health authority, only if the agent opens its official page and cites it. Otherwise show nothing.
- Rename `domain/review-queue.md` to `domain/review-queue.md` with the header "For a future local agronomist".
- Vocabulary: standard Spanish (encharcamiento, lote, drenaje, inundación).

In the app, strategy and action screens show the badge "Not yet reviewed by a local agronomist". Turn it into a strength
in the pitch: Demenova is designed to be validated and tuned by local agronomists (the Strategies footer already says it
supports, never replaces, their judgment). Log as **D-017**.

## 6. Other agents to update (one pass, 15 min)

| Agent | Change |
| --- | --- |
| technical-writer | Drop the Spanish summaries for the former team agronomist. Block reports in English only. |
| qa-demo-engineer | Device checklist: Roberto's iPhone 14 Pro and iPad Air M2 only. Android coverage via Chrome DevTools device emulation at 360×780 with CPU 4× slowdown and "Slow 4G" throttling, plus Samsung Internet if Roberto can borrow an Android phone. |
| instructor | Guides state that agronomic guidance is general and not yet reviewed by a local agronomist. Farmer guide still Spanish first. |
| product-designer | No change; mockups must show the new "not reviewed" badge style. |
| lead-architect | Update `docs/AGENTS.md` (humans: Roberto only), CLAUDE.md approvals (all class A decisions go to Roberto; nothing waits on anyone else). |
| all agents | Remove "Resumen para el exagrónomo del equipo" from the report template in `docs/AGENTS.md`. |

Commit: `chore: adapt agents to solo build (FIX2 §5-6)`. Log as **D-018**.

## 7. Public materials: name and consent

- Do **not** name the former team agronomist, show his photo or use his voice or quotes in the video, the project page, the guides or the
  repo README, unless Roberto receives his written reconfirmation.
- Allowed anonymous framing: "Demenova started from the experience of an agronomy student whose family runs a banana
  farm that keeps no records, so every flood comes as a surprise."
- The human story in the pitch is now Roberto's. The evidence for the problem is the documented February 2026 floods and
  the reported effect on Fusarium TR4 containment (sources already in the SPEC).
- **[ROBERTO]** On the Space Apps site, check the team's **Members** tab. Ask the Local Lead whether a member who left
  should be removed before submission, and make sure only active members are listed. Log as **D-019**.

## 8. Scope for a solo build under usage limits

**Must have (unchanged in spirit, trimmed):**
- Replay of 15 Feb – 5 Mar 2026 with the four alert levels and contributing factors.
- Home, Map, Lot detail with history.
- Strategies: three options per lot with reasons, evidence, gaps and risks; numeric cost and labour shown only if sourced.
- Data levels 0 to 2 (pin, outline with automatic zones, exact lots by drawing, import or typing) with the confidence badge.
- Email on Severe. Records saved by default. Units and language toggles. Public link.
- Sensitivity check result (§4) visible in Lot detail or a "How reliable is this?" sheet.

**Moved to nice-to-have (build only if must-haves are green by day 2, 11:00):** Telegram bot, flood memory timeline,
level 3 field notes, farmer/agronomist toggle, priority sliders, Sigatoka and cold indicators, Costa Rica proof map,
live IMERG polling, spraying indicator.

Update the SPEC-derived scope in TASKS.md and WORKFLOW.md. Log as **D-020**.

## 9. New timeline: one human, no night shift

All times Spain. Deadline 23:59 on 15 Nov; submit by 20:00.

| When | What |
| --- | --- |
| Now → 00:00 | Finish phase 0 and phase 1 essentials in **normal** mode (Opus 5.5). Two agents at a time at most. |
| Before sleeping (≈23:45) | Start **non-LLM** jobs that spend no tokens: IMERG/SMAP/POWER downloads and harmonisation scripts for the replay window, run as plain `uv run python -m pipeline.ingest ...` in a separate PowerShell window. Commit, HANDOFF.md, `/save-session`. Do **not** leave agents running unattended. |
| 00:00 → 04:30 | Roberto sleeps. Downloads finish. The 5-hour usage window resets while he sleeps. |
| 04:30 → 10:00 | Engine on the downloaded data, sensitivity check, app shell, Home, Map, Lot detail, email. |
| 10:00 → 13:00 | Strategies, data levels 0–2, deploy to Render, QA on emulated Android + iPhone. |
| 13:00 → 15:00 | Fix blockers; technical-writer drafts project page; instructor drafts guides. |
| 15:00 | Feature freeze. |
| 15:00 → 19:00 | Roberto records and edits the 30-second video (screen recordings; captions in English; his own voice or captions only). |
| 19:00 → 20:00 | Submit. Buffer to 23:59. |

When usage approaches the limit at any point: commit, HANDOFF.md, `/save-session`, restart with
`scripts/start-energy.ps1`, and keep going on documentation, QA and review work while builder work waits for the reset.

## 10. Anti-stagnation rules (append to CLAUDE.md as §13)

```markdown
## 13. Solo-build rules (since 14 Nov 2026)

- No task may wait on a human other than Roberto. If an agent needs domain input, it researches for at most
  15 minutes, then either cites what it opened or labels the item "estimated" / "not reviewed" and moves on.
- Class A questions go to Roberto in one batch per block, each with a recommended default. If Roberto has not
  answered by the end of the block, the recommended default applies and is logged as such.
- Unknown values are shown as unknown. Never invent a number to fill a gap left by the team change.
- Prefer cutting a nice-to-have over slowing a must-have.
```

## 11. Verify and commit

- [ ] `Select-String` finds no "Roster" in the repo; CLAUDE.md shows Roberto as the team.
- [ ] TASKS.md: The former team agronomist's tasks closed; scope updated; no "waiting on the former team agronomist".
- [ ] `domain/agronomist-answers-archive.md` exists with its header; `domain/review-queue.md` replaces the old queue.
- [ ] Agronomist agent edited; report template has no Spanish summary.
- [ ] DATA_POLICY §4–§5 and CLAUDE.md §13 updated.
- [ ] DECISIONS.md has D-013 to D-020; HANDOFF.md has a new entry.

```powershell
git add -A
git commit -m "chore: apply FIX2.md (solo build, Roberto, closed agronomist inputs)"
git push
```

Then continue the build from the current block with `scripts/start.ps1`.
