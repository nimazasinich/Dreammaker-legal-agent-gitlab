@echo off
REM BOLT AI - Easy Local Startup Script for Windows
REM This script ensures everything is set up correctly before starting

echo.
echo ========================================
echo  BOLT AI - Local Development Setup
echo ========================================
echo.

REM Check Node.js
echo Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js version: %NODE_VERSION%

REM Check npm
echo Checking npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm version: %NPM_VERSION%

REM Create necessary directories
echo.
echo Creating necessary directories...
if not exist "data" mkdir data
if not exist "config" mkdir config
if not exist "logs" mkdir logs
echo [OK] Directories ready

REM Check if .env exists
if not exist ".env" (
    echo.
    echo Creating .env file from example...
    copy env.example .env >nul
    echo [OK] .env file created
    echo [NOTE] Redis is disabled by default. Edit .env if you want to enable it.
)

REM Check if config/api.json exists
if not exist "config\api.json" (
    echo.
    echo [NOTE] config/api.json will be created automatically on first run
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo Installing dependencies (this may take a few minutes)...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo.
    echo Dependencies already installed
)

REM Start the development server
echo.
echo ========================================
echo  Starting BOLT AI...
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo.
echo Press Ctrl+C to stop
echo.

REM Start both frontend and backend
call npm run dev

pause
