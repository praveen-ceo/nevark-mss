# Nevark MSS — Deployment Guide

Production deployment package for Nevark Management & Smart System V1.  
Stack: PostgreSQL 16 · Redis 7 · MinIO · ChromaDB · FastAPI · Next.js 15 · Nginx

---

## Prerequisites

| Tool | Version | Download |
|---|---|---|
| Docker Desktop | 4.30+ | https://www.docker.com/products/docker-desktop/ |
| Git | any | optional, for updates |

Ensure Docker Desktop is **running** before any step below.

---

## Folder Layout

```
D:\NMSS\
├── backend\
│   ├── Dockerfile          ← production (multi-stage, non-root)
│   ├── app\
│   └── deploy\             ← THIS FOLDER
│       ├── docker-compose.prod.yml
│       ├── .env.example
│       ├── .env            ← you create this (never commit)
│       ├── start-mss.bat
│       ├── stop-mss.bat
│       ├── backup-db.bat
│       ├── restore-db.bat
│       ├── backups\        ← auto-created by backup-db.bat
│       └── nginx\
│           └── nginx.conf
└── frontend\
    ├── Dockerfile          ← production (standalone Next.js)
    └── next.config.ts      ← output: "standalone" added
```

---

## First-Time Setup

### 1. Create `.env`

```bat
cd D:\NMSS\backend\deploy
copy .env.example .env
notepad .env
```

Minimum values you **must** change:

| Variable | What to set |
|---|---|
| `HOST_IP` | LAN IP of this machine (e.g. `192.168.1.100`) or domain for VPS |
| `POSTGRES_PASSWORD` | Strong password, no special shell chars |
| `REDIS_PASSWORD` | Strong password |
| `MINIO_ACCESS_KEY` | MinIO username (min 3 chars) |
| `MINIO_SECRET_KEY` | MinIO password (min 12 chars) |
| `JWT_SECRET_KEY` | Run: `python -c "import secrets; print(secrets.token_hex(32))"` |

### 2. Start the stack

Double-click **`start-mss.bat`** or from a terminal:

```bat
cd D:\NMSS\backend\deploy
start-mss.bat
```

`start-mss.bat` will:
1. Pull latest images for Postgres / Redis / MinIO / ChromaDB / Nginx
2. Build the backend and frontend images from source
3. Start all 7 containers
4. Wait 15 s then print a status table

### 3. Verify everything is healthy

```bat
docker compose -f docker-compose.prod.yml ps
```

All containers should show `healthy` or `running`.

### 4. Create MinIO bucket

Open http://localhost:9001 in a browser.  
Login with your `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`.  
Create a bucket named **`nevark-mss`** (or the value you set for `MINIO_BUCKET_NAME`).

### 5. Seed the database

```bat
docker exec -it nevark_backend python app/db/seed.py
```

This creates default roles, admin user, and sample data.

### 6. Open the app

Navigate to **http://localhost** (port 80, served by Nginx).

---

## Day-to-Day Operations

### Start / Stop

```bat
start-mss.bat    ← starts stack
stop-mss.bat     ← stops stack (data preserved)
```

### View logs

```bat
:: All services
docker compose -f docker-compose.prod.yml logs -f

:: Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Check container health

```bat
docker ps
```

### Restart a single service

```bat
docker compose -f docker-compose.prod.yml restart backend
```

---

## Backup & Restore

### Backup database

Double-click **`backup-db.bat`**.  
Creates a timestamped `.sql` file in `deploy\backups\`.

```bat
backup-db.bat
:: Output: backups\nevark_mss_2026-06-21_10-30.sql
```

Schedule daily backups with Windows Task Scheduler pointing to `backup-db.bat`.

### Restore database

```bat
:: Drag a .sql file onto restore-db.bat
:: OR run it and type the path when prompted
restore-db.bat
```

> **Warning:** Restore drops and recreates the database. All current data is replaced.

### Backup MinIO files

```bat
docker run --rm -v nevark_minio_data:/data -v D:\NMSS\backups:/backup ^
  alpine tar czf /backup/minio-backup-%date%.tar.gz /data
```

---

## Updating the Application

```bat
:: 1. Pull latest code (if using Git)
git -C D:\NMSS pull

:: 2. Rebuild images
cd D:\NMSS\backend\deploy
docker compose -f docker-compose.prod.yml build --no-cache

:: 3. Restart with zero-downtime rolling update
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

Alembic migrations run automatically on backend startup.

---

## Port Reference

| Port | Service | Accessible From |
|---|---|---|
| **80** | Nginx (main entry) | LAN / browser |
| 5432 | PostgreSQL | localhost only |
| 6379 | Redis | internal only |
| 9000 | MinIO S3 API | localhost only |
| **9001** | MinIO Console | localhost only |
| 8000 | FastAPI | internal only (via Nginx /api/) |
| 3000 | Next.js | internal only (via Nginx /) |

---

## URL Map (via Nginx)

| URL | Routed to |
|---|---|
| `http://{HOST_IP}/` | Next.js frontend |
| `http://{HOST_IP}/api/v1/...` | FastAPI backend |
| `http://{HOST_IP}/docs` | FastAPI Swagger (production has this disabled unless DEBUG=true) |
| `http://{HOST_IP}/health` | FastAPI health check |
| `http://localhost:9001` | MinIO admin console |

---

## VPS Deployment Notes

To deploy on a Linux VPS instead of a Windows office machine:

1. **Copy files**: Upload `D:\NMSS\` to the VPS (e.g. `/opt/nevark-mss/`)
2. **Rename bat files**: Replace `.bat` with `.sh`; replace `%~dp0` with `$(dirname $0)/`; replace `docker compose ... --env-file` syntax (same in Linux)
3. **Set HOST_IP**: Use your domain name (e.g. `mss.nevark.com`)
4. **HTTPS**: Wrap Nginx in Certbot — add a second server block on port 443 and redirect port 80 → 443
5. **Firewall**: Only expose port 80 and 443 externally; keep 5432, 6379, 9000, 9001 bound to localhost

### HTTPS (Certbot, optional)

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d mss.nevark.com
```

---

## Troubleshooting

**`backend` container exits immediately**
- Check logs: `docker compose -f docker-compose.prod.yml logs backend`
- Usually: `.env` missing required var, or Postgres not healthy yet (it will retry)

**Frontend build fails with `output: standalone` error**
- Ensure `next.config.ts` has `output: "standalone"` (already patched)
- Ensure `npm ci` completes successfully locally before building Docker image

**MinIO bucket missing → documents fail to upload**
- Open http://localhost:9001, login, create bucket `nevark-mss`

**`pg_isready` health check fails**
- The postgres container may still be initializing. Wait 30 s and run `docker ps` again.

**Port 80 already in use**
- Stop IIS or any other process on port 80
- Or change nginx port mapping in `docker-compose.prod.yml`: `"8080:80"`

---

## Environment Variables Reference

All variables are documented in `.env.example`.  
The backend reads them via `pydantic-settings` from the process environment (injected by Docker Compose).  
The frontend bakes `NEXT_PUBLIC_API_URL` at Docker build time via `ARG`.

To change `NEXT_PUBLIC_API_URL` (e.g. to a domain name), update `HOST_IP` in `.env` and rebuild:

```bat
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
```
