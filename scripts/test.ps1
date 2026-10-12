# Runs from the repository root, wherever it is started from
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Cognatio test script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path node_modules)) {
    npm ci
}

Write-Host "[1/3] Running backend tests (starts the local database)..." -ForegroundColor Yellow
node scripts/dev-db.mjs start
cd backend
$env:UPGRADE_TEST_DATABASE_URL = "postgresql://cognatio:cognatio123@localhost:5432/cognatio_test"
$env:DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/dummy"
npx prisma generate
npm run test -- --coverage
cd ..
Write-Host ""

Write-Host "[2/3] Running frontend tests..." -ForegroundColor Yellow
cd frontend
npm run test -- --coverage
cd ..
Write-Host ""

Write-Host "[3/3] Running end-to-end tests (use the local database)..." -ForegroundColor Yellow
cd e2e
npx playwright install chromium
npx playwright test
cd ..
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "All tests have finished!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
