@echo off
echo ========================================
echo Gaelic Gym Booker - Server Restart
echo ========================================
echo.

echo Step 1: Stopping existing servers...
echo Please close any terminal windows running:
echo   - uvicorn (backend)
echo   - npm run dev (frontend)
echo.
pause

echo.
echo Step 2: Starting Backend Server...
echo Opening new window for backend...
start "Backend Server" cmd /k "cd /d C:\Users\ConorBrolly\Downloads\Gaelic-Gym-Booker\Gaelic-Gym-Booker\backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Step 3: Starting Frontend Server...
echo Opening new window for frontend...
start "Frontend Server" cmd /k "cd /d C:\Users\ConorBrolly\Downloads\Gaelic-Gym-Booker\Gaelic-Gym-Booker\frontend && npm run dev"

echo.
echo ========================================
echo Servers are starting!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:5000
echo.
echo Two new windows have opened:
echo   1. Backend Server (port 8000)
echo   2. Frontend Server (port 5000)
echo.
echo You can close this window now.
echo.
pause
