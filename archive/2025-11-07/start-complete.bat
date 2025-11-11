@echo off
echo ========================================
echo   Starting Crypto AI Trading Platform
echo ========================================
echo.

REM Kill any existing processes on the ports
echo Cleaning up existing processes...
FOR /F "tokens=5" %%P IN ('netstat -aon ^| findstr :3001') DO TaskKill /F /PID %%P 2>nul
FOR /F "tokens=5" %%P IN ('netstat -aon ^| findstr :5173') DO TaskKill /F /PID %%P 2>nul

echo.
echo Starting Backend and Frontend...
echo.
echo Backend will be available at: http://localhost:3001
echo Frontend will be available at: http://localhost:5173
echo.

REM Start both backend and frontend concurrently
start /B npm run dev:real

echo.
echo ========================================
echo   Application is starting!
echo   Please wait 10-15 seconds...
echo ========================================
echo.
echo Opening browser in 15 seconds...
timeout /t 15 /nobreak >nul
start http://localhost:5173

echo.
echo Application is running!
echo Press Ctrl+C to stop both servers
echo.

REM Keep window open
pause
