@echo off
echo ====================================
echo Clean Restart Script for BOLT AI
echo ====================================

echo.
echo [1/3] Killing processes on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Found PID: %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo [2/3] Killing processes on port 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo Found PID: %%a
    taskkill /PID %%a /F 2>nul
)

echo.
echo [3/3] All processes killed.
echo.
echo ====================================
echo Ready to start!
echo ====================================
echo.
echo To start the backend:
echo   set PORT=3001 ^&^& npm run dev:backend:real
echo.
echo To start the frontend (in a new terminal):
echo   npm run dev:frontend
echo.
pause

