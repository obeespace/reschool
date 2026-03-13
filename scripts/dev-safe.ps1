$ErrorActionPreference = "SilentlyContinue"

$workspace = (Resolve-Path ".").Path

$d1StateDir = Join-Path $workspace ".wrangler\state\v3\d1\miniflare-D1DatabaseObject"
$sqliteFile = $null

if (Test-Path $d1StateDir) {
  $sqliteFile = Get-ChildItem -Path $d1StateDir -Filter "*.sqlite" -File | Select-Object -First 1
}

if (-not $sqliteFile) {
  Write-Output "No local D1 sqlite found. Applying local migrations..."
  $env:CI = "1"
  pnpm db:migrate:local

  if (Test-Path $d1StateDir) {
    $sqliteFile = Get-ChildItem -Path $d1StateDir -Filter "*.sqlite" -File | Select-Object -First 1
  }
}

if ($sqliteFile) {
  $env:LOCAL_D1_SQLITE_PATH = $sqliteFile.FullName
  Write-Output ("Using LOCAL_D1_SQLITE_PATH=" + $env:LOCAL_D1_SQLITE_PATH)
} else {
  Write-Output "Warning: local D1 sqlite file was not found; API routes may return D1 unavailable."
}

# Kill any previous Next dev process launched from this workspace.
Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "node.exe" -and
    $_.CommandLine -and
    $_.CommandLine -match [regex]::Escape($workspace) -and
    $_.CommandLine -match "next\\dist\\bin\\next.*dev|start-server\.js"
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
  }

Start-Sleep -Milliseconds 400

if (Test-Path ".next/dev/lock") {
  Remove-Item ".next/dev/lock" -Force
}

$ErrorActionPreference = "Continue"
pnpm exec next dev --webpack
