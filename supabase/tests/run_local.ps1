# LOCAL TESTING ONLY. Never points at Supabase.
# Runs the Demenova schema and RLS tests against a local PostgreSQL in a throwaway database:
#   1. drop + create database $Db (no other database is touched);
#   2. apply supabase/tests/local_shim.sql (Supabase roles, auth schema, default grants);
#   3. apply the six migrations in ONE transaction exactly as supabase/README.md tells Roberto (begin; ... commit;),
#      then a second time to prove they are re-runnable;
#   3c. with -Seed: run supabase/seed/seed_demo.py --dsn twice (as service_role), check row counts and that a re-run
#       keeps telegram_code and a backend-set email_sent flag;
#   4. run supabase/tests/rls_test.sql and count the PASS notices;
#   5. drop $Db, and the three API roles if this run created them (unless -KeepDb).
# The password is read from LOCAL_PG_PASSWORD in .env into PGPASSWORD for this process only; it is never printed.
# Usage (repo root):  powershell -ExecutionPolicy Bypass -File supabase/tests/run_local.ps1 [-Seed] [-KeepDb]
param(
  [string]$Psql = 'C:/Program Files/PostgreSQL/18/bin/psql.exe',
  [string]$PgHost = 'localhost',
  [int]$Port = 5432,
  [string]$User = 'postgres',
  [string]$Db = 'demenova_rls_test',
  [switch]$Seed,
  [switch]$KeepDb
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if ($Db -notmatch '^[a-z_][a-z0-9_]*_test$') { throw "Refusing to use database '$Db': the name must end in _test." }
if (-not (Test-Path $Psql)) { throw "psql not found at $Psql" }

# Password: only the LOCAL_PG_PASSWORD line of .env is used; nothing is echoed.
$envFile = Join-Path $repo '.env'
if (-not (Test-Path $envFile)) { throw '.env not found' }
$match = Select-String -Path $envFile -Pattern '^\s*LOCAL_PG_PASSWORD\s*=' | Select-Object -First 1
if (-not $match) { throw 'LOCAL_PG_PASSWORD is not set in .env' }
$env:PGPASSWORD = ($match.Line -replace '^\s*LOCAL_PG_PASSWORD\s*=\s*', '').Trim().Trim('"').Trim("'")
$env:PGCLIENTENCODING = 'UTF8'

function Invoke-Psql {
  param([string]$Database, [string[]]$Arguments)
  $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  $out = & $Psql -h $PgHost -p $Port -U $User -d $Database -X -q -v ON_ERROR_STOP=1 @Arguments 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE; $ErrorActionPreference = $old
  return [pscustomobject]@{ Code = $code; Output = $out }
}
function Assert-Ok($result, [string]$step) {
  if ($result.Code -ne 0) { $result.Output | Write-Host; throw "$step failed (psql exit $($result.Code))" }
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('demenova_' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
$createdRoles = @()
$failed = $false
try {
  # Which API roles exist before this run (so only the ones we create are dropped later)
  $r = Invoke-Psql 'postgres' @('-t', '-A', '-c', "select string_agg(rolname, ',') from pg_roles where rolname in ('anon','authenticated','service_role')")
  Assert-Ok $r 'role check'
  $existing = ("$($r.Output)").Trim() -split ',' | Where-Object { $_ }
  $createdRoles = @('anon', 'authenticated', 'service_role') | Where-Object { $existing -notcontains $_ }

  Write-Host "1. (re)create database $Db"
  Assert-Ok (Invoke-Psql 'postgres' @('-c', "drop database if exists $Db with (force)")) 'drop database'
  Assert-Ok (Invoke-Psql 'postgres' @('-c', "create database $Db")) 'create database'

  Write-Host '2. local Supabase shim'
  Assert-Ok (Invoke-Psql $Db @('-f', (Join-Path $repo 'supabase/tests/local_shim.sql'))) 'shim'

  # Same concatenation as supabase/README.md step 2
  $sql = Get-ChildItem (Join-Path $repo 'supabase/migrations/*.sql') | Sort-Object Name |
    ForEach-Object { Get-Content $_.FullName -Raw -Encoding UTF8 }
  $bundle = Join-Path $tmp 'migrations_bundle.sql'
  [System.IO.File]::WriteAllText($bundle, ("begin;`n" + ($sql -join "`n") + "`ncommit;`n"), $utf8)

  Write-Host '3a. migrations, first run (one transaction)'
  Assert-Ok (Invoke-Psql $Db @('-f', $bundle)) 'migrations run 1'
  Write-Host '3b. migrations, second run (re-runnable)'
  Assert-Ok (Invoke-Psql $Db @('-f', $bundle)) 'migrations run 2'

  if ($Seed) {
    # No password in the URL: psql (started by the seed) reads PGPASSWORD from this process.
    $dsn = "postgresql://${User}@${PgHost}:${Port}/${Db}"
    $env:PYTHONUTF8 = '1'
    $q = "select (select telegram_code from public.farms where id = 'farm_demo-el-oro') || '|' || " +
         "(select count(*) from public.alert_events where farm_id = 'farm_demo-el-oro' and email_sent)"
    foreach ($run in 1, 2) {
      Write-Host "3c. demo seed, run $run (service_role via psql)"
      if ($run -eq 2) {
        $before = (Invoke-Psql $Db @('-t', '-A', '-c', $q)).Output
        # Simulate the backend having mailed one event: a re-run must not reset the flag.
        Assert-Ok (Invoke-Psql $Db @('-c', "update public.alert_events set email_sent = true where id = (select min(id) from public.alert_events where farm_id = 'farm_demo-el-oro')")) 'flag one event'
      }
      $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
      $out = & uv run python (Join-Path $repo 'supabase/seed/seed_demo.py') --dsn $dsn --psql $Psql 2>&1 | ForEach-Object { "$_" }
      $code = $LASTEXITCODE; $ErrorActionPreference = $old
      $out | ForEach-Object { Write-Host "   $_" }
      if ($code -ne 0) { throw "seed run $run failed (exit $code)" }
    }
    $after = (Invoke-Psql $Db @('-t', '-A', '-c', $q)).Output
    $code1 = ("$before" -split '\|')[0]; $code2 = ("$after" -split '\|')[0]; $flags = ("$after" -split '\|')[1]
    if ($code1 -ne $code2) { throw 'seed re-run changed the demo telegram_code' }
    if ($flags -ne '1') { throw "seed re-run reset email_sent (flagged events after re-run: $flags, expected 1)" }
    Write-Host '   re-run kept telegram_code and the backend-set email_sent flag'
    Assert-Ok (Invoke-Psql $Db @('-c', "update public.alert_events set email_sent = false where farm_id = 'farm_demo-el-oro'")) 'unflag'

    # anon reads the seeded demo through the app's views and cannot write it
    $f = "farm_id = 'farm_demo-el-oro'"
    $views = Invoke-Psql $Db @('-t', '-A', '-F', '=', '-c', ("set role anon; " +
      "select 'v_farm_status', count(*) from public.v_farm_status where $f union all " +
      "select 'v_lot_history_7d', count(*) from public.v_lot_history_7d where $f union all " +
      "select 'v_lot_history_90d', count(*) from public.v_lot_history_90d where $f union all " +
      "select 'v_alert_log', count(*) from public.v_alert_log where $f"))
    Assert-Ok $views 'anon view read'
    Write-Host "   anon reads: $(($views.Output | Where-Object { $_ -match '=' }) -join ', ')"
    $w = Invoke-Psql $Db @('-c', "set role anon; update public.farms set name = 'x' where id = 'farm_demo-el-oro'")
    if ($w.Code -eq 0) { throw 'anon could update the demo farm' }
    $w = Invoke-Psql $Db @('-c', "set role authenticated; delete from public.alert_events where $f")
    if ($w.Code -eq 0) { throw 'authenticated could delete demo alert events' }
    Write-Host '   anon update and authenticated delete of demo rows refused'
  }

  Write-Host '4. RLS and constraint tests'
  $t = Invoke-Psql $Db @('-f', (Join-Path $repo 'supabase/tests/rls_test.sql'))
  $t.Output | Where-Object { $_ -match 'PASS|FAIL|ERROR' } | ForEach-Object { Write-Host "   $_" }
  $pass = @($t.Output | Where-Object { $_ -match 'NOTICE:\s+PASS' }).Count
  if ($t.Code -ne 0) { $failed = $true; Write-Host "RESULT: FAILED after $pass PASS notices (psql exit $($t.Code))" }
  else { Write-Host "RESULT: all tests passed ($pass PASS notices)" }
}
finally {
  if (-not $KeepDb) {
    Write-Host "5. drop database $Db"
    $null = Invoke-Psql 'postgres' @('-c', "drop database if exists $Db with (force)")
    foreach ($role in $createdRoles) { $null = Invoke-Psql 'postgres' @('-c', "drop role if exists $role") }
  }
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
if ($failed) { exit 1 }
