# LOCAL TESTING ONLY. Never points at Supabase.
# Runs the Demenova schema and RLS tests against a local PostgreSQL in a throwaway database:
#   1. drop + create database $Db (no other database is touched);
#   2. apply supabase/tests/local_shim.sql (Supabase roles, auth schema, default grants);
#   3. apply the six migrations in ONE transaction exactly as supabase/README.md tells Roberto (begin; ... commit;),
#      then a second time to prove they are re-runnable;
#   4. run supabase/tests/rls_test.sql and count the PASS notices;
#   5. drop $Db, and the three API roles if this run created them (unless -KeepDb).
# The password is read from LOCAL_PG_PASSWORD in .env into PGPASSWORD for this process only; it is never printed.
# Usage (repo root):  powershell -ExecutionPolicy Bypass -File supabase/tests/run_local.ps1
param(
  [string]$Psql = 'C:/Program Files/PostgreSQL/18/bin/psql.exe',
  [string]$PgHost = 'localhost',
  [int]$Port = 5432,
  [string]$User = 'postgres',
  [string]$Db = 'demenova_rls_test',
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
