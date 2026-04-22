@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Restores the project PostgreSQL dump for local setup.
REM Usage:
REM   batch\restore-db.bat
REM   batch\restore-db.bat "D:\path\to\dumpfile.dump" my_db_name postgres

cd /d "%~dp0.."

set "DEFAULT_DUMP=%CD%\backend\sql\ewsd_project_db.dump"
set "DUMP_FILE=%~1"
set "DB_NAME=%~2"
set "DB_USER=%~3"

if "%DUMP_FILE%"=="" set "DUMP_FILE=%DEFAULT_DUMP%"
if "%DB_NAME%"=="" set "DB_NAME=ewsd_project_db"
if "%DB_USER%"=="" set "DB_USER=postgres"

echo.
echo [1/4] Checking PostgreSQL tools...

set "PG_BIN="
where createdb >nul 2>nul
if not errorlevel 1 (
  where pg_restore >nul 2>nul
  if not errorlevel 1 goto :tools_ready
)

for %%D in (
  "%ProgramFiles%\PostgreSQL\17\bin"
  "%ProgramFiles%\PostgreSQL\16\bin"
  "%ProgramFiles%\PostgreSQL\15\bin"
  "%ProgramFiles%\PostgreSQL\14\bin"
  "%ProgramFiles%\PostgreSQL\13\bin"
  "%ProgramFiles(x86)%\PostgreSQL\17\bin"
  "%ProgramFiles(x86)%\PostgreSQL\16\bin"
  "%ProgramFiles(x86)%\PostgreSQL\15\bin"
  "%ProgramFiles(x86)%\PostgreSQL\14\bin"
  "%ProgramFiles(x86)%\PostgreSQL\13\bin"
) do (
  if exist "%%~D\createdb.exe" if exist "%%~D\pg_restore.exe" (
    set "PG_BIN=%%~D"
    goto :tools_ready
  )
)

echo PostgreSQL tools were not found.
echo Please install PostgreSQL and make sure "createdb" and "pg_restore" are available.
echo You can also add PostgreSQL's bin folder to your PATH.
echo.
pause
exit /b 1

:tools_ready
if defined PG_BIN (
  set "PATH=%PG_BIN%;%PATH%"
  echo Found PostgreSQL tools in: %PG_BIN%
) else (
  echo Found PostgreSQL tools in PATH.
)

echo.
echo [2/4] Checking dump file...
if not exist "%DUMP_FILE%" (
  echo Dump file not found:
  echo   %DUMP_FILE%
  echo.
  pause
  exit /b 1
)
echo Using dump file: %DUMP_FILE%
echo Database name: %DB_NAME%
echo Database user: %DB_USER%

echo.
echo [3/4] Creating database if needed...
createdb -U "%DB_USER%" "%DB_NAME%" >nul 2>nul
if errorlevel 1 (
  echo Database "%DB_NAME%" may already exist, or PostgreSQL asked for authentication.
  echo Continuing with restore...
) else (
  echo Database "%DB_NAME%" created successfully.
)

echo.
echo [4/4] Restoring dump...
pg_restore -U "%DB_USER%" -d "%DB_NAME%" --clean --if-exists --no-owner --no-privileges "%DUMP_FILE%"
if errorlevel 1 (
  echo.
  echo Restore failed.
  echo If prompted for a password, run this script again and enter your PostgreSQL password.
  echo Make sure PostgreSQL is running and the database user has permission to restore.
  echo.
  pause
  exit /b 1
)

echo.
echo Restore completed successfully.
echo You can now update .env to point to "%DB_NAME%" and start the app.
echo.
pause
exit /b 0
