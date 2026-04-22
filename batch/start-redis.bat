@echo off
REM Starts a local Redis server for the EWSD project without Docker.

set "REDIS_EXE="

sc.exe query "Memurai" >nul 2>&1
if not errorlevel 1 (
    sc.exe query "Memurai" | findstr /I "RUNNING" >nul 2>&1
    if not errorlevel 1 (
        echo Redis is already running via the Memurai Windows service.
        echo Redis should be available on 127.0.0.1:6379
        pause
        exit /b 0
    )

    echo Starting Memurai Windows service...
    sc.exe start "Memurai" >nul
    if not errorlevel 1 (
        echo Redis should be available on 127.0.0.1:6379
        pause
        exit /b 0
    )
)

where redis-server >nul 2>&1
if not errorlevel 1 (
    set "REDIS_EXE=redis-server"
)

if not defined REDIS_EXE if exist "C:\Program Files\Redis\redis-server.exe" (
    set "REDIS_EXE=C:\Program Files\Redis\redis-server.exe"
)

if not defined REDIS_EXE if exist "C:\Redis\redis-server.exe" (
    set "REDIS_EXE=C:\Redis\redis-server.exe"
)

if not defined REDIS_EXE if exist "C:\Program Files\Memurai\memurai.exe" (
    set "REDIS_EXE=C:\Program Files\Memurai\memurai.exe"
)

if not defined REDIS_EXE (
    echo Redis server was not found on this machine.
    echo Install Redis for Windows or Memurai, or add redis-server.exe to PATH.
    echo Expected port: 6379
    pause
    exit /b 1
)

echo Starting Redis using:
echo %REDIS_EXE%

start "Redis Server" cmd /k ""%REDIS_EXE%" --port 6379"

echo Redis should be available on 127.0.0.1:6379
pause
