@echo off
REM Clean and reinstall node_modules for Windows
REM This script removes node_modules and package-lock.json, then reinstalls everything

echo.
echo ==========================================
echo   Cleaning and Reinstalling Dependencies
echo ==========================================
echo.

echo [1/4] Removing node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo [OK] node_modules removed
) else (
    echo [INFO] node_modules not found
)

echo.
echo [2/4] Removing package-lock.json...
if exist package-lock.json (
    del /q package-lock.json
    echo [OK] package-lock.json removed
) else (
    echo [INFO] package-lock.json not found
)

echo.
echo [3/4] Clearing npm cache...
call npm cache clean --force
echo [OK] npm cache cleared

echo.
echo [4/4] Installing dependencies...
call npm install
if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo   Installation Complete!
    echo ==========================================
    echo.
    echo You can now run: npm run dev
) else (
    echo.
    echo ==========================================
    echo   Installation Failed!
    echo ==========================================
    echo.
    echo Please check the error messages above.
)

pause
