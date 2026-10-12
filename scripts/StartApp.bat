@echo off
rem Starts the production version: built frontend, served by the backend itself on one address
cd /d "%~dp0.."
echo ==========================================
echo    Cognatio - production start
echo ==========================================
echo.

if not exist node_modules call npm ci

echo [1/4] Starting the database...
call node scripts/dev-db.mjs start
if errorlevel 1 (
    echo ERROR: the database could not be started!
    pause
    exit /b 1
)
echo.

echo [2/4] Building the frontend...
call npm run build -w frontend
if errorlevel 1 goto failed

echo [3/4] Building the backend...
cd backend
call npx prisma generate
if errorlevel 1 goto failedbackend
call npm run build
if errorlevel 1 goto failedbackend

echo [4/4] Starting Cognatio (migrations are applied on start)...
set FRONTEND_DIR=../frontend/dist
set MIGRATE_ON_START=true
if "%PORT%"=="" set PORT=4000
echo.
echo Cognatio runs at http://localhost:%PORT% - stop with Ctrl+C
echo.
start "" /min cmd /c "timeout /t 4 /nobreak >NUL & start http://localhost:%PORT%"
call npm start
cd ..
exit /b 0

:failedbackend
cd ..
:failed
echo ERROR: build failed!
pause
exit /b 1
