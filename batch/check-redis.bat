@echo off
REM Checks whether Redis is available for the EWSD project.

echo Checking Memurai service...
sc.exe query "Memurai" >nul 2>&1
if not errorlevel 1 (
    sc.exe query "Memurai" | findstr /I "RUNNING" >nul 2>&1
    if not errorlevel 1 (
        echo Memurai service: RUNNING
    ) else (
        echo Memurai service: INSTALLED BUT NOT RUNNING
    )
) else (
    echo Memurai service: NOT INSTALLED
)

echo.
echo Checking Redis port 6379...
powershell -NoProfile -Command "try { $ok = Test-NetConnection 127.0.0.1 -Port 6379 -WarningAction SilentlyContinue; if ($ok.TcpTestSucceeded) { Write-Host 'Redis port 6379: REACHABLE'; exit 0 } else { Write-Host 'Redis port 6379: NOT REACHABLE'; exit 1 } } catch { Write-Host 'Redis port 6379: CHECK FAILED'; exit 1 }"

echo.
echo Check complete.
pause
