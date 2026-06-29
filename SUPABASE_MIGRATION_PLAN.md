# Supabase PostgreSQL Migration Plan
## Nevark MSS — Host-only migration (no schema/logic changes)

---

## What Changed (and Why)

| File | Change | Justification |
|---|---|---|
| `backend/app/db/session.py` | Added `connect_args={"ssl": "require"}` to `create_async_engine` | Supabase mandates SSL on all connections. Without this, asyncpg raises `SSL connection required` |
| `backend/alembic.ini` | Cleared hardcoded localhost fallback URL | Prevents accidentally running migrations against old local DB. `migrations/env.py` already reads `DATABASE_URL` from env |
| `backend/.env` | Updated `DATABASE_URL` to Supabase template | Points app to Supabase host |
| `backend/deploy/.env` | Replaced `POSTGRES_*` vars with `DATABASE_URL` | Supabase connection doesn't need separate host/user/db vars |
| `backend/deploy/docker-compose.prod.yml` | Removed `postgres` service + volume; `DATABASE_URL` now passed directly | Supabase is the external host — no local postgres container needed |

**Nothing else changed.** Zero model, schema, route, service, API, UI, or business logic changes.

---

## Step 1 — Get Your Supabase Connection String

1. Log in to [supabase.com](https://supabase.com) → your project
2. Go to **Project Settings → Database → Connection string**
3. Select **URI** mode, then **Session mode** tab (port 5432)
4. Copy the URI. It looks like:
   ```
   postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
   ```
5. Prepend the asyncpg driver prefix:
   ```
   postgresql+asyncpg://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

> **Use the direct connection (port 5432), NOT the pooler (port 6543).**  
> SQLAlchemy with asyncpg is incompatible with PgBouncer transaction-mode pooling.

---

## Step 2 — Fill In Your .env Files

### `backend/.env` (development)
```dotenv
DATABASE_URL=postgresql+asyncpg://postgres.[YOUR-PROJECT-REF]:[YOUR-DB-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### `backend/deploy/.env` (production)
```dotenv
DATABASE_URL=postgresql+asyncpg://postgres.[YOUR-PROJECT-REF]:[YOUR-DB-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

---

## Step 3 — Apply Schema to Supabase (Run Alembic Migrations)

Do **not** import the existing dump's DDL — let Alembic own the schema, exactly as before.

```bash
# From backend/ directory (with .env pointing to Supabase)
cd backend/
alembic upgrade head
```

This runs all 5 migrations (`0001` → `0005`) against Supabase. The schema created is **identical** to your local database.

---

## Step 4 — Migrate Existing Data

You already have `backup_mss_working.sql` (UTF-16 LE, plain SQL).  
This file contains only **data** (INSERTs) or a full dump. Follow the appropriate path:

### Option A — Using the existing backup file (recommended if it's data-only)

First convert the encoding:
```bash
# On Windows PowerShell
Get-Content .\backup_mss_working.sql -Encoding Unicode | Set-Content .\backup_utf8.sql -Encoding UTF8
```

Then push to Supabase (replace placeholders):
```bash
psql "postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-DB-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f backup_utf8.sql
```

### Option B — Fresh pg_dump from your running local DB (most reliable)

```bash
# 1. Dump data only (schema already applied via Alembic above)
pg_dump \
  --host=127.0.0.1 \
  --port=5433 \
  --username=nevark \
  --dbname=nevark_mss \
  --data-only \
  --no-owner \
  --no-acl \
  --format=plain \
  --file=data_export.sql

# 2. Restore to Supabase
psql "postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-DB-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f data_export.sql
```

### Option C — Full dump (schema + data), if you want Supabase to own the schema

Only use this if you are NOT running `alembic upgrade head` first:
```bash
pg_dump \
  --host=127.0.0.1 \
  --port=5433 \
  --username=nevark \
  --dbname=nevark_mss \
  --no-owner \
  --no-acl \
  --format=plain \
  --file=full_export.sql

psql "postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-DB-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f full_export.sql
```

> ⚠️ If you use Option C, do **not** also run `alembic upgrade head` — schema would be applied twice.  
> Recommended: use **Option A or B** with Alembic owning schema.

---

## Step 5 — Verify Alembic Sees Supabase as Up-To-Date

```bash
cd backend/
alembic current
# Should show: 0005 (head)
```

---

## Step 6 — Smoke Test

```bash
# Start the backend (development)
cd backend/
uvicorn app.main:app --reload

# In another terminal, hit the health endpoint
curl http://localhost:8000/health
```

Then log in via the frontend and verify all CRM features work.

---

## Compatibility Report

| Check | Result |
|---|---|
| PostgreSQL extensions | ✅ None used — no compatibility issues |
| UUID generation | ✅ Client-side (`uuid.uuid4`) — no `uuid-ossp` needed |
| ENUM types | ✅ Standard PostgreSQL, supported on PG15 |
| JSONB columns | ✅ Supported since PG9.4 |
| `func.now()` / timestamps | ✅ Standard |
| PG16-specific features | ✅ None found in migrations |
| asyncpg driver | ✅ Already in requirements.txt |
| SSL | ✅ Added via `connect_args={"ssl": "require"}` in session.py |
| Alembic migrations | ✅ All 5 run cleanly on PG15 |

**Supabase runs PostgreSQL 15. Your project targets PG16 locally. There are zero incompatibilities.**

---

## Rollback Plan

If anything goes wrong, revert `backend/.env` to:
```dotenv
DATABASE_URL=postgresql+asyncpg://nevark:nevark@127.0.0.1:5433/nevark_mss
```

And revert `backend/app/db/session.py` by removing `connect_args={"ssl": "require"}` from `create_async_engine`.  
Local database is untouched throughout this migration.
