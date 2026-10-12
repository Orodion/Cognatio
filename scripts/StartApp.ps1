# Starts the production version: built frontend, served by the backend itself on one address
# Runs from the repository root, wherever it is started from
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Cognatio – production start" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path node_modules)) {
    npm ci
}

Write-Host "[1/4] Starting the database..." -ForegroundColor Yellow
node scripts/dev-db.mjs start
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: the database could not be started!" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "[2/4] Building the frontend..." -ForegroundColor Yellow
npm run build -w frontend
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: frontend build failed!" -ForegroundColor Red; exit 1 }

Write-Host "[3/4] Building the backend..." -ForegroundColor Yellow
Set-Location backend
npx prisma generate
if ($LASTEXITCODE -eq 0) { npm run build }
if ($LASTEXITCODE -ne 0) { Set-Location ..; Write-Host "ERROR: backend build failed!" -ForegroundColor Red; exit 1 }

Write-Host "[4/4] Starting Cognatio (migrations are applied on start)..." -ForegroundColor Yellow
$env:FRONTEND_DIR = "../frontend/dist"
$env:MIGRATE_ON_START = "true"
$port = if ($env:PORT) { $env:PORT } else { "4000" }
Write-Host ""
Write-Host "Cognatio runs at http://localhost:$port – stop with Ctrl+C" -ForegroundColor Green
Write-Host ""
Start-Job { param($u) Start-Sleep -Seconds 4; Start-Process $u } -ArgumentList "http://localhost:$port" | Out-Null
npm start
Set-Location ..
