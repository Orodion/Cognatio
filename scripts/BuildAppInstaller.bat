@echo off
rem Builds the Windows installer locally (for testing); "BuildAppInstaller.bat portable" also builds the portable ZIP
cd /d "%~dp0.."
if /i "%~1"=="portable" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0BuildAppInstaller.ps1" -Portable
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0BuildAppInstaller.ps1"
)
if errorlevel 1 (
  pause
  exit /b 1
)
pause
