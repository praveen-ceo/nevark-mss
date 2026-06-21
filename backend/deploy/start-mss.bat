@echo off
:: =============================================================================
:: Nevark MSS — Start Production Stack
:: Run from: D:\NMSS\backend\deploy\
:: =============================================================================

echo.
echo  ===========================================
echo   NEVARK MSS  ^|  Starting Production Stack
echo  ===========================================
echo.

:: Ensure .env exists
if not exist "%~dp0.env" (
    echo [ERROR] .env file not found in %~dp0
    echo         Copy .env.example to .env and fill in your values first.
    pause
    exit /b 1
)

:: Pull latest images for infrastructure services (backend/frontend built locally)
echo [1/3] Pulling latest base images...

docker compose -f "%~dp0docker-compose.prod.yml" --env-file "%~dp0.env" pull postgres redis minio nginx
:: Build app images
echo.
echo [2/3] Building application images...
docker compose -f "%~dp0docker-compose.prod.yml" --env-file "%~dp0.env" build --no-cache

:: Start full stack
echo.
echo [3/3] Starting all services...
docker compose -f "%~dp0docker-compose.prod.yml" --env-file "%~dp0.env" up -d

echo.
echo  ===========================================
echo   Stack started. Waiting for health checks...
echo  ===========================================
echo.

:: Wait and show status
timeout /t 15 /nobreak >nul
docker compose -f "%~dp0docker-compose.prod.yml" ps

echo.
echo  Access Nevark MSS at: http://localhost
echo  MinIO console at:     http://localhost:9001
echo.
pause
