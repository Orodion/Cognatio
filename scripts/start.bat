@echo off
cd /d "%~dp0.."
echo ==========================================
echo    Cognatio start script
echo ==========================================
echo.

if not exist node_modules call npm ci

echo [1/3] Starting the database...
call node scripts/dev-db.mjs start
if errorlevel 1 (
    echo ERROR: the database could not be started!
    pause
    exit /b 1
)
echo.

echo Applying database migrations (Prisma)...
cd backend
call npm run db:migrate
if errorlevel 1 (
    cd ..
    echo ERROR: database migration failed!
    pause
    exit /b 1
)
cd ..
echo.

echo [2/3] Starting the backend in a new window...
start "Cognatio backend" cmd /k "cd backend && npm run dev"

echo [3/3] Starting the frontend in a new window...
start "Cognatio frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All services have been started!
echo - Database: port 5432
echo - Backend:  http://localhost:4000
echo - Frontend: http://localhost:3000
echo.
echo You can close this window now.
pause
