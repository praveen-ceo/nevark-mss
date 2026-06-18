# Nevark MSS — Generated File Manifest

Total files: 34 (code) + 6 (config) = 40

---

## Session 1 — Scaffold Document
| # | File | Description |
|---|------|-------------|
| 1 | `nevark-mss-scaffold.md` | Folder structure, packages, env vars, setup commands |

---

## Session 2 — Database Layer (18 files)
| # | File | Description |
|---|------|-------------|
| 2  | `docs/er_relationships.md`                                 | ER diagram, FK rules, cascade table, index summary |
| 3  | `backend/app/models/enums.py`                              | All 22 Python enum classes |
| 4  | `backend/app/models/base.py`                               | DeclarativeBase, AuditMixin, SoftDeleteMixin, BaseModel |
| 5  | `backend/app/models/auth.py`                               | User, Role, Permission + user_roles, role_permissions M2M |
| 6  | `backend/app/models/employee.py`                           | Department, Employee, Attendance, LeaveRequest |
| 7  | `backend/app/models/client.py`                             | Client, ClientContact |
| 8  | `backend/app/models/project.py`                            | Project, ProjectTask, ProjectAssignment, Milestone |
| 9  | `backend/app/models/finance.py`                            | Invoice, InvoiceItem, Payment, Expense |
| 10 | `backend/app/models/purchase_order.py`                     | PurchaseOrder, POItem |
| 11 | `backend/app/models/contract.py`                           | Contract, ContractRisk |
| 12 | `backend/app/models/document.py`                           | DocumentCategory, Document |
| 13 | `backend/app/models/ai.py`                                 | AIChatSession, AIChatMessage |
| 14 | `backend/app/models/prediction.py`                         | RevenuePrediction, PaymentRiskPrediction, ProjectDelayPrediction |
| 15 | `backend/app/models/system.py`                             | Notification, AuditLog, ActivityLog |
| 16 | `backend/app/db/base.py`                                   | Imports all models for Alembic autogenerate |
| 17 | `backend/app/db/migrations/env.py`                         | Alembic async env (reads DATABASE_URL from env) |
| 18 | `backend/app/db/migrations/versions/0001_initial_schema.py`| Full initial migration — 35 tables, 22 enum types, all indexes |
| 19 | `backend/app/db/seed.py`                                   | Seeds 8 roles + 46 permissions with RBAC assignments |

---

## Session 3 — Backend Foundation (12 files)
| # | File | Description |
|---|------|-------------|
| 20 | `setup-project.ps1`                    | Scaffold script (this session: all content embedded) |
| 21 | `backend/app/core/config.py`           | Pydantic Settings — all env vars, lru_cache singleton |
| 22 | `backend/app/core/security.py`         | bcrypt hashing, JWT create/decode, access + refresh tokens |
| 23 | `backend/app/core/logging.py`          | structlog — JSON (prod) / ConsoleRenderer (dev) |
| 24 | `backend/app/db/session.py`            | AsyncEngine, AsyncSessionLocal, get_db generator |
| 25 | `backend/app/main.py`                  | FastAPI app, CORS, lifespan, /health endpoint |
| 26 | `backend/app/schemas/auth.py`          | LoginRequest, TokenResponse, RefreshRequest, UserOut |
| 27 | `backend/app/services/auth.py`         | authenticate, issue_tokens, refresh_tokens, get_user_by_id |
| 28 | `backend/app/api/deps.py`              | get_current_user, CurrentUser, require_permission (RBAC) |
| 29 | `backend/app/api/v1/routes/auth.py`    | POST /login, POST /refresh, POST /logout, GET /me |
| 30 | `backend/app/api/v1/router.py`         | APIRouter — mounts auth (more routes added per module) |

---

## Config Files (created by setup-project.ps1)
| # | File | Description |
|---|------|-------------|
| 31 | `backend/alembic.ini`       | script_location = app/db/migrations |
| 32 | `backend/pyproject.toml`    | pytest, ruff, mypy config |
| 33 | `backend/Dockerfile`        | python:3.12-slim, uvicorn entrypoint |
| 34 | `backend/requirements.txt`  | All pinned backend dependencies |
| 35 | `backend/.env.example`      | All env vars with safe defaults |
| 36 | `.gitignore`                | Python + Node ignore patterns |

---

## Placeholder Stubs (created by setup-project.ps1, to be implemented)
| # | File |
|---|------|
| 37 | `backend/app/api/v1/routes/users.py` |
| 38 | `backend/app/api/v1/routes/ai.py` |
| 39 | `backend/app/api/v1/routes/storage.py` |
| 40 | `backend/app/core/exceptions.py` |
| 41 | `backend/app/schemas/user.py` |
| 42 | `backend/app/schemas/common.py` |
| 43 | `backend/app/services/user.py` |
| 44 | `backend/app/services/storage.py` |
| 45 | `backend/app/services/ai/agent.py` |
| 46 | `backend/app/services/ai/chains.py` |
| 47 | `backend/app/services/ai/graphs.py` |
| 48 | `backend/app/services/ai/vectorstore.py` |
| 49 | `backend/app/repositories/base.py` |
| 50 | `backend/app/repositories/user.py` |
| 51 | `backend/app/tasks/celery_app.py` |
| 52 | `backend/app/cache/redis.py` |
| 53 | `backend/tests/conftest.py` |

---

## API Surface (current)
```
GET  /health
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

## Next Modules (pending)
- Employee Management (departments, employees, attendance, leave)
- Client Management
- Project Management
- Finance (invoices, payments, expenses)
- Purchase Orders
- Contracts
- Documents
- System (notifications, audit)
