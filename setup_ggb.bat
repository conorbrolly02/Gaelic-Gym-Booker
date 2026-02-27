@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Gaelic Gym Booker - One-Time Setup (logging + pause)

REM ============================================================= setupREM ================================================================
REM ================================================================
cd /d "%~dp0"
set "LOGFILE=%cd%\setup_ggb.log"
> "%LOGFILE%" echo ================================================================
>>"%LOGFILE%" echo Run started: %DATE% %TIME%
>>"%LOGFILE%" echo Working dir: %cd%
>>"%LOGFILE%" echo ================================================================

REM --- Helpers -----------------------------------------------------
:log
echo %~1
>>"%LOGFILE%" echo %~1
exit /b 0

:die
call :log ""
call :log "[ERROR] %~1"
call :log "See ""%LOGFILE%"" for details."
>>"%LOGFILE%" echo ================================================================
>>"%LOGFILE%" echo Run ended: %DATE% %TIME%
>>"%LOGFILE%" echo ================================================================
echo.
pause
exit /b 1

REM ================================================================
REM [1/8] Sanity checks: folders (per setup guide)
REM ================================================================
call :log "[1/8] Verifying project folders..."
if not exist "backend"  call :die "Missing 'backend' folder. Run from project root: Gaelic-Gym-Booker\Gaelic-Gym-Booker."
if not exist "frontend" call :die "Missing 'frontend' folder. Run from project root: Gaelic-Gym-Booker\Gaelic-Gym-Booker."
call :log "    OK"

REM ================================================================
REM [2/8] Check Python (3.11+) (per setup guide)
REM ================================================================
call :log ""
call :log "[2/8] Checking Python..."
set "PYTHON_CMD=python"
where %PYTHON_CMD% >nul 2>nul || call :die "Python not found on PATH. Install Python 3.11+ and ensure 'Add to PATH' was ticked."

for /f "tokens=2 delims= " %%v in ('%PYTHON_CMD% -V 2^>^&1') do set "PYVER=%%v"
for /f "tokens=1-3 delims=." %%a in ("%PYVER%") do (set "PYMAJ=%%a" & set "PYMIN=%%b")
if "%PYMAJ%"=="3" (
  if "%PYMIN%" lss "11" call :log "  WARNING: Detected Python %PYVER% (guide recommends 3.11+)."
) else (
  call :log "  WARNING: Detected Python %PYVER% (guide recommends 3.11+)."
)
call :log "    Python %PYVER% OK (continuing)"

REM ================================================================
REM [3/8] Check Node.js (18+) - robust parsing
REM ================================================================
call :log ""
call :log "[3/8] Checking Node.js..."
where node >nul 2>nul || call :die "Node.js not found on PATH. Install Node.js LTS 18+."

REM Use Node to print the clean semantic version (no leading 'v')
for /f %%v in ('node -p "process.versions.node"') do set "NODEV=%%v"

set "NODEMAJOR="
for /f "tokens=1 delims=." %%a in ("%NODEV%") do set "NODEMAJOR=%%a"
if not defined NODEMAJOR set "NODEMAJOR=0"

set /a NODEDIFF=NODEMAJOR-18 >nul 2>&1
if %NODEDIFF% LSS 0 (
  call :log "  WARNING: Detected Node.js v%NODEV% (guide recommends 18+)."
) else (
  call :log "    Node.js v%NODEV% OK"
)

REM ================================================================
REM [4/8] Parse optional flags
REM   --fresh-db   : delete backend\gym_booking.db
REM   --seed-admin : run backend\create_test_users.py
REM   --no-start   : do not auto-start servers
REM ================================================================
set "FRESH_DB=0"
set "SEED_ADMIN=0"
set "NO_START=0"
:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--fresh-db"   set "FRESH_DB=1"
if /I "%~1"=="--seed-admin" set "SEED_ADMIN=1"
if /I "%~1"=="--no-start"   set "NO_START=1"
shift
goto parse_args
:args_done

REM ================================================================
REM [5/8] Backend deps: pip install -e . (per setup guide)
REM ================================================================
call :log ""
call :log "[5/8] Installing backend (Python) dependencies..."
%PYTHON_CMD% -m pip install --upgrade pip >> "%LOGFILE%" 2>&1 || call :die "Failed to upgrade pip (see log)."
%PYTHON_CMD% -m pip install -e .         >> "%LOGFILE%" 2>&1 || call :die "pip install failed (see log)."
call :log "    Backend dependencies installed."

REM ================================================================
REM [6/8] Frontend deps: npm install (per setup guide)
REM ================================================================
call :log ""
call :log "[6/8] Installing frontend (Node) dependencies..."
pushd "frontend" >nul || call :die "Cannot enter 'frontend' folder."
if not exist "package.json" (
  popd >nul
  call :die "frontend\package.json not found."
)
npm install >> "%LOGFILE%" 2>&1 || (popd >nul & call :die "npm install failed (see log).")
call :log "    Frontend dependencies installed."

REM Ensure frontend\.env.local exists (per setup guide)
if not exist ".env.local" (
  call :log "[6.1/8] Creating frontend\.env.local with NEXT_PUBLIC_API_URL=http://localhost:8000 ..."
  > ".env.local" echo NEXT_PUBLIC_API_URL=http://localhost:8000
) else (
  call :log "[6.1/8] frontend\.env.local already exists. Leaving it unchanged."
)
popd >nul

REM ================================================================
REM [7/8] Optional DB reset & seeding (per setup guide)
REM ================================================================
if "%FRESH_DB%"=="1" (
  call :log ""
  call :log "[7/8] Fresh DB requested -- deleting backend\gym_booking.db (if present)..."
  if exist "backend\gym_booking.db" del /f /q "backend\gym_booking.db"
)

if "%SEED_ADMIN%"=="1" (
  call :log ""
  call :log "[7.1/8] Seeding admin/test users..."
  %PYTHON_CMD% "backend\create_test_users.py" >> "%LOGFILE%" 2>&1 || call :log "  WARNING: Seeding script failed (see log)."
)

REM ================================================================
REM [8/8] Create helper launchers and optionally start servers
REM ================================================================
call :log ""
call :log "[8/8] Creating helper launchers (start-backend.bat, start-frontend.bat)..."
(
  echo @echo off
  echo cd /d "%%~dp0"
  echo echo Starting Backend Server...
  echo %PYTHON_CMD% -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
  echo pause
) > "start-backend.bat"

(
  echo @echo off
  echo cd /d "%%~dp0frontend"
  echo echo Starting Frontend Server...
  echo npm run dev
  echo pause
) > "start-frontend.bat"
call :log "    Done."

if "%NO_START%"=="1" (
  call :log ""
  call :log "Setup complete. Launch manually with:"
  call :log "  > start-backend.bat"
  call :log "  > start-frontend.bat"
  goto finish
)

call :log ""
call :log "Launching servers in two new windows..."
start "GGB Backend"   cmd /k %PYTHON_CMD% -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
pushd "frontend" >nul
start "GGB Frontend"  cmd /k npm run dev
popd >nul

call :log ""
call :log "============================================================================"
call :log " Gaelic Gym Booker is starting:"
call :log "   Frontend: http://localhost:5000"
call :log "   Backend API docs: http://localhost:8000/docs"
call :log " (Close each server with CTRL+C in its window.)"
call :log "============================================================================"

:finish
>>"%LOGFILE%" echo ================================================================
>>"%LOGFILE%" echo Run ended: %DATE% %TIME%
>>"%LOGFILE%" echo ================================================================
echo.
echo A detailed log is in: "%LOGFILE%"
echo.
pause
endlocal
exit /b 0
