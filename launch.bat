@echo off
title Kiwix Onboarding - Zero-to-Knowledge Experience
cd /d "%~dp0"

echo ======================================================================
echo           KIWIX ONBOARDING - ZERO-TO-KNOWLEDGE EXPERIENCE
echo               FOSS Forge 2.0 Hackathon - Build with Kiwix
echo ======================================================================
echo.
echo Launching application...
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python detected. Starting local server at http://localhost:3000 ...
    start "" "http://localhost:3000"
    echo.
    echo Server is running! Press Ctrl+C in this terminal window to stop.
    echo.
    python -m http.server 3000
    goto :EOF
)

:: Check if Node is installed
node -v >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js detected. Starting server at http://localhost:3000 ...
    start "" "http://localhost:3000"
    echo.
    echo Server is running! Press Ctrl+C in this terminal window to stop.
    echo.
    npx -y serve -l 3000
    goto :EOF
)

:: Fallback: Open index.html directly (Works 100% offline via embedded catalog)
echo [Notice] Python or Node server not found. Opening index.html directly in your default browser...
start "" "%~dp0index.html"
echo Application launched!
pause
