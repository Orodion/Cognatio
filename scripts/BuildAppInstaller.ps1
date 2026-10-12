# Builds the Windows installer locally (for testing): web app, backend, bundled PostgreSQL, Electron shell -> NSIS setup
# Result: desktop/release/Cognatio-Setup-<version>.exe (and with -Portable also Cognatio-<version>-portable.zip)
# Runs from the repository root, wherever it is started from
param([switch]$Portable)
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Cognatio - build the Windows installer" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

function Stop-OnError($message) {
    if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: $message" -ForegroundColor Red; exit 1 }
}

Write-Host "[1/5] Dependencies..." -ForegroundColor Yellow
if (-not (Test-Path node_modules)) {
    npm ci
    Stop-OnError "npm ci failed!"
}

Write-Host "[2/5] Bundled PostgreSQL..." -ForegroundColor Yellow
if (Test-Path tools/postgres/bin/pg_ctl.exe) {
    Write-Host "  tools/postgres is there." -ForegroundColor Gray
} else {
    Write-Host "  Not there yet: downloading the PostgreSQL binaries (once, checked against a pinned SHA256)..." -ForegroundColor Gray
    npm run postgres:fetch
    Stop-OnError "PostgreSQL download failed!"
}

Write-Host "[3/5] Licence overview..." -ForegroundColor Yellow
npm run notices:check
Stop-OnError "THIRD-PARTY-NOTICES.md is out of date - run 'npm run notices' and commit the file."

Write-Host "[4/5] Building frontend, backend and installer (takes a few minutes)..." -ForegroundColor Yellow
npm run desktop:dist
Stop-OnError "Installer build failed!"

if ($Portable) {
    Write-Host "[5/5] Portable ZIP..." -ForegroundColor Yellow
    node desktop/scripts/portable.mjs
    Stop-OnError "Portable ZIP failed!"
} else {
    Write-Host "[5/5] Portable ZIP skipped (start with -Portable to build it too)." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done:" -ForegroundColor Green
Get-ChildItem desktop/release -File | Where-Object { $_.Name -match '^Cognatio-Setup-.*\.exe$' -or ($Portable -and $_.Name -match '^Cognatio-.*-portable\.zip$') } | ForEach-Object {
    Write-Host ("  {0}  ({1:N0} MB)" -f $_.FullName, ($_.Length / 1MB)) -ForegroundColor Green
}
Write-Host ""
Write-Host "Test: run the setup file (installs per user, no admin rights). Data of the installed app: %APPDATA%\Cognatio" -ForegroundColor Gray
Start-Process explorer.exe (Resolve-Path desktop/release).Path
