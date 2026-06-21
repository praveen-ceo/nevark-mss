@echo off
:: =============================================================================
:: Nevark MSS — PostgreSQL Restore
:: Usage: Drag a .sql backup file onto this script, OR run it and enter the path.
:: WARNING: This DROPS and recreates the database. Existing data will be lost.
:: =============================================================================

setlocal EnableDelayedExpansion

:: Load POSTGRES_USER and POSTGRES_DB from .env
for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
    set "line=%%A"
    if "!line:~0,1!" neq "#" (
        set "%%A=%%B"
    )
)

echo.
echo  ===========================================
echo   NEVARK MSS  ^|  Database Restore
echo  ===========================================
echo.
echo  WARNING: This will WIPE the current database and restore from backup.
echo.

:: Accept drag-and-drop or prompt
if "%~1" neq "" (
    set BACKUP_FILE=%~1
) else (
    set /p BACKUP_FILE=Enter full path to .sql backup file:
)

if not exist "%BACKUP_FILE%" (
    echo [ERROR] File not found: %BACKUP_FILE%
    pause
    exit /b 1
)

echo  Backup file: %BACKUP_FILE%
echo.
set /p CONFIRM=Type YES to proceed with restore:
if /i "%CONFIRM%" neq "YES" (
    echo Restore cancelled.
    pause
    exit /b 0
)

echo.
echo [1/3] Dropping existing database...
docker exec nevark_postgres psql -U %POSTGRES_USER% -c "DROP DATABASE IF EXISTS %POSTGRES_DB%;"

echo [2/3] Recreating database...
docker exec nevark_postgres psql -U %POSTGRES_USER% -c "CREATE DATABASE %POSTGRES_DB% OWNER %POSTGRES_USER%;"

echo [3/3] Restoring data...
docker exec -i nevark_postgres psql ^
    -U %POSTGRES_USER% ^
    -d %POSTGRES_DB% ^
    < "%BACKUP_FILE%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo  [OK] Restore complete.
) else (
    echo.
    echo  [ERROR] Restore encountered errors. Check the output above.
)

echo.
pause
