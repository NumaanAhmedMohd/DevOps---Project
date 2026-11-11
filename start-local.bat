@echo off
title JiraSRU Launcher
color 0A
echo.
echo  ============================================
echo    JiraSRU - Project Management App
echo  ============================================
echo.

REM Check if Node is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  ERROR: Node.js is not installed!
  echo  Download from: https://nodejs.org
  pause
  exit /b 1
)

REM Check if MongoDB is running
echo  [1/3] Checking MongoDB...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo  WARNING: MongoDB is not installed locally.
  echo  The app needs MongoDB to store data.
  echo.
  echo  Options:
  echo  1. Install MongoDB: https://www.mongodb.com/try/download/community
  echo  2. Use Docker Desktop (recommended): https://www.docker.com/products/docker-desktop/
  echo.
  echo  If you have Docker Desktop installed, close this and run:
  echo      docker-compose up --build
  echo  from the Jira_SRU folder instead.
  echo.
  pause
  exit /b 1
)

echo  [2/3] Installing backend dependencies...
cd /d "%~dp0backend"
if not exist node_modules (
  npm install
)

echo  [3/3] Starting backend server...
start "JiraSRU Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo  Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo  Starting frontend server...
start "JiraSRU Frontend" cmd /k "cd /d %~dp0frontend && npx serve . -p 3000"

timeout /t 3 /nobreak >nul

echo.
echo  ============================================
echo    App is running!
echo    Open your browser and go to:
echo    http://localhost:3000
echo  ============================================
echo.

start http://localhost:3000
pause
