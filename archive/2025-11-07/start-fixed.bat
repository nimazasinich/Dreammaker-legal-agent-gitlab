@echo off
REM Start Real Data Server (Fixed Memory Leak Version)
echo.
echo ==========================================
echo   Starting Real Data Server
echo   (Fixed Memory Leak - Using DataContext)
echo ==========================================
echo.

REM Kill any existing Node processes on port 3001
echo [1/3] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo [2/3] Starting backend server...
start "Backend Server" cmd /k "npm run dev:backend:real"

timeout /t 3 /nobreak >nul

echo [3/3] Starting frontend...
start "Frontend" cmd /k "npm run dev:frontend"

echo.
echo ==========================================
echo   ✅ Servers Started!
echo ==========================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press any key to stop servers...
pause >nul

taskkill /F /FI "WINDOWTITLE eq Backend Server*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend*" >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
