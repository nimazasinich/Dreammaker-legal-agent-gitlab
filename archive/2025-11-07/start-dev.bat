@echo off
echo.
echo ==========================================
echo    BOLT AI Development Server
echo ==========================================
echo.
echo Starting frontend and backend servers...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start both servers using concurrently
npm run dev

pause

