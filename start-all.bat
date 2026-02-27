@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Gaelic Gym Booker - Start All

REM ================================================================
REM Configuration (can be overridden by CLI flags)
REM ================================================================
set "PYTHON_CMD=python"
set "BACKEND_HOST=0.0.0.0"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5000"
set "NO_BROWSER=0"

REM CLI flags:
REM   --backend-port <num>  : override backend port (default 8000)
REM   --frontend-port <num> : override frontend port (default 5000)
REM   --no-browser          : do not auto-open the browser
:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--backend-port" (
  if "%~2"=="" (echo Missing value for --backend-port & goto usage)
  set "BACKEND_PORT=%~2"
  shift & shift & goto parse_args
)
if /I "%~1"=="--frontend-port" (
  if "%~2"=="" (echo Missing value for --frontend-port & goto usage)
  set "FRONTEND_PORT=%~2"
  shift & shift & goto parse_args
)
if /I "%~1"=="--no-browser" (
  set "NO_BROWSER=1"
  shift & goto parse_args
)
echo Unknown option: %~1
:usage
echo.
echo Usage: start-all.bat [--backend-port 8000] [--frontend-port 5000] [--no-browser]
echo.
pause
exit /b 1
:args_done

REM ================================================================
REM Sanity checks
REM ================================================================
cd /d "%~dp0"
if not exist "backend"  (
  echo [ERROR] Missing 'backend' folder. Place this file in the project root (the folder that contains backend\ and frontend\).
  pause
  exit /b 1
)
if not exist "frontend" (
  echo [ERROR] Missing 'frontend' folder. Place this file in the project root (the folder that contains backend\ and frontend\).
  pause
  exit /b 1
)

REM ================================================================
REM Backend window
REM ================================================================
echo.
echo Launching Backend on port %BACKEND_PORT% ...
set "BACKEND_CMD=%PYTHON_CMD% -m uvicorn backend.app.main:app --host %BACKEND_HOST% --port %BACKEND_PORT% --reload"
start "GGB Backend (%BACKEND_PORT%)" cmd /k "%BACKEND_CMD%"

REM ================================================================
REM Frontend window (uses package.json dev script; .env.local should already point to the backend)
REM ================================================================
echo.
echo Launching Frontend on port %FRONTEND_PORT% ...
pushd "frontend" >nul
REM Optional: set PORT env var if your dev script respects it (Next.js typically does).
set "PORT=%FRONTEND_PORT%"
start "GGB Frontend (%FRONTEND_PORT%)" cmd /k "npm run dev"
popd >nul

REM ================================================================
REM Open browser (optional)
REM ================================================================
if "%NO_BROWSER%"=="0" (
  echo.
  echo Opening http://localhost:%FRONTEND_PORT% ...
  start "" "http://localhost:%FRONTEND_PORT%"
)

echo.
echo ============================================================================
echo  Gaelic Gym Booker started:
echo    Frontend: http://localhost:%FRONTEND_PORT%
echo    Backend API docs: http://localhost:%BACKEND_PORT%/docs
echo  Each runs in its own window. Stop with CTRL+C in those windows.
echo  To change ports:
echo    > start-all.bat --backend-port 8001 --frontend-port 5001
echo ============================================================================
echo.
pause
endlocal
exit /b 0