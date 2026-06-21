@echo off
:: =============================================================================
:: Nevark MSS — Stop Production Stack
:: Run from: D:\NMSS\backend\deploy\
:: Data volumes are preserved — use docker compose down -v to also wipe volumes.
:: =============================================================================

echo.
echo  ===========================================
echo   NEVARK MSS  ^|  Stopping Production Stack
echo  ===========================================
echo.

echo Stopping all services (data volumes preserved)...
docker compose -f "%~dp0docker-compose.prod.yml" --env-file "%~dp0.env" down

echo.
echo  All containers stopped. Data volumes intact.
echo  Run start-mss.bat to restart.
echo.
pause
