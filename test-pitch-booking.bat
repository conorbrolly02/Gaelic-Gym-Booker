@echo off
REM Quick Test Commands for Pitch Booking API (Windows)
REM Update the configuration section below before running

echo ========================================
echo   Pitch Booking API - Quick Tests
echo ========================================
echo.

REM CONFIGURATION - UPDATE THESE VALUES
set API_URL=http://localhost:8000/api/v1
set PITCH_ID=ff302317-1c3b-4cd5-88d3-25ecb10b6a05
set DATE=2026-02-26
set EMAIL=test@example.com
set PASSWORD=password123

echo Configuration:
echo   API URL: %API_URL%
echo   Pitch ID: %PITCH_ID%
echo   Date: %DATE%
echo.
pause

REM 1. LOGIN
echo.
echo [1/10] Logging in...
curl -X POST "%API_URL%/auth/login" -H "Content-Type: application/json" -c cookies.txt -d "{\"email\":\"%EMAIL%\",\"password\":\"%PASSWORD%\"}"
echo.
pause

REM 2. LIST PITCHES
echo.
echo [2/10] Listing all pitches...
curl -s -b cookies.txt "%API_URL%/pitches"
echo.
pause

REM 3. GET AVAILABILITY
echo.
echo [3/10] Getting availability for %DATE%...
curl -s -b cookies.txt "%API_URL%/pitches/%PITCH_ID%/availability?date=%DATE%"
echo.
pause

REM 4. BOOK WHOLE PITCH
echo.
echo [4/10] Booking whole pitch (17:00-18:00)...
curl -s -b cookies.txt -X POST "%API_URL%/pitches/bookings" -H "Content-Type: application/json" -d "{\"pitch_id\":\"%PITCH_ID%\",\"start\":\"%DATE%T17:00:00+00:00\",\"end\":\"%DATE%T18:00:00+00:00\",\"title\":\"Full Pitch Training\",\"requester_name\":\"John Smith\",\"team_name\":\"Gaelic Warriors\",\"area\":\"whole\"}"
echo.
pause

REM 5. BOOK HALF-LEFT
echo.
echo [5/10] Booking half-left (18:00-19:00)...
curl -s -b cookies.txt -X POST "%API_URL%/pitches/bookings" -H "Content-Type: application/json" -d "{\"pitch_id\":\"%PITCH_ID%\",\"start\":\"%DATE%T18:00:00+00:00\",\"end\":\"%DATE%T19:00:00+00:00\",\"title\":\"Left Side Practice\",\"requester_name\":\"Jane Doe\",\"area\":\"half-left\"}"
echo.
pause

REM 6. BOOK HALF-RIGHT
echo.
echo [6/10] Booking half-right (18:00-19:00) - Should Succeed...
curl -s -b cookies.txt -X POST "%API_URL%/pitches/bookings" -H "Content-Type: application/json" -d "{\"pitch_id\":\"%PITCH_ID%\",\"start\":\"%DATE%T18:00:00+00:00\",\"end\":\"%DATE%T19:00:00+00:00\",\"title\":\"Right Side Practice\",\"requester_name\":\"Bob Wilson\",\"area\":\"half-right\"}"
echo.
pause

REM 7. TEST CONFLICT
echo.
echo [7/10] Testing conflict (should fail with 409)...
curl -s -b cookies.txt -X POST "%API_URL%/pitches/bookings" -H "Content-Type: application/json" -d "{\"pitch_id\":\"%PITCH_ID%\",\"start\":\"%DATE%T17:00:00+00:00\",\"end\":\"%DATE%T18:00:00+00:00\",\"title\":\"Should Fail\",\"requester_name\":\"Test User\",\"area\":\"quarter-tl\"}"
echo.
pause

REM 8. BOOK QUARTER TL
echo.
echo [8/10] Booking quarter-tl (19:00-20:00)...
curl -s -b cookies.txt -X POST "%API_URL%/pitches/bookings" -H "Content-Type: application/json" -d "{\"pitch_id\":\"%PITCH_ID%\",\"start\":\"%DATE%T19:00:00+00:00\",\"end\":\"%DATE%T20:00:00+00:00\",\"title\":\"Quarter Training TL\",\"requester_name\":\"Alice Brown\",\"area\":\"quarter-tl\"}"
echo.
pause

REM 9. BOOK QUARTER TR
echo.
echo [9/10] Booking quarter-tr (19:00-20:00)...
curl -s -b cookies.txt -X POST "%API_URL%/pitches/bookings" -H "Content-Type: application/json" -d "{\"pitch_id\":\"%PITCH_ID%\",\"start\":\"%DATE%T19:00:00+00:00\",\"end\":\"%DATE%T20:00:00+00:00\",\"title\":\"Quarter Training TR\",\"requester_name\":\"Charlie Davis\",\"area\":\"quarter-tr\"}"
echo.
pause

REM 10. FINAL AVAILABILITY
echo.
echo [10/10] Final availability check...
curl -s -b cookies.txt "%API_URL%/pitches/%PITCH_ID%/availability?date=%DATE%"
echo.
echo.

echo ========================================
echo   All Tests Complete!
echo ========================================
echo.
echo Expected Results:
echo   17:00-18:00: Status 'booked' (whole)
echo   18:00-19:00: Status 'booked' (both halves)
echo   19:00-20:00: Status 'partial' (2 quarters)
echo   20:00-22:00: Status 'free'
echo.
pause
