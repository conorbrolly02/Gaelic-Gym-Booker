@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Gaelic Gym Booker - Shutdown

REM ================================================================
REM Gaelic Gym Booker - Shutdown Script
REM This script stops both backend and frontend servers
REM ================================================================

echo.
echo ========================================
echo  Gaelic Gym Booker - Shutting Down
echo ========================================
echo.

REM ================================================================
REM Kill processes on port 8000 (Backend)
REM ================================================================
echo [1/2] Stopping Backend Server (Port 8000)...

REM Kill all processes on port 8000 (not just LISTENING)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do (
    if not "%%a"=="" (
        echo Found process PID: %%a on port 8000
        taskkill /F /PID %%a >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo Process %%a killed successfully.
        )
    )
)

REM Double-check and kill any remaining processes
netstat -ano | findstr ":8000" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Some processes still on port 8000, forcing cleanup...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
) else (
    echo Port 8000 is now free.
)
echo.

REM ================================================================
REM Kill processes on port 5000 (Frontend)
REM ================================================================
echo [2/2] Stopping Frontend Server (Port 5000)...

REM Kill all processes on port 5000 (not just LISTENING)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000"') do (
    if not "%%a"=="" (
        echo Found process PID: %%a on port 5000
        taskkill /F /PID %%a >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo Process %%a killed successfully.
        )
    )
)

REM Double-check and kill any remaining processes
netstat -ano | findstr ":5000" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Some processes still on port 5000, forcing cleanup...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
) else (
    echo Port 5000 is now free.
)
echo.

REM ================================================================
REM Clean up any remaining Node.js and Python processes (optional)
REM ================================================================
echo Cleaning up any orphaned server processes...

REM Kill Node.js processes that might be running npm dev server
for /f "tokens=2" %%a in ('tasklist ^| findstr "node.exe"') do (
    netstat -ano | findstr "%%a" | findstr ":5000" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        taskkill /F /PID %%a >nul 2>&1
        echo Stopped Node.js process: %%a
    )
)

REM Kill Python processes that might be running uvicorn
for /f "tokens=2" %%a in ('tasklist ^| findstr "python.exe"') do (
    netstat -ano | findstr "%%a" | findstr ":8000" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        taskkill /F /PID %%a >nul 2>&1
        echo Stopped Python process: %%a
    )
)

REM ================================================================
REM Final verification that ports are clear
REM ================================================================
echo.
echo [Verification] Checking that ports are completely clear...

set PORTS_CLEAR=1

netstat -ano | findstr ":8000" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 8000 still has active connections!
    set PORTS_CLEAR=0
) else (
    echo Port 8000: CLEAR
)

netstat -ano | findstr ":5000" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 5000 still has active connections!
    set PORTS_CLEAR=0
) else (
    echo Port 5000: CLEAR
)

echo.
echo ========================================
echo  Shutdown Complete!
echo ========================================
echo.

if !PORTS_CLEAR! EQU 1 (
    echo [SUCCESS] All Gaelic Gym Booker servers have been stopped.
    echo All ports are clear. You can now safely run: startup.bat
) else (
    echo [WARNING] Some ports may still be in use.
    echo If startup fails, try running this script again or restart your computer.
)

echo.
pause
endlocal
exit /b 0
