@echo off
REM Stops a local Redis server for the EWSD project.

sc.exe query "Memurai" >nul 2>&1
if not errorlevel 1 (
    sc.exe query "Memurai" | findstr /I "RUNNING" >nul 2>&1
    if not errorlevel 1 (
        echo Stopping Memurai Windows service...
        sc.exe stop "Memurai" >nul
        if not errorlevel 1 (
            echo Redis service stop requested.
            pause
            exit /b 0
        )
    )
)

taskkill /F /FI "WINDOWTITLE eq Redis Server*" /T >nul 2>&1
if not errorlevel 1 (
    echo Stopped manually started Redis window.
    pause
    exit /b 0
)

echo Redis does not appear to be running.
pause
