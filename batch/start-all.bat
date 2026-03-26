@echo off
REM Starts the frontend and backend dev servers in separate windows.

cd /d "%~dp0.."

REM Start frontend with explicit window title
start "Frontend Server" cmd /k "title Frontend Server && cd /d "%~dp0..\frontend" && npm run dev"

REM Start backend with explicit window title  
start "Backend Server" cmd /k "title Backend Server && cd /d "%~dp0..\backend" && call .\venv\Scripts\activate && python manage.py runserver"

echo Started frontend and backend servers.
pause