@echo off
title Kiwix Onboarding - Zero-to-Knowledge Synchronized Launcher
cd /d "%~dp0"

echo ======================================================================
echo           KIWIX ONBOARDING - ZERO-TO-KNOWLEDGE PIPELINE
echo               FOSS Forge 2.0 Hackathon - Build with Kiwix
echo ======================================================================
echo.

:: Check for mode flags (backend only / frontend only)
if /i "%~1"=="--backend-only" goto :BACKEND_ONLY
if /i "%~1"=="backend" goto :BACKEND_ONLY
if /i "%~1"=="--frontend-only" goto :FRONTEND_ONLY
if /i "%~1"=="frontend" goto :FRONTEND_ONLY

echo Initializing synchronized Frontend and Backend services...
echo.

:: 1. Check Python
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [1/3] Python detected.
    
    :: Check if uvicorn & fastapi are installed
    python -c "import fastapi, uvicorn" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [2/3] Starting FastAPI Backend at http://127.0.0.1:8000 ...
        start "Kiwix Backend (FastAPI - Port 8000)" cmd /k "title Kiwix Backend - FastAPI && cd /d ""%~dp0"" && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"
    ) else (
        echo [2/3] Notice: FastAPI or Uvicorn not installed in current environment.
        echo       Operating in 100%% zero-cloud local-first mode.
        echo       To enable backend: pip install -r backend\requirements.txt
    )

    :: Short pause for backend socket initialization
    timeout /t 2 /nobreak >nul 2>&1

    echo [3/3] Starting Frontend Server at http://localhost:3000 ...
    start "" "http://localhost:3000"
    echo.
    echo ======================================================================
    echo  Services are synchronized and running!
    echo   - Frontend UI:    http://localhost:3000
    echo   - Backend API:    http://127.0.0.1:8000
    echo   - API Swagger UI: http://127.0.0.1:8000/docs
    echo ======================================================================
    echo.
    echo Press Ctrl+C in this terminal window to stop the frontend server.
    echo.
    python -m http.server 3000
    goto :EOF
)

:: 2. Check Node.js if Python is not installed
node -v >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js detected.
    echo Starting Frontend Server at http://localhost:3000 ...
    start "" "http://localhost:3000"
    npx -y serve -l 3000
    goto :EOF
)

:: 3. Zero-Server Fallback: Direct Browser Launch
echo [Notice] Python or Node.js server not found.
echo Opening index.html directly in your default browser (100%% offline mode)...
start "" "%~dp0index.html"
echo Application launched!
pause
goto :EOF

:BACKEND_ONLY
echo Starting FastAPI Backend only at http://127.0.0.1:8000 ...
echo API Documentation at http://127.0.0.1:8000/docs
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
goto :EOF

:FRONTEND_ONLY
echo Starting Frontend Server only at http://localhost:3000 ...
start "" "http://localhost:3000"
python -m http.server 3000
goto :EOF
