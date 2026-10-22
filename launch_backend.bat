@echo off
title Kiwix Onboarding - Optional FastAPI Backend
cd /d "%~dp0"

echo ======================================================================
echo           KIWIX ONBOARDING - OPTIONAL FASTAPI BACKEND
echo ======================================================================
echo.
echo Starting FastAPI microservice at http://127.0.0.1:8000 ...
echo API Documentation available at http://127.0.0.1:8000/docs
echo.

python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
pause
