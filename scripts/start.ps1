# Runs from the repository root, wherever it is started from
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Cognatio start script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path node_modules)) {
    npm ci
}

Write-Host "[1/3] Starting the database..." -ForegroundColor Yellow
node scripts/dev-db.mjs start
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: the database could not be started!" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "Applying database migrations (Prisma)..." -ForegroundColor Yellow
Set-Location backend
npm run db:migrate
$migrated = $LASTEXITCODE -eq 0
Set-Location ..
if (-not $migrated) {
    Write-Host "ERROR: database migration failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "[2/3] Starting the backend in a new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

Write-Host "[3/3] Starting the frontend in a new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "All services have been started!" -ForegroundColor Green
Write-Host "- Database: port 5432"
Write-Host "- Backend:  http://localhost:4000"
Write-Host "- Frontend: http://localhost:3000"
Write-Host ""
Write-Host "You can close this window now."
