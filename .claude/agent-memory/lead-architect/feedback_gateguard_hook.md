---
name: feedback-gateguard-hook
description: How to get shell commands past the GateGuard / Fact-Forcing hook without wasted retries
metadata:
  type: feedback
---

Before the first shell command, and before anything the hook deems destructive, state in the message: the request
in one sentence, what the command produces or modifies, a one-line rollback, and the instruction verbatim. The hook
also wants a Grep/Glob before the first Edit of an existing file.

**Why:** in phase 0 a read-only `npm audit --json | ConvertFrom-Json | ForEach-Object { $_.Value ... }` pipeline was
flagged as destructive twice; a plain `npm audit | Select-String ...` passed.
**How to apply:** prefer simple read-only commands; for multi-line Python checks pipe a here-string to
`uv run python -` instead of `python -c` with nested quotes (PowerShell mangles them).
