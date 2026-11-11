@echo off
title Jira SRU Launcher
color 0A
echo.
echo  ============================================
echo    Jira SRU - Starting Application
echo  ============================================
echo.

:: Start MongoDB
echo [1/3] Starting MongoDB...
if not exist "C:\data\db" mkdir "C:\data\db"
start "MongoDB" /min "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --dbpath C:\data\db
timeout /t 3 /nobreak >nul
echo       MongoDB ready!
echo.

:: Start Backend
echo [2/3] Starting Backend (port 5000)...
start "Jira SRU Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 4 /nobreak >nul
echo       Backend running on http://localhost:5000
echo.

:: Open Frontend in browser
echo [3/3] Opening app in browser...
start "" "http://localhost:5000"
echo       Browser opened!
echo.

echo  ============================================
echo    App is running!
echo    URL: http://localhost:5000
echo  ============================================
echo.
echo  Press any key to stop all services...
pause >nul

:: Cleanup
echo Stopping services...
taskkill /f /fi "WINDOWTITLE eq Jira SRU Backend" >nul 2>&1
taskkill /f /im mongod.exe >nul 2>&1
echo Done. Goodbye!
