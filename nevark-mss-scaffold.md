# Nevark MSS — Project Scaffold

---

## 1. Final Project Folder Structure

```
nevark-mss/
├── backend/
├── frontend/
├── infra/
│   ├── docker/
│   │   ├── postgres/
│   │   ├── redis/
│   │   └── minio/
│   └── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 2. Backend Folder Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── ai.py
│   │   │   │   └── storage.py
│   │   │   └── router.py
│   │   └── deps.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── logging.py
│   │   └── exceptions.py
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py
│   │   └── migrations/
│   │       └── env.py
│   ├── models/
│   │   ├── user.py
│   │   └── base.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── auth.py
│   │   └── common.py
│   ├── services/
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── ai/
│   │   │   ├── agent.py
│   │   │   ├── chains.py
│   │   │   ├── graphs.py
│   │   │   └── vectorstore.py
│   │   └── storage.py
│   ├── repositories/
│   │   ├── base.py
│   │   └── user.py
│   ├── tasks/
│   │   └── celery_app.py
│   ├── cache/
│   │   └── redis.py
│   └── main.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── alembic.ini
├── pyproject.toml
├── requirements.txt
└── Dockerfile
```

---

## 3. Frontend Folder Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                    # ShadCN auto-generated
│   │   ├── common/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── PageLoader.tsx
│   │   └── features/
│   │       ├── auth/
│   │       └── ai/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useDebounce.ts
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   └── endpoints/
│   │   │       ├── auth.ts
│   │   │       └── users.ts
│   │   ├── utils.ts
│   │   └── validations/
│   ├── store/
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── types/
│   │   ├── api.ts
│   │   └── models.ts
│   └── constants/
│       └── index.ts
├── public/
├── components.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── package.json
└── Dockerfile
```

---

## 4. Required Package List

### Backend (`requirements.txt`)

```
# Web
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9

# DB / ORM
sqlalchemy==2.0.35
alembic==1.13.3
asyncpg==0.29.0
psycopg2-binary==2.9.9

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# Validation
pydantic==2.9.2
pydantic-settings==2.5.2
email-validator==2.2.0

# AI
openai==1.51.0
langchain==0.3.1
langchain-openai==0.2.1
langchain-community==0.3.1
langgraph==0.2.28
chromadb==0.5.11

# Cache
redis[hiredis]==5.1.1

# Storage
minio==7.2.9

# Tasks
celery==5.4.0
flower==2.0.1

# Utilities
httpx==0.27.2
python-dotenv==1.0.1
structlog==24.4.0
tenacity==9.0.0

# Testing
pytest==8.3.3
pytest-asyncio==0.24.0
httpx==0.27.2
factory-boy==3.3.1
```

### Frontend (`package.json` dependencies)

```json
{
  "dependencies": {
    "next": "15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.6.0",

    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-query-devtools": "^5.59.0",
    "zustand": "^5.0.0",
    "framer-motion": "^11.11.0",

    "tailwindcss": "^3.4.14",
    "tailwind-merge": "^2.5.4",
    "tailwindcss-animate": "^1.0.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.453.0",

    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-tooltip": "^1.1.4",

    "axios": "^1.7.7",
    "react-hook-form": "^7.53.1",
    "@hookform/resolvers": "^3.9.1",
    "zod": "^3.23.8",
    "date-fns": "^4.1.0",
    "js-cookie": "^3.0.5"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/js-cookie": "^3.0.6",
    "eslint": "^9.0.0",
    "eslint-config-next": "15.0.0",
    "prettier": "^3.3.3",
    "prettier-plugin-tailwindcss": "^0.6.8"
  }
}
```

---

## 5. Required Environment Variables

### Backend (`.env`)

```env
# App
APP_ENV=development
APP_NAME=nevark-mss
APP_VERSION=1.0.0
DEBUG=true
SECRET_KEY=
ALLOWED_ORIGINS=http://localhost:3000

# Database
DATABASE_URL=postgresql+asyncpg://nevark:nevark@localhost:5432/nevark_mss
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# Auth
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_URL=redis://localhost:6379/0

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET_NAME=nevark-mss
MINIO_SECURE=false

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8001
CHROMA_COLLECTION=nevark_mss

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=Nevark MSS
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_MINIO_PUBLIC_URL=http://localhost:9000
```

---

## 6. Setup Commands

### Infrastructure

```bash
# Clone and enter repo
git clone <repo-url> nevark-mss && cd nevark-mss

# Start all infra services
docker compose -f infra/docker-compose.yml up -d
```

### Backend

```bash
cd backend

# Create and activate virtualenv
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure env
cp ../.env.example .env

# Run DB migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.tasks.celery_app worker --loglevel=info
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure env
cp .env.example .env.local

# Initialize ShadCN
npx shadcn@latest init

# Start dev server
npm run dev
```

### docker-compose.yml (infra)

```yaml
# infra/docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: nevark
      POSTGRES_PASSWORD: nevark
      POSTGRES_DB: nevark_mss
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  postgres_data:
  redis_data:
  minio_data:
  chroma_data:
```
