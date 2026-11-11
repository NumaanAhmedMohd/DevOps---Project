@echo off
title JiraSRU Docker Launcher
color 0B
echo.
echo  ============================================
echo    JiraSRU - Docker Launcher
echo  ============================================
echo.

REM Check if Docker is installed
where docker >nul 2>&1
if %errorlevel% neq 0 (
  echo  ERROR: Docker is not installed or not running!
  echo.
  echo  Please:
  echo  1. Download Docker Desktop from:
  echo     https://www.docker.com/products/docker-desktop/
  echo  2. Install and START Docker Desktop
  echo  3. Run this script again
  echo.
  start https://www.docker.com/products/docker-desktop/
  pause
  exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
  echo  ERROR: Docker is installed but NOT running!
  echo  Please open Docker Desktop and wait for it to start,
  echo  then run this script again.
  pause
  exit /b 1
)

echo  Docker is running! Starting JiraSRU...
echo.

cd /d "%~dp0"

echo  Building and starting all containers...
echo  (This may take 2-3 minutes the first time)
echo.

docker-compose up --build -d

if %errorlevel% neq 0 (
  echo.
  echo  ERROR: Failed to start containers!
  echo  Run this to see logs: docker-compose logs
  pause
  exit /b 1
)

echo.
echo  Waiting for services to be ready...
timeout /t 8 /nobreak >nul

echo.
echo  ============================================
echo    JiraSRU is running!
echo.
echo    Open browser: http://localhost:3000
echo    API:          http://localhost:5000
echo.
echo    To stop: docker-compose down
echo  ============================================
echo.

start http://localhost:3000
pause
