@echo off
:: =============================================================================
:: Nevark MSS — PostgreSQL Backup
:: Creates a timestamped .sql dump in D:\NMSS\backend\deploy\backups\
:: =============================================================================

setlocal EnableDelayedExpansion

:: Load POSTGRES_USER and POSTGRES_DB from .env
for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
    set "line=%%A"
    if "!line:~0,1!" neq "#" (
        set "%%A=%%B"
    )
)

:: Create backups directory
if not exist "%~dp0backups" mkdir "%~dp0backups"

:: Timestamp: YYYY-MM-DD_HH-MM
for /f "tokens=1-5 delims=/ " %%a in ("%date% %time%") do (
    set STAMP=%%c-%%a-%%b_%%d-%%e
    set STAMP=!STAMP::=-!
    set STAMP=!STAMP: =0!
)

set BACKUP_FILE=%~dp0backups\nevark_mss_%STAMP%.sql

echo.
echo  ===========================================
echo   NEVARK MSS  ^|  Database Backup
echo  ===========================================
echo   Output: %BACKUP_FILE%
echo.

docker exec nevark_postgres pg_dump ^
    -U %POSTGRES_USER% ^
    -d %POSTGRES_DB% ^
    --no-owner ^
    --no-acl ^
    --format=plain ^
    > "%BACKUP_FILE%"

if %ERRORLEVEL% equ 0 (
    echo  [OK] Backup complete: %BACKUP_FILE%
) else (
    echo  [ERROR] Backup failed. Is the nevark_postgres container running?
)

echo.
echo  Existing backups:
dir /b "%~dp0backups\*.sql" 2>nul
echo.
pause
