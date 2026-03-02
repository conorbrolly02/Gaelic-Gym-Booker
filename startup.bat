@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Gaelic Gym Booker - Startup

REM ================================================================
REM Gaelic Gym Booker - Startup Script
REM This script starts both backend and frontend servers
REM ================================================================

echo.
echo ========================================
echo  Gaelic Gym Booker - Starting Up
echo ========================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM ================================================================
REM Verify directories exist
REM ================================================================
if not exist "backend" (
    echo [ERROR] Backend directory not found!
    echo Please run this script from the project root.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo [ERROR] Frontend directory not found!
    echo Please run this script from the project root.
    pause
    exit /b 1
)

REM ================================================================
REM Check if backend is already running
REM ================================================================
echo [1/4] Checking for existing servers...
netstat -ano | findstr ":8000" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 8000 is already in use. Backend may already be running.
    echo Please run shutdown.bat first, or close the existing backend.
    pause
    exit /b 1
)

netstat -ano | findstr ":5000" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 5000 is already in use. Frontend may already be running.
    echo Please run shutdown.bat first, or close the existing frontend.
    pause
    exit /b 1
)

echo All ports available.
echo.

REM ================================================================
REM Start Backend Server
REM ================================================================
echo [2/4] Starting Backend Server...
echo Backend will run on: http://localhost:8000
echo API Documentation: http://localhost:8000/docs

start "Gaelic Gym Booker - Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul
echo.

REM ================================================================
REM Start Frontend Server
REM ================================================================
echo [3/4] Starting Frontend Server...
echo Frontend will run on: http://localhost:5000

cd frontend
start "Gaelic Gym Booker - Frontend (Port 5000)" cmd /k "npm run dev"
cd ..

echo Waiting for frontend to start...
timeout /t 5 /nobreak >nul
echo.

REM ================================================================
REM Open Browser
REM ================================================================
echo [4/4] Opening browser...
timeout /t 3 /nobreak >nul
start "" "http://localhost:5000"

echo.
echo ========================================
echo  Startup Complete!
echo ========================================
echo.
echo Backend:      http://localhost:8000
echo API Docs:     http://localhost:8000/docs
echo Frontend:     http://localhost:5000
echo.
echo Two server windows have been opened:
echo   - Backend Server (Port 8000)
echo   - Frontend Server (Port 5000)
echo.
echo To stop the servers, run: shutdown.bat
echo Or press Ctrl+C in each server window.
echo.
echo You can close this window now.
echo ========================================
echo.
pause
endlocal
exit /b 0
