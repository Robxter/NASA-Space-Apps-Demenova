# Demenova - normal mode: main session and every custom agent on Claude Opus 5.5 (per-agent effort).
Remove-Item Env:CLAUDE_CODE_SUBAGENT_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:CLAUDE_CODE_SUBAGENT_MODEL_FORCE -ErrorAction SilentlyContinue
$env:PYTHONUTF8 = "1"
Write-Host "Demenova: NORMAL mode (Opus 5.5)" -ForegroundColor Green
claude --model opus @args
