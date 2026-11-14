# Demenova - energy mode: orchestrator on Opus 5.5, every subagent forced onto Sonnet.
# Use near the usage limit, and for documentation, reports and review sweeps.
$env:CLAUDE_CODE_SUBAGENT_MODEL = "sonnet"
$env:CLAUDE_CODE_SUBAGENT_MODEL_FORCE = "1"
$env:PYTHONUTF8 = "1"
Write-Host "Demenova: ENERGY mode (Opus 5.5 main, Sonnet subagents)" -ForegroundColor Yellow
claude --model opus @args
