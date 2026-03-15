@echo off
REM Starts the frontend and backend dev servers in separate windows.

REM Ensure the script runs from the repository root.
cd /d "%~dp0.."

REM Start frontend (Vite)
start "Frontend" cmd /k "cd /d "%~dp0..\frontend" && npm run dev"

REM Start backend (Django) - activate the venv first
start "Backend" cmd /k "cd /d "%~dp0..\backend" && call .\venv\Scripts\activate && python manage.py runserver"

echo Started frontend and backend servers.
pause
