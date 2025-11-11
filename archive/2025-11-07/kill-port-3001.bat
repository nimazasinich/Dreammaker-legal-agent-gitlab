@echo off
echo Checking for processes on port 3001...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Found process: %%a
    taskkill /F /PID %%a
    echo Process killed.
)

echo Port 3001 should now be free.
pause
