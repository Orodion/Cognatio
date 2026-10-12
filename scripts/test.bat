@echo off
cd /d "%~dp0.."
echo ==========================================
echo    Cognatio test script
echo ==========================================
echo.

if not exist node_modules call npm ci

echo [1/3] Running backend tests (starts the local database)...
call node scripts/dev-db.mjs start
cd backend
set UPGRADE_TEST_DATABASE_URL=postgresql://cognatio:cognatio123@localhost:5432/cognatio_test
set DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
call npx prisma generate
call npm run test -- --coverage > ..\temp_backend.log 2>&1
type ..\temp_backend.log
cd ..
echo.

echo [2/3] Running frontend tests...
cd frontend
call npm run test -- --coverage > ..\temp_frontend.log 2>&1
type ..\temp_frontend.log
cd ..
echo.

echo [3/3] Running end-to-end tests (use the local database)...
cd e2e
call npx playwright install chromium
call npx playwright test
cd ..
echo.

node scriptssummarize.js
echo.

pause
