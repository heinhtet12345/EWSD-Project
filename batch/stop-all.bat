@echo off
REM Stops the frontend and backend servers

echo Stopping servers...

taskkill /F /FI "WINDOWTITLE eq Frontend Server*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Backend Server*" /T >nul 2>&1

echo Stopped frontend and backend servers.
pause