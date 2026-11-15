# domain/

Owner: agronomist agent. No human agronomist is on the team since 14 Nov 2026 (D-022, D-025): every item is
reviewed by agents only (`reviewed_by: [agronomist-agent, scientist-reviewer]`, `human_review: none`).

Purpose: agronomic tables the engine and the app read: `practices.yaml`, `strategies.yaml`, `actions.yaml`,
`thresholds.yaml`, `flood_memories.yaml`, `glossary.yaml`, plus `agronomist-answers-archive.md` (closed archive of
the former team agronomist's answers) and `review-queue.md` (open questions for a future local agronomist; nothing
waits on them). Each file has a JSON Schema in `docs/contracts/schemas/domain/` and is validated by
`uv run pytest tests/test_contracts.py`. Every value carries its origin; unsourced statements are labelled
"General guidance — not reviewed by an agronomist"; unknown values are `null` + `pending`.
