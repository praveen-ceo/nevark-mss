# Nevark MSS — Deployment Guide

Everything needed to run the full application stack on any machine.

---

## What runs where

| Component | Runs in Docker | External service |
|---|---|---|
| Backend (FastAPI) | ✅ | |
| Frontend (Next.js) | ✅ | |
| Nginx (reverse proxy) | ✅ | |
| Redis (cache + queues) | ✅ | |
| ChromaDB (AI vector store) | ✅ | |
| PostgreSQL (database) | | ✅ Supabase |
| File storage | | ✅ Supabase Storage |

---

## Prerequisites (install once on the new machine)

1. **Docker Desktop** — https://www.docker.com/products/docker-desktop  
   *(includes Docker Engine + Compose plugin)*

2. **Git** — to clone the project  
   *(or copy the project folder directly — git is not required)*

That's it. No Python, Node, or database installation needed.

---

## Step 1 — Get the project onto the new machine

**Option A — Git clone**
```bash
git clone <your-repo-url>
cd NMSS
```

**Option B — Copy the folder**  
Copy the entire `NMSS` folder to the new machine. Place it anywhere, e.g. `C:\NMSS` or `~/NMSS`.

---

## Step 2 — Create the .env file

In the project root (same folder as `docker-compose.yml`):

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Open `.env` in any text editor and fill in every value:

```dotenv
# Find your machine's local IP:
#   Windows: open Command Prompt → ipconfig → look for IPv4 Address
#   Mac:     open Terminal → ifconfig en0 | grep inet
#   Linux:   hostname -I | awk '{print $1}'
HOST_IP=192.168.1.xxx          ← replace with actual IP

DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[pass]@db.[ref].supabase.co:5432/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

JWT_SECRET_KEY=<run: python -c "import secrets; print(secrets.token_hex(32))">
REDIS_PASSWORD=<any strong password>
MINIO_BUCKET_NAME=nevark-mss
```

> **Where to find Supabase values:**  
> Log in to supabase.com → your project → Project Settings  
> - `DATABASE_URL` → Database → Connection string → Session mode (port 5432)  
> - `SUPABASE_URL` → API → Project URL  
> - `SUPABASE_SERVICE_ROLE_KEY` → API → service_role (secret key)

---

## Step 3 — First run (builds images and starts everything)

Open a terminal in the project root folder:

```bash
docker compose up -d --build
```

This will:
1. Build the backend image (~2–4 min on first run)
2. Build the frontend image (~3–5 min on first run)
3. Pull Redis, ChromaDB, and Nginx images
4. Run database migrations automatically (`alembic upgrade head`)
5. Start all services

**Watch startup progress:**
```bash
docker compose logs -f
```

Wait until you see:
```
nevark_backend   | INFO: Application startup complete.
nevark_frontend  | ready - started server on 0.0.0.0:3000
```

---

## Step 4 — Open the app

In a browser on any machine on the same network:

```
http://<HOST_IP>
```

Log in with:
- **Email:** `superadmin@nevark.com`
- **Password:** `admin123`

> Change the superadmin password immediately after first login.

---

## Subsequent starts (no rebuild needed)

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart a single service
docker compose restart backend
```

---

## Updating the app (after code changes)

```bash
# Rebuild only changed services and restart
docker compose up -d --build backend
docker compose up -d --build frontend

# Or rebuild everything
docker compose up -d --build
```

---

## Useful commands

```bash
# View live logs for all services
docker compose logs -f

# View logs for one service
docker compose logs -f backend

# Check service health
docker compose ps

# Open a shell inside the backend container
docker compose exec backend sh

# Run a manual database migration
docker compose exec backend alembic upgrade head

# Run the database seed script
docker compose exec backend python -m app.db.seed
```

---

## Troubleshooting

**Backend fails to start / migration error**  
Check logs: `docker compose logs backend`  
Most common cause: `DATABASE_URL` in `.env` is wrong or Supabase is unreachable.

**Frontend shows "Failed to fetch" / API errors**  
`HOST_IP` in `.env` doesn't match the machine's actual IP.  
Fix: update `HOST_IP`, then rebuild: `docker compose up -d --build frontend`

**Login fails with "Invalid credentials"**  
Run the seed to ensure the default accounts exist:
```bash
docker compose exec backend python -m app.db.seed
```

**Port 80 already in use**  
Another service is using port 80. Either stop it, or change the nginx port in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"   # access via http://<HOST_IP>:8080
```

---

## File structure reference

```
NMSS/
├── docker-compose.yml      ← main compose file (run from here)
├── .env.example            ← template — copy to .env and fill in
├── .env                    ← your secrets (never commit this)
├── backend/
│   ├── Dockerfile
│   ├── app/
│   └── deploy/
│       └── nginx/
│           └── nginx.conf
└── frontend/
    └── Dockerfile
```
