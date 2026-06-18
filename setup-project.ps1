#Requires -Version 5.1
<#
.SYNOPSIS
    Nevark MSS — full project setup.
    Creates every folder, writes every generated file.
    Safe to re-run: never overwrites existing files.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-Stub {
    param([string]$Path, [string]$Content = "")
    if (Test-Path $Path) { Write-Host "  SKIP  $Path" -ForegroundColor DarkGray; return }
    $dir = Split-Path $Path -Parent
    if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Set-Content -Path $Path -Value $Content -Encoding UTF8 -NoNewline
    Write-Host "  CREATE $Path" -ForegroundColor Green
}

Write-Host "`n=== Nevark MSS Setup ===" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# DIRECTORIES
# ---------------------------------------------------------------------------
$dirs = @(
    "backend/app/api/v1/routes"
    "backend/app/cache"
    "backend/app/core"
    "backend/app/db/migrations/versions"
    "backend/app/models"
    "backend/app/repositories"
    "backend/app/schemas"
    "backend/app/services/ai"
    "backend/app/tasks"
    "backend/tests"
    "docs"
    "frontend/src"
)
foreach ($d in $dirs) {
    if (!(Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null; Write-Host "  MKDIR $d" -ForegroundColor Blue }
}

$inits = @(
    "backend/app/__init__.py","backend/app/api/__init__.py","backend/app/api/v1/__init__.py",
    "backend/app/api/v1/routes/__init__.py","backend/app/cache/__init__.py",
    "backend/app/core/__init__.py","backend/app/db/__init__.py",
    "backend/app/db/migrations/__init__.py","backend/app/db/migrations/versions/__init__.py",
    "backend/app/models/__init__.py","backend/app/repositories/__init__.py",
    "backend/app/schemas/__init__.py","backend/app/services/__init__.py",
    "backend/app/services/ai/__init__.py","backend/app/tasks/__init__.py",
    "backend/tests/__init__.py"
)
foreach ($f in $inits) { New-Stub -Path $f -Content "" }


# ---------------------------------------------------------------------------
# CONFIG FILES
# ---------------------------------------------------------------------------

New-Stub -Path "backend/alembic.ini" -Content @'
[alembic]
script_location = app/db/migrations
prepend_sys_path = .
version_path_separator = os
sqlalchemy.url = postgresql+asyncpg://user:pass@localhost/nevark_mss

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
'@

New-Stub -Path "backend/pyproject.toml" -Content @'
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
target-version = "py312"
select = ["E", "F", "I", "UP", "B", "SIM"]
ignore = ["E501"]

[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true
plugins = ["pydantic.mypy"]
'@

New-Stub -Path "backend/Dockerfile" -Content @'
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
'@

New-Stub -Path "backend/requirements.txt" -Content @'
fastapi==0.111.0
uvicorn[standard]==0.30.1
python-multipart==0.0.9
sqlalchemy==2.0.30
alembic==1.13.1
asyncpg==0.29.0
greenlet==3.0.3
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
pydantic==2.7.3
pydantic-settings==2.3.1
pydantic[email]==2.7.3
structlog==24.2.0
redis==5.0.4
celery==5.4.0
flower==2.0.1
minio==7.2.7
openai==1.35.3
langchain==0.2.5
langchain-openai==0.1.9
langgraph==0.1.5
chromadb==0.5.3
pytest==8.2.2
pytest-asyncio==0.23.7
pytest-cov==5.0.0
httpx==0.27.0
ruff==0.4.9
mypy==1.10.0
'@

New-Stub -Path "backend/.env.example" -Content @'
APP_ENV=development
APP_NAME=nevark-mss
APP_VERSION=1.0.0
DEBUG=true
ALLOWED_ORIGINS=["http://localhost:3000"]
DATABASE_URL=postgresql+asyncpg://nevark:nevark@localhost:5432/nevark_mss
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
JWT_SECRET_KEY=changeme_generate_a_real_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
REDIS_URL=redis://localhost:6379/0
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=nevark-mss
MINIO_SECURE=false
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
CHROMA_HOST=localhost
CHROMA_PORT=8001
CHROMA_COLLECTION=nevark_mss
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
'@

New-Stub -Path ".gitignore" -Content @'
__pycache__/
*.py[cod]
.env
.venv/
venv/
build/
dist/
*.egg-info/
.idea/
.vscode/
.DS_Store
node_modules/
.next/
.pytest_cache/
.coverage
htmlcov/
.mypy_cache/
.ruff_cache/
'@


# ---------------------------------------------------------------------------
# MODELS
# ---------------------------------------------------------------------------

New-Stub -Path "backend/app/models/enums.py" -Content @'
import enum


class EmploymentType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERN = "intern"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    HALF_DAY = "half_day"
    ON_LEAVE = "on_leave"


class LeaveType(str, enum.Enum):
    ANNUAL = "annual"
    SICK = "sick"
    CASUAL = "casual"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    UNPAID = "unpaid"


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ProjectStatus(str, enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"
    BLOCKED = "blocked"


class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MilestoneStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    MISSED = "missed"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class PaymentMethod(str, enum.Enum):
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    CASH = "cash"
    CHEQUE = "cheque"
    ONLINE = "online"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class ExpenseStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REIMBURSED = "reimbursed"


class ExpenseCategory(str, enum.Enum):
    TRAVEL = "travel"
    ACCOMMODATION = "accommodation"
    MEALS = "meals"
    OFFICE_SUPPLIES = "office_supplies"
    SOFTWARE = "software"
    HARDWARE = "hardware"
    MARKETING = "marketing"
    OTHER = "other"


class POStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class RiskSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskProbability(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RiskStatus(str, enum.Enum):
    IDENTIFIED = "identified"
    MITIGATING = "mitigating"
    RESOLVED = "resolved"
    ACCEPTED = "accepted"


class AIMessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationType(str, enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
'@


New-Stub -Path "backend/app/models/base.py" -Content @'
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, UUID, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class AuditMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    # Intentionally not FK -- supports system ops and avoids circular deps
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)


class SoftDeleteMixin:
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class BaseModel(Base, AuditMixin, SoftDeleteMixin):
    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
'@


New-Stub -Path "backend/app/models/auth.py" -Content @'
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Index, String, Table, UUID, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseModel

if TYPE_CHECKING:
    from app.models.employee import Employee

role_permissions = Table(
    "role_permissions", Base.metadata,
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

user_roles = Table(
    "user_roles", Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class User(BaseModel):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        Index("ix_users_email", "email"),
        Index("ix_users_is_active", "is_active"),
    )

    email: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    roles: Mapped[List[Role]] = relationship("Role", secondary=user_roles, back_populates="users")
    employee: Mapped[Optional[Employee]] = relationship("Employee", back_populates="user", uselist=False)


class Role(BaseModel):
    __tablename__ = "roles"
    __table_args__ = (UniqueConstraint("name", name="uq_roles_name"),)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    users: Mapped[List[User]] = relationship("User", secondary=user_roles, back_populates="roles")
    permissions: Mapped[List[Permission]] = relationship("Permission", secondary=role_permissions, back_populates="roles")


class Permission(BaseModel):
    __tablename__ = "permissions"
    __table_args__ = (
        UniqueConstraint("codename", name="uq_permissions_codename"),
        Index("ix_permissions_module", "module"),
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    codename: Mapped[str] = mapped_column(String(100), nullable=False)
    module: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    roles: Mapped[List[Role]] = relationship("Role", secondary=role_permissions, back_populates="permissions")
'@


New-Stub -Path "backend/app/models/employee.py" -Content @'
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Date, DateTime, Enum, ForeignKey, Index, Numeric, String, Text, UUID, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import AttendanceStatus, EmploymentType, LeaveStatus, LeaveType

if TYPE_CHECKING:
    from app.models.auth import User
    from app.models.finance import Expense
    from app.models.project import ProjectAssignment


class Department(BaseModel):
    __tablename__ = "departments"
    __table_args__ = (
        UniqueConstraint("name", name="uq_departments_name"),
        Index("ix_departments_parent_id", "parent_id"),
        Index("ix_departments_manager_id", "manager_id"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True,
    )
    # use_alter breaks departments <-> employees circular FK at DDL time
    manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL", use_alter=True, name="fk_departments_manager_id"),
        nullable=True,
    )

    parent: Mapped[Optional[Department]] = relationship(
        "Department", back_populates="children", remote_side="Department.id", foreign_keys=[parent_id],
    )
    children: Mapped[List[Department]] = relationship("Department", back_populates="parent", foreign_keys=[parent_id])
    manager: Mapped[Optional[Employee]] = relationship("Employee", foreign_keys=[manager_id], back_populates="managed_departments")
    employees: Mapped[List[Employee]] = relationship("Employee", foreign_keys="Employee.department_id", back_populates="department")


class Employee(BaseModel):
    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("employee_code", name="uq_employees_code"),
        UniqueConstraint("user_id", name="uq_employees_user_id"),
        Index("ix_employees_department_id", "department_id"),
        Index("ix_employees_employment_type", "employment_type"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    employee_code: Mapped[str] = mapped_column(String(50), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    job_title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    employment_type: Mapped[EmploymentType] = mapped_column(Enum(EmploymentType, name="employment_type_enum"), nullable=False)
    hire_date: Mapped[date] = mapped_column(Date, nullable=False)
    termination_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    salary: Mapped[Optional[Numeric]] = mapped_column(Numeric(15, 2), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="employee")
    department: Mapped[Optional[Department]] = relationship("Department", foreign_keys=[department_id], back_populates="employees")
    managed_departments: Mapped[List[Department]] = relationship("Department", foreign_keys="Department.manager_id", back_populates="manager")
    attendance_records: Mapped[List[Attendance]] = relationship("Attendance", back_populates="employee")
    leave_requests: Mapped[List[LeaveRequest]] = relationship("LeaveRequest", foreign_keys="LeaveRequest.employee_id", back_populates="employee")
    project_assignments: Mapped[List[ProjectAssignment]] = relationship("ProjectAssignment", back_populates="employee")
    expenses: Mapped[List[Expense]] = relationship("Expense", back_populates="employee")


class Attendance(BaseModel):
    __tablename__ = "attendance"
    __table_args__ = (
        Index("ix_attendance_employee_date", "employee_id", "date"),
        Index("ix_attendance_date", "date"),
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    check_in: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[AttendanceStatus] = mapped_column(Enum(AttendanceStatus, name="attendance_status_enum"), nullable=False)
    work_hours: Mapped[Optional[Numeric]] = mapped_column(Numeric(5, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    employee: Mapped[Employee] = relationship("Employee", back_populates="attendance_records")


class LeaveRequest(BaseModel):
    __tablename__ = "leave_requests"
    __table_args__ = (
        Index("ix_leave_requests_employee_id", "employee_id"),
        Index("ix_leave_requests_status", "status"),
        Index("ix_leave_requests_dates", "start_date", "end_date"),
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    leave_type: Mapped[LeaveType] = mapped_column(Enum(LeaveType, name="leave_type_enum"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days: Mapped[Numeric] = mapped_column(Numeric(5, 1), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[LeaveStatus] = mapped_column(Enum(LeaveStatus, name="leave_status_enum"), default=LeaveStatus.PENDING, nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    employee: Mapped[Employee] = relationship("Employee", foreign_keys=[employee_id], back_populates="leave_requests")
    approver: Mapped[Optional[Employee]] = relationship("Employee", foreign_keys=[approved_by])
'@


New-Stub -Path "backend/app/models/client.py" -Content @'
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, UUID, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.contract import Contract
    from app.models.finance import Invoice
    from app.models.project import Project


class Client(BaseModel):
    __tablename__ = "clients"
    __table_args__ = (
        Index("ix_clients_name", "name"),
        Index("ix_clients_is_active", "is_active"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    contacts: Mapped[List[ClientContact]] = relationship("ClientContact", back_populates="client")
    projects: Mapped[List[Project]] = relationship("Project", back_populates="client")
    invoices: Mapped[List[Invoice]] = relationship("Invoice", back_populates="client")
    contracts: Mapped[List[Contract]] = relationship("Contract", back_populates="client")


class ClientContact(BaseModel):
    __tablename__ = "client_contacts"
    __table_args__ = (
        Index("ix_client_contacts_client_id", "client_id"),
        Index("ix_client_contacts_is_primary", "is_primary"),
    )

    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    designation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    client: Mapped[Client] = relationship("Client", back_populates="contacts")
'@

New-Stub -Path "backend/app/models/project.py" -Content @'
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Date, DateTime, Enum, ForeignKey, Index, Numeric, String, Text, UUID, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import MilestoneStatus, Priority, ProjectStatus, TaskStatus

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.contract import Contract
    from app.models.employee import Employee
    from app.models.finance import Expense, Invoice


class Project(BaseModel):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("code", name="uq_projects_code"),
        Index("ix_projects_client_id", "client_id"),
        Index("ix_projects_status", "status"),
        Index("ix_projects_priority", "priority"),
    )

    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, name="project_status_enum"), default=ProjectStatus.PLANNING, nullable=False)
    priority: Mapped[Priority] = mapped_column(Enum(Priority, name="priority_enum"), default=Priority.MEDIUM, nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    budget: Mapped[Optional[Numeric]] = mapped_column(Numeric(15, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    client: Mapped[Optional[Client]] = relationship("Client", back_populates="projects")
    tasks: Mapped[List[ProjectTask]] = relationship("ProjectTask", back_populates="project")
    assignments: Mapped[List[ProjectAssignment]] = relationship("ProjectAssignment", back_populates="project")
    milestones: Mapped[List[Milestone]] = relationship("Milestone", back_populates="project")
    invoices: Mapped[List[Invoice]] = relationship("Invoice", back_populates="project")
    expenses: Mapped[List[Expense]] = relationship("Expense", back_populates="project")
    contracts: Mapped[List[Contract]] = relationship("Contract", back_populates="project")


class ProjectTask(BaseModel):
    __tablename__ = "project_tasks"
    __table_args__ = (
        Index("ix_project_tasks_project_id", "project_id"),
        Index("ix_project_tasks_assignee_id", "assignee_id"),
        Index("ix_project_tasks_status", "status"),
        Index("ix_project_tasks_parent_id", "parent_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("project_tasks.id", ondelete="SET NULL"), nullable=True)
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus, name="task_status_enum"), default=TaskStatus.TODO, nullable=False)
    priority: Mapped[Priority] = mapped_column(Enum(Priority, name="priority_enum"), default=Priority.MEDIUM, nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    estimated_hours: Mapped[Optional[Numeric]] = mapped_column(Numeric(8, 2), nullable=True)
    actual_hours: Mapped[Optional[Numeric]] = mapped_column(Numeric(8, 2), nullable=True)

    project: Mapped[Project] = relationship("Project", back_populates="tasks")
    parent: Mapped[Optional[ProjectTask]] = relationship("ProjectTask", back_populates="subtasks", remote_side="ProjectTask.id", foreign_keys=[parent_id])
    subtasks: Mapped[List[ProjectTask]] = relationship("ProjectTask", back_populates="parent", foreign_keys=[parent_id])
    assignee: Mapped[Optional[Employee]] = relationship("Employee", foreign_keys=[assignee_id])


class ProjectAssignment(BaseModel):
    __tablename__ = "project_assignments"
    __table_args__ = (
        UniqueConstraint("project_id", "employee_id", name="uq_project_assignments_project_employee"),
        Index("ix_project_assignments_employee_id", "employee_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    project: Mapped[Project] = relationship("Project", back_populates="assignments")
    employee: Mapped[Employee] = relationship("Employee", back_populates="project_assignments")


class Milestone(BaseModel):
    __tablename__ = "milestones"
    __table_args__ = (
        Index("ix_milestones_project_id", "project_id"),
        Index("ix_milestones_due_date", "due_date"),
        Index("ix_milestones_status", "status"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    completed_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[MilestoneStatus] = mapped_column(Enum(MilestoneStatus, name="milestone_status_enum"), default=MilestoneStatus.PENDING, nullable=False)

    project: Mapped[Project] = relationship("Project", back_populates="milestones")
'@


New-Stub -Path "backend/app/models/finance.py" -Content @'
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Date, DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, Text, UUID, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import ExpenseCategory, ExpenseStatus, InvoiceStatus, PaymentMethod, PaymentStatus

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.employee import Employee
    from app.models.prediction import PaymentRiskPrediction
    from app.models.project import Project


class Invoice(BaseModel):
    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("invoice_number", name="uq_invoices_number"),
        Index("ix_invoices_client_id", "client_id"),
        Index("ix_invoices_project_id", "project_id"),
        Index("ix_invoices_status", "status"),
        Index("ix_invoices_due_date", "due_date"),
    )

    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(Enum(InvoiceStatus, name="invoice_status_enum"), default=InvoiceStatus.DRAFT, nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    subtotal: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    tax_rate: Mapped[Numeric] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    tax_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    discount_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    paid_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    client: Mapped[Client] = relationship("Client", back_populates="invoices")
    project: Mapped[Optional[Project]] = relationship("Project", back_populates="invoices")
    items: Mapped[List[InvoiceItem]] = relationship("InvoiceItem", back_populates="invoice")
    payments: Mapped[List[Payment]] = relationship("Payment", back_populates="invoice")
    risk_prediction: Mapped[Optional[PaymentRiskPrediction]] = relationship("PaymentRiskPrediction", back_populates="invoice", uselist=False)


class InvoiceItem(BaseModel):
    __tablename__ = "invoice_items"
    __table_args__ = (Index("ix_invoice_items_invoice_id", "invoice_id"),)

    invoice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    invoice: Mapped[Invoice] = relationship("Invoice", back_populates="items")


class Payment(BaseModel):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_invoice_id", "invoice_id"),
        Index("ix_payments_status", "status"),
        Index("ix_payments_payment_date", "payment_date"),
    )

    invoice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod, name="payment_method_enum"), nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, name="payment_status_enum"), default=PaymentStatus.PENDING, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    invoice: Mapped[Invoice] = relationship("Invoice", back_populates="payments")


class Expense(BaseModel):
    __tablename__ = "expenses"
    __table_args__ = (
        Index("ix_expenses_project_id", "project_id"),
        Index("ix_expenses_employee_id", "employee_id"),
        Index("ix_expenses_status", "status"),
        Index("ix_expenses_date", "date"),
    )

    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    category: Mapped[ExpenseCategory] = mapped_column(Enum(ExpenseCategory, name="expense_category_enum"), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[ExpenseStatus] = mapped_column(Enum(ExpenseStatus, name="expense_status_enum"), default=ExpenseStatus.PENDING, nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    project: Mapped[Optional[Project]] = relationship("Project", back_populates="expenses")
    employee: Mapped[Employee] = relationship("Employee", foreign_keys=[employee_id], back_populates="expenses")
    approver: Mapped[Optional[Employee]] = relationship("Employee", foreign_keys=[approved_by])
'@


New-Stub -Path "backend/app/models/purchase_order.py" -Content @'
from __future__ import annotations

import uuid
from datetime import date
from typing import List, Optional

from sqlalchemy import Date, Enum, ForeignKey, Index, Integer, Numeric, String, Text, UUID, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import POStatus


class PurchaseOrder(BaseModel):
    __tablename__ = "purchase_orders"
    __table_args__ = (
        UniqueConstraint("po_number", name="uq_purchase_orders_number"),
        Index("ix_purchase_orders_status", "status"),
        Index("ix_purchase_orders_order_date", "order_date"),
    )

    po_number: Mapped[str] = mapped_column(String(50), nullable=False)
    vendor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    vendor_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vendor_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    status: Mapped[POStatus] = mapped_column(Enum(POStatus, name="po_status_enum"), default=POStatus.DRAFT, nullable=False)
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_delivery: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_delivery: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    subtotal: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    tax_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    items: Mapped[List[POItem]] = relationship("POItem", back_populates="purchase_order")


class POItem(BaseModel):
    __tablename__ = "po_items"
    __table_args__ = (Index("ix_po_items_po_id", "po_id"),)

    po_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    purchase_order: Mapped[PurchaseOrder] = relationship("PurchaseOrder", back_populates="items")
'@

New-Stub -Path "backend/app/models/contract.py" -Content @'
from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Date, Enum, ForeignKey, Index, Numeric, String, Text, UUID, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import ContractStatus, RiskProbability, RiskSeverity, RiskStatus

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.project import Project


class Contract(BaseModel):
    __tablename__ = "contracts"
    __table_args__ = (
        UniqueConstraint("contract_number", name="uq_contracts_number"),
        Index("ix_contracts_client_id", "client_id"),
        Index("ix_contracts_project_id", "project_id"),
        Index("ix_contracts_status", "status"),
        Index("ix_contracts_end_date", "end_date"),
    )

    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    contract_number: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[ContractStatus] = mapped_column(Enum(ContractStatus, name="contract_status_enum"), default=ContractStatus.DRAFT, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    client: Mapped[Client] = relationship("Client", back_populates="contracts")
    project: Mapped[Optional[Project]] = relationship("Project", back_populates="contracts")
    risks: Mapped[List[ContractRisk]] = relationship("ContractRisk", back_populates="contract")


class ContractRisk(BaseModel):
    __tablename__ = "contract_risks"
    __table_args__ = (
        Index("ix_contract_risks_contract_id", "contract_id"),
        Index("ix_contract_risks_status", "status"),
        Index("ix_contract_risks_severity", "severity"),
    )

    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[RiskSeverity] = mapped_column(Enum(RiskSeverity, name="risk_severity_enum"), nullable=False)
    probability: Mapped[RiskProbability] = mapped_column(Enum(RiskProbability, name="risk_probability_enum"), nullable=False)
    mitigation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[RiskStatus] = mapped_column(Enum(RiskStatus, name="risk_status_enum"), default=RiskStatus.IDENTIFIED, nullable=False)

    contract: Mapped[Contract] = relationship("Contract", back_populates="risks")
'@


New-Stub -Path "backend/app/models/document.py" -Content @'
from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import BigInteger, ForeignKey, Index, String, Text, UUID, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class DocumentCategory(BaseModel):
    __tablename__ = "document_categories"
    __table_args__ = (
        UniqueConstraint("name", "parent_id", name="uq_doc_categories_name_parent"),
        Index("ix_document_categories_parent_id", "parent_id"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("document_categories.id", ondelete="SET NULL"), nullable=True)

    parent: Mapped[Optional[DocumentCategory]] = relationship("DocumentCategory", back_populates="children", remote_side="DocumentCategory.id", foreign_keys=[parent_id])
    children: Mapped[List[DocumentCategory]] = relationship("DocumentCategory", back_populates="parent", foreign_keys=[parent_id])
    documents: Mapped[List[Document]] = relationship("Document", back_populates="category")


class Document(BaseModel):
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_category_id", "category_id"),
        Index("ix_documents_related", "related_type", "related_id"),
        Index("ix_documents_uploaded_by", "uploaded_by"),
    )

    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("document_categories.id", ondelete="SET NULL"), nullable=True)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Polymorphic ref: related_type = 'project'|'client'|'contract'|'employee'|'invoice'
    related_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    related_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    version: Mapped[int] = mapped_column(BigInteger, default=1, nullable=False)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    category: Mapped[Optional[DocumentCategory]] = relationship("DocumentCategory", back_populates="documents")
'@

New-Stub -Path "backend/app/models/ai.py" -Content @'
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Enum, ForeignKey, Index, Integer, String, Text, UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import AIMessageRole

if TYPE_CHECKING:
    from app.models.auth import User


class AIChatSession(BaseModel):
    __tablename__ = "ai_chat_sessions"
    __table_args__ = (Index("ix_ai_chat_sessions_user_id", "user_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    context: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped[User] = relationship("User")
    messages: Mapped[List[AIChatMessage]] = relationship("AIChatMessage", back_populates="session", order_by="AIChatMessage.created_at")


class AIChatMessage(BaseModel):
    __tablename__ = "ai_chat_messages"
    __table_args__ = (Index("ix_ai_chat_messages_session_id", "session_id"),)

    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[AIMessageRole] = mapped_column(Enum(AIMessageRole, name="ai_message_role_enum"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Store tool calls / function results for LangGraph
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)

    session: Mapped[AIChatSession] = relationship("AIChatSession", back_populates="messages")
'@

New-Stub -Path "backend/app/models/prediction.py" -Content @'
from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, Enum, ForeignKey, Index, Integer, Numeric, String, UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import RiskLevel

if TYPE_CHECKING:
    from app.models.finance import Invoice
    from app.models.project import Project


class RevenuePrediction(BaseModel):
    __tablename__ = "revenue_predictions"
    __table_args__ = (Index("ix_revenue_predictions_period", "period_start", "period_end"),)

    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    predicted_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    actual_amount: Mapped[Optional[Numeric]] = mapped_column(Numeric(15, 2), nullable=True)
    confidence_score: Mapped[Optional[Numeric]] = mapped_column(Numeric(5, 4), nullable=True)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    features: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class PaymentRiskPrediction(BaseModel):
    __tablename__ = "payment_risk_predictions"
    __table_args__ = (
        Index("ix_payment_risk_invoice_id", "invoice_id"),
        Index("ix_payment_risk_level", "risk_level"),
    )

    invoice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    risk_score: Mapped[Numeric] = mapped_column(Numeric(5, 4), nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel, name="risk_level_enum"), nullable=False)
    predicted_delay_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    factors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)

    invoice: Mapped[Invoice] = relationship("Invoice", back_populates="risk_prediction")


class ProjectDelayPrediction(BaseModel):
    __tablename__ = "project_delay_predictions"
    __table_args__ = (
        Index("ix_project_delay_project_id", "project_id"),
        Index("ix_project_delay_risk_level", "risk_level"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    risk_score: Mapped[Numeric] = mapped_column(Numeric(5, 4), nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel, name="risk_level_enum"), nullable=False)
    predicted_delay_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    factors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)

    project: Mapped[Project] = relationship("Project")
'@

New-Stub -Path "backend/app/models/system.py" -Content @'
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Index, String, Text, UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import AuditAction, NotificationType


class Notification(BaseModel):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_id", "user_id"),
        Index("ix_notifications_is_read", "is_read"),
        Index("ix_notifications_user_read", "user_id", "is_read"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType, name="notification_type_enum"), default=NotificationType.INFO, nullable=False)
    related_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    related_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_user_id", "user_id"),
        Index("ix_audit_logs_table_record", "table_name", "record_id"),
        Index("ix_audit_logs_action", "action"),
        Index("ix_audit_logs_created_at", "created_at"),
    )

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[AuditAction] = mapped_column(Enum(AuditAction, name="audit_action_enum"), nullable=False)
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    record_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    old_values: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)


class ActivityLog(BaseModel):
    __tablename__ = "activity_logs"
    __table_args__ = (
        Index("ix_activity_logs_user_id", "user_id"),
        Index("ix_activity_logs_module", "module"),
        Index("ix_activity_logs_created_at", "created_at"),
    )

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    module: Mapped[str] = mapped_column(String(100), nullable=False)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
'@


# ---------------------------------------------------------------------------
# DB LAYER
# ---------------------------------------------------------------------------

New-Stub -Path "backend/app/db/base.py" -Content @'
# Import all models so Alembic can detect them via Base.metadata
from app.models.base import Base  # noqa: F401
from app.models.auth import Permission, Role, User, role_permissions, user_roles  # noqa: F401
from app.models.employee import Attendance, Department, Employee, LeaveRequest  # noqa: F401
from app.models.client import Client, ClientContact  # noqa: F401
from app.models.project import Milestone, Project, ProjectAssignment, ProjectTask  # noqa: F401
from app.models.finance import Expense, Invoice, InvoiceItem, Payment  # noqa: F401
from app.models.purchase_order import POItem, PurchaseOrder  # noqa: F401
from app.models.contract import Contract, ContractRisk  # noqa: F401
from app.models.document import Document, DocumentCategory  # noqa: F401
from app.models.ai import AIChatMessage, AIChatSession  # noqa: F401
from app.models.prediction import PaymentRiskPrediction, ProjectDelayPrediction, RevenuePrediction  # noqa: F401
from app.models.system import ActivityLog, AuditLog, Notification  # noqa: F401

__all__ = ["Base"]
'@

New-Stub -Path "backend/app/db/session.py" -Content @'
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
'@

New-Stub -Path "backend/app/db/migrations/env.py" -Content @'
import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.db.base import Base  # noqa: F401

config = context.config

_db_url = os.environ.get("DATABASE_URL", "")
if _db_url:
    config.set_main_option("sqlalchemy.url", _db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
'@


New-Stub -Path "backend/app/db/seed.py" -Content @'
"""
Seed script -- roles and permissions.
Run: python -m app.db.seed
"""

import asyncio
import os
import uuid

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models.auth import Permission, Role

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

ROLES: list[dict] = [
    {"name": "super_admin",     "description": "Full system access"},
    {"name": "admin",           "description": "Administrative access"},
    {"name": "manager",         "description": "General management"},
    {"name": "hr_manager",      "description": "HR module management"},
    {"name": "project_manager", "description": "Project module management"},
    {"name": "finance_manager", "description": "Finance module management"},
    {"name": "employee",        "description": "Standard employee access"},
    {"name": "viewer",          "description": "Read-only access"},
]

PERMISSIONS: list[tuple[str, str, str]] = [
    ("auth.view_users", "View Users", "auth"),
    ("auth.create_users", "Create Users", "auth"),
    ("auth.edit_users", "Edit Users", "auth"),
    ("auth.delete_users", "Delete Users", "auth"),
    ("auth.manage_roles", "Manage Roles", "auth"),
    ("employees.view", "View Employees", "employees"),
    ("employees.create", "Create Employees", "employees"),
    ("employees.edit", "Edit Employees", "employees"),
    ("employees.delete", "Delete Employees", "employees"),
    ("attendance.view", "View Attendance", "attendance"),
    ("attendance.manage", "Manage Attendance", "attendance"),
    ("leave.view", "View Leave", "leave"),
    ("leave.approve", "Approve Leave", "leave"),
    ("leave.manage", "Manage Leave", "leave"),
    ("clients.view", "View Clients", "clients"),
    ("clients.create", "Create Clients", "clients"),
    ("clients.edit", "Edit Clients", "clients"),
    ("clients.delete", "Delete Clients", "clients"),
    ("projects.view", "View Projects", "projects"),
    ("projects.create", "Create Projects", "projects"),
    ("projects.edit", "Edit Projects", "projects"),
    ("projects.delete", "Delete Projects", "projects"),
    ("projects.tasks", "Manage Tasks", "projects"),
    ("finance.view_invoices", "View Invoices", "finance"),
    ("finance.create_invoices", "Create Invoices", "finance"),
    ("finance.edit_invoices", "Edit Invoices", "finance"),
    ("finance.delete_invoices", "Delete Invoices", "finance"),
    ("finance.view_payments", "View Payments", "finance"),
    ("finance.manage_payments", "Manage Payments", "finance"),
    ("finance.view_expenses", "View Expenses", "finance"),
    ("finance.approve_expenses", "Approve Expenses", "finance"),
    ("po.view", "View POs", "purchase_orders"),
    ("po.create", "Create POs", "purchase_orders"),
    ("po.edit", "Edit POs", "purchase_orders"),
    ("po.approve", "Approve POs", "purchase_orders"),
    ("contracts.view", "View Contracts", "contracts"),
    ("contracts.create", "Create Contracts", "contracts"),
    ("contracts.edit", "Edit Contracts", "contracts"),
    ("documents.view", "View Documents", "documents"),
    ("documents.upload", "Upload Documents", "documents"),
    ("documents.delete", "Delete Documents", "documents"),
    ("ai.chat", "Use AI Chat", "ai"),
    ("ai.predictions", "View Predictions", "ai"),
    ("system.audit_logs", "View Audit Logs", "system"),
    ("system.notifications", "Manage Notifications", "system"),
]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "super_admin": [p[0] for p in PERMISSIONS],
    "admin": [p[0] for p in PERMISSIONS if p[0] not in ("auth.delete_users", "system.audit_logs")],
    "manager": [
        "employees.view", "attendance.view", "leave.view", "leave.approve",
        "clients.view", "clients.create", "clients.edit",
        "projects.view", "projects.create", "projects.edit", "projects.tasks",
        "finance.view_invoices", "finance.view_payments", "finance.view_expenses",
        "finance.approve_expenses", "contracts.view", "documents.view",
        "documents.upload", "ai.chat", "ai.predictions",
    ],
    "hr_manager": [
        "employees.view", "employees.create", "employees.edit",
        "attendance.view", "attendance.manage",
        "leave.view", "leave.approve", "leave.manage",
        "documents.view", "documents.upload",
    ],
    "project_manager": [
        "clients.view", "projects.view", "projects.create",
        "projects.edit", "projects.tasks", "employees.view",
        "finance.view_invoices", "finance.view_expenses",
        "documents.view", "documents.upload", "ai.chat", "ai.predictions",
    ],
    "finance_manager": [
        "clients.view",
        "finance.view_invoices", "finance.create_invoices", "finance.edit_invoices",
        "finance.delete_invoices", "finance.view_payments", "finance.manage_payments",
        "finance.view_expenses", "finance.approve_expenses",
        "po.view", "po.create", "po.edit", "po.approve",
        "contracts.view", "documents.view", "documents.upload", "ai.predictions",
    ],
    "employee": ["attendance.view", "leave.view", "projects.view", "finance.view_expenses", "documents.view", "ai.chat"],
    "viewer": ["employees.view", "clients.view", "projects.view", "finance.view_invoices", "documents.view"],
}


async def seed(session: AsyncSession) -> None:
    from sqlalchemy import select

    perm_map: dict[str, Permission] = {}
    for codename, name, module in PERMISSIONS:
        result = await session.execute(select(Permission).where(Permission.codename == codename))
        perm = result.scalar_one_or_none()
        if not perm:
            perm = Permission(id=uuid.uuid4(), name=name, codename=codename, module=module)
            session.add(perm)
        perm_map[codename] = perm

    await session.flush()

    for role_data in ROLES:
        result = await session.execute(select(Role).where(Role.name == role_data["name"]))
        role = result.scalar_one_or_none()
        if not role:
            role = Role(id=uuid.uuid4(), **role_data)
            session.add(role)
        await session.flush()
        allowed = set(ROLE_PERMISSIONS.get(role_data["name"], []))
        role.permissions = [perm_map[c] for c in allowed if c in perm_map]

    await session.commit()
    print("Seed complete.")


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await seed(session)


if __name__ == "__main__":
    asyncio.run(main())
'@


# ---------------------------------------------------------------------------
# CORE
# ---------------------------------------------------------------------------

New-Stub -Path "backend/app/core/config.py" -Content @'
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    APP_NAME: str = "nevark-mss"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    REDIS_URL: str = "redis://localhost:6379/0"

    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET_NAME: str = "nevark-mss"
    MINIO_SECURE: bool = False

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "nevark_mss"

    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
'@

New-Stub -Path "backend/app/core/security.py" -Content @'
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_ACCESS = "access"
_REFRESH = "refresh"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + expires_delta,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str) -> str:
    return _create_token(user_id, _ACCESS, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(user_id: str) -> str:
    return _create_token(user_id, _REFRESH, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str, expected_type: str = _ACCESS) -> str:
    """Decode JWT and return user_id (sub). Raises JWTError on failure."""
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    if payload.get("type") != expected_type:
        raise JWTError("Invalid token type")
    sub: str | None = payload.get("sub")
    if not sub:
        raise JWTError("Missing subject")
    return sub


def decode_refresh_token(token: str) -> str:
    return decode_token(token, _REFRESH)
'@

New-Stub -Path "backend/app/core/logging.py" -Content @'
import logging
import sys

import structlog

from app.core.config import settings


def configure_logging() -> None:
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    renderer: structlog.types.Processor = (
        structlog.processors.JSONRenderer()
        if settings.APP_ENV == "production"
        else structlog.dev.ConsoleRenderer(colors=True)
    )

    structlog.configure(
        processors=[*shared_processors, structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[structlog.stdlib.ProcessorFormatter.remove_processors_meta, renderer],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

    for noisy in ("uvicorn.access", "sqlalchemy.engine", "httpx"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str = __name__) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
'@


# ---------------------------------------------------------------------------
# APP ENTRY POINT + API LAYER
# ---------------------------------------------------------------------------

New-Stub -Path "backend/app/main.py" -Content @'
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging
from app.api.v1.router import router as api_v1_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    configure_logging()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "version": settings.APP_VERSION}
'@

New-Stub -Path "backend/app/schemas/auth.py" -Content @'
from uuid import UUID

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str | None
    is_verified: bool
    roles: list[str]

    model_config = {"from_attributes": True}
'@

New-Stub -Path "backend/app/services/auth.py" -Content @'
import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, create_refresh_token, decode_refresh_token, verify_password
from app.models.auth import Role, User
from app.schemas.auth import TokenResponse

log = structlog.get_logger(__name__)


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(
        select(User)
        .where(User.email == email, User.is_active.is_(True))
        .options(selectinload(User.roles).selectinload(Role.permissions))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise ValueError("Invalid credentials")
    log.info("user.login", user_id=str(user.id))
    return user


def issue_tokens(user_id: uuid.UUID) -> TokenResponse:
    uid = str(user_id)
    return TokenResponse(access_token=create_access_token(uid), refresh_token=create_refresh_token(uid))


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> TokenResponse:
    from jose import JWTError
    try:
        user_id = decode_refresh_token(refresh_token)
    except JWTError as exc:
        raise ValueError("Invalid refresh token") from exc

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id), User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found or inactive")
    return issue_tokens(user.id)


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(
        select(User)
        .where(User.id == user_id, User.is_active.is_(True))
        .options(selectinload(User.roles).selectinload(Role.permissions))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found")
    return user
'@

New-Stub -Path "backend/app/api/deps.py" -Content @'
import uuid
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db
from app.models.auth import User
from app.services.auth import get_user_by_id

_bearer = HTTPBearer()

DBDep = Annotated[AsyncSession, Depends(get_db)]
TokenDep = Annotated[HTTPAuthorizationCredentials, Depends(_bearer)]


async def get_current_user(db: DBDep, creds: TokenDep) -> User:
    try:
        user_id = decode_token(creds.credentials)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    try:
        return await get_user_by_id(db, uuid.UUID(user_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found")


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_permission(codename: str) -> Any:
    """
    Usage: dependencies=[require_permission("projects.create")]
    """
    async def _guard(current_user: CurrentUser) -> User:
        perms = {p.codename for role in current_user.roles for p in role.permissions}
        if codename not in perms:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission required: {codename}")
        return current_user
    return Depends(_guard)
'@

New-Stub -Path "backend/app/api/v1/routes/auth.py" -Content @'
from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DBDep
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse, UserOut
from app.services.auth import authenticate, issue_tokens, refresh_tokens

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: DBDep) -> TokenResponse:
    try:
        user = await authenticate(db, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    return issue_tokens(user.id)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: DBDep) -> TokenResponse:
    try:
        return await refresh_tokens(db, payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> None:
    # Stateless JWT -- client discards token. Push JTI to Redis here for blacklisting.
    pass


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser) -> UserOut:
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_verified=current_user.is_verified,
        roles=[role.name for role in current_user.roles],
    )
'@

New-Stub -Path "backend/app/api/v1/router.py" -Content @'
from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["auth"])
'@


# ---------------------------------------------------------------------------
# MIGRATION (0001_initial_schema)
# ---------------------------------------------------------------------------

New-Stub -Path "backend/app/db/migrations/versions/0001_initial_schema.py" -Content @'
"""initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ENUM TYPES
    op.execute("CREATE TYPE employment_type_enum AS ENUM ('full_time','part_time','contract','intern')")
    op.execute("CREATE TYPE attendance_status_enum AS ENUM ('present','absent','late','half_day','on_leave')")
    op.execute("CREATE TYPE leave_type_enum AS ENUM ('annual','sick','casual','maternity','paternity','unpaid')")
    op.execute("CREATE TYPE leave_status_enum AS ENUM ('pending','approved','rejected','cancelled')")
    op.execute("CREATE TYPE project_status_enum AS ENUM ('planning','active','on_hold','completed','cancelled')")
    op.execute("CREATE TYPE task_status_enum AS ENUM ('todo','in_progress','in_review','done','blocked')")
    op.execute("CREATE TYPE priority_enum AS ENUM ('low','medium','high','critical')")
    op.execute("CREATE TYPE milestone_status_enum AS ENUM ('pending','completed','missed')")
    op.execute("CREATE TYPE invoice_status_enum AS ENUM ('draft','sent','partial','paid','overdue','cancelled')")
    op.execute("CREATE TYPE payment_method_enum AS ENUM ('bank_transfer','credit_card','cash','cheque','online')")
    op.execute("CREATE TYPE payment_status_enum AS ENUM ('pending','completed','failed','refunded')")
    op.execute("CREATE TYPE expense_status_enum AS ENUM ('pending','approved','rejected','reimbursed')")
    op.execute("CREATE TYPE expense_category_enum AS ENUM ('travel','accommodation','meals','office_supplies','software','hardware','marketing','other')")
    op.execute("CREATE TYPE po_status_enum AS ENUM ('draft','submitted','approved','delivered','cancelled')")
    op.execute("CREATE TYPE contract_status_enum AS ENUM ('draft','active','expired','terminated')")
    op.execute("CREATE TYPE risk_severity_enum AS ENUM ('low','medium','high','critical')")
    op.execute("CREATE TYPE risk_probability_enum AS ENUM ('low','medium','high')")
    op.execute("CREATE TYPE risk_status_enum AS ENUM ('identified','mitigating','resolved','accepted')")
    op.execute("CREATE TYPE ai_message_role_enum AS ENUM ('user','assistant','system')")
    op.execute("CREATE TYPE risk_level_enum AS ENUM ('low','medium','high','critical')")
    op.execute("CREATE TYPE notification_type_enum AS ENUM ('info','success','warning','error')")
    op.execute("CREATE TYPE audit_action_enum AS ENUM ('create','read','update','delete')")

    _audit = [
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    ]

    op.create_table("roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        *_audit,
        sa.UniqueConstraint("name", name="uq_roles_name"),
    )
    op.create_table("permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("codename", sa.String(100), nullable=False),
        sa.Column("module", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        *_audit,
        sa.UniqueConstraint("codename", name="uq_permissions_codename"),
    )
    op.create_index("ix_permissions_module", "permissions", ["module"])
    op.create_table("users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("is_verified", sa.Boolean(), default=False, nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        *_audit,
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_is_active", "users", ["is_active"])
    op.create_table("role_permissions",
        sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("permission_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table("user_roles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    )

    # departments without manager FK (circular -- added after employees)
    op.create_table("departments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("manager_id", postgresql.UUID(as_uuid=True), nullable=True),
        *_audit,
        sa.UniqueConstraint("name", name="uq_departments_name"),
    )
    op.create_index("ix_departments_parent_id", "departments", ["parent_id"])
    op.create_index("ix_departments_manager_id", "departments", ["manager_id"])
    op.create_table("employees",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("employee_code", sa.String(50), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("job_title", sa.String(200), nullable=True),
        sa.Column("employment_type", sa.Enum(name="employment_type_enum", create_type=False), nullable=False),
        sa.Column("hire_date", sa.Date, nullable=False),
        sa.Column("termination_date", sa.Date, nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("emergency_contact_name", sa.String(200), nullable=True),
        sa.Column("emergency_contact_phone", sa.String(20), nullable=True),
        sa.Column("salary", sa.Numeric(15, 2), nullable=True),
        *_audit,
        sa.UniqueConstraint("employee_code", name="uq_employees_code"),
        sa.UniqueConstraint("user_id", name="uq_employees_user_id"),
    )
    op.create_index("ix_employees_department_id", "employees", ["department_id"])
    op.create_index("ix_employees_employment_type", "employees", ["employment_type"])
    # Resolve circular FK
    op.create_foreign_key("fk_departments_manager_id", "departments", "employees", ["manager_id"], ["id"], ondelete="SET NULL")

    op.create_table("attendance",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("check_in", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_out", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.Enum(name="attendance_status_enum", create_type=False), nullable=False),
        sa.Column("work_hours", sa.Numeric(5, 2), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        *_audit,
    )
    op.create_index("ix_attendance_employee_date", "attendance", ["employee_id", "date"])
    op.create_index("ix_attendance_date", "attendance", ["date"])

    op.create_table("leave_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("leave_type", sa.Enum(name="leave_type_enum", create_type=False), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("days", sa.Numeric(5, 1), nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("status", sa.Enum(name="leave_status_enum", create_type=False), nullable=False, server_default="pending"),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        *_audit,
    )
    op.create_index("ix_leave_requests_employee_id", "leave_requests", ["employee_id"])
    op.create_index("ix_leave_requests_status", "leave_requests", ["status"])
    op.create_index("ix_leave_requests_dates", "leave_requests", ["start_date", "end_date"])

    op.create_table("clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("industry", sa.String(100), nullable=True),
        sa.Column("website", sa.String(255), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("tax_id", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        *_audit,
    )
    op.create_index("ix_clients_name", "clients", ["name"])
    op.create_index("ix_clients_is_active", "clients", ["is_active"])
    op.create_table("client_contacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("designation", sa.String(100), nullable=True),
        sa.Column("is_primary", sa.Boolean(), default=False, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        *_audit,
    )
    op.create_index("ix_client_contacts_client_id", "client_contacts", ["client_id"])
    op.create_index("ix_client_contacts_is_primary", "client_contacts", ["is_primary"])
'@


# Migration continued (projects through system tables + downgrade)
$_migration_part2 = @'
    op.create_table("projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.Enum(name="project_status_enum", create_type=False), nullable=False, server_default="planning"),
        sa.Column("priority", sa.Enum(name="priority_enum", create_type=False), nullable=False, server_default="medium"),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("actual_end_date", sa.Date, nullable=True),
        sa.Column("budget", sa.Numeric(15, 2), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.UniqueConstraint("code", name="uq_projects_code"),
    )
    op.create_index("ix_projects_client_id", "projects", ["client_id"])
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_index("ix_projects_priority", "projects", ["priority"])

    op.create_table("project_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project_tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assignee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.Enum(name="task_status_enum", create_type=False), nullable=False, server_default="todo"),
        sa.Column("priority", sa.Enum(name="priority_enum", create_type=False), nullable=False, server_default="medium"),
        sa.Column("due_date", sa.Date, nullable=True),
        sa.Column("estimated_hours", sa.Numeric(8, 2), nullable=True),
        sa.Column("actual_hours", sa.Numeric(8, 2), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_project_tasks_project_id", "project_tasks", ["project_id"])
    op.create_index("ix_project_tasks_assignee_id", "project_tasks", ["assignee_id"])
    op.create_index("ix_project_tasks_status", "project_tasks", ["status"])
    op.create_index("ix_project_tasks_parent_id", "project_tasks", ["parent_id"])

    op.create_table("project_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(100), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.UniqueConstraint("project_id", "employee_id", name="uq_project_assignments_project_employee"),
    )
    op.create_index("ix_project_assignments_employee_id", "project_assignments", ["employee_id"])

    op.create_table("milestones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("completed_at", sa.Date, nullable=True),
        sa.Column("status", sa.Enum(name="milestone_status_enum", create_type=False), nullable=False, server_default="pending"),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_milestones_project_id", "milestones", ["project_id"])
    op.create_index("ix_milestones_due_date", "milestones", ["due_date"])
    op.create_index("ix_milestones_status", "milestones", ["status"])

    op.create_table("invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("invoice_number", sa.String(50), nullable=False),
        sa.Column("status", sa.Enum(name="invoice_status_enum", create_type=False), nullable=False, server_default="draft"),
        sa.Column("issue_date", sa.Date, nullable=False),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("subtotal", sa.Numeric(15, 2), nullable=False),
        sa.Column("tax_rate", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("paid_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.UniqueConstraint("invoice_number", name="uq_invoices_number"),
    )
    op.create_index("ix_invoices_client_id", "invoices", ["client_id"])
    op.create_index("ix_invoices_project_id", "invoices", ["project_id"])
    op.create_index("ix_invoices_status", "invoices", ["status"])
    op.create_index("ix_invoices_due_date", "invoices", ["due_date"])

    op.create_table("invoice_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit_price", sa.Numeric(15, 2), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_invoice_items_invoice_id", "invoice_items", ["invoice_id"])

    op.create_table("payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("payment_date", sa.Date, nullable=False),
        sa.Column("payment_method", sa.Enum(name="payment_method_enum", create_type=False), nullable=False),
        sa.Column("reference", sa.String(255), nullable=True),
        sa.Column("status", sa.Enum(name="payment_status_enum", create_type=False), nullable=False, server_default="pending"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_payments_invoice_id", "payments", ["invoice_id"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("ix_payments_payment_date", "payments", ["payment_date"])

    op.create_table("expenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category", sa.Enum(name="expense_category_enum", create_type=False), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("receipt_url", sa.String(500), nullable=True),
        sa.Column("status", sa.Enum(name="expense_status_enum", create_type=False), nullable=False, server_default="pending"),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_expenses_project_id", "expenses", ["project_id"])
    op.create_index("ix_expenses_employee_id", "expenses", ["employee_id"])
    op.create_index("ix_expenses_status", "expenses", ["status"])
    op.create_index("ix_expenses_date", "expenses", ["date"])

    op.create_table("purchase_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("po_number", sa.String(50), nullable=False),
        sa.Column("vendor_name", sa.String(255), nullable=False),
        sa.Column("vendor_email", sa.String(255), nullable=True),
        sa.Column("vendor_phone", sa.String(20), nullable=True),
        sa.Column("status", sa.Enum(name="po_status_enum", create_type=False), nullable=False, server_default="draft"),
        sa.Column("order_date", sa.Date, nullable=False),
        sa.Column("expected_delivery", sa.Date, nullable=True),
        sa.Column("actual_delivery", sa.Date, nullable=True),
        sa.Column("subtotal", sa.Numeric(15, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.UniqueConstraint("po_number", name="uq_purchase_orders_number"),
    )
    op.create_index("ix_purchase_orders_status", "purchase_orders", ["status"])
    op.create_index("ix_purchase_orders_order_date", "purchase_orders", ["order_date"])
    op.create_table("po_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("po_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit_price", sa.Numeric(15, 2), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("unit", sa.String(50), nullable=True),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_po_items_po_id", "po_items", ["po_id"])

    op.create_table("contracts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("contract_number", sa.String(50), nullable=False),
        sa.Column("status", sa.Enum(name="contract_status_enum", create_type=False), nullable=False, server_default="draft"),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("value", sa.Numeric(15, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("terms", sa.Text, nullable=True),
        sa.Column("document_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.UniqueConstraint("contract_number", name="uq_contracts_number"),
    )
    op.create_index("ix_contracts_client_id", "contracts", ["client_id"])
    op.create_index("ix_contracts_project_id", "contracts", ["project_id"])
    op.create_index("ix_contracts_status", "contracts", ["status"])
    op.create_index("ix_contracts_end_date", "contracts", ["end_date"])
    op.create_table("contract_risks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("contract_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("severity", sa.Enum(name="risk_severity_enum", create_type=False), nullable=False),
        sa.Column("probability", sa.Enum(name="risk_probability_enum", create_type=False), nullable=False),
        sa.Column("mitigation", sa.Text, nullable=True),
        sa.Column("status", sa.Enum(name="risk_status_enum", create_type=False), nullable=False, server_default="identified"),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_contract_risks_contract_id", "contract_risks", ["contract_id"])
    op.create_index("ix_contract_risks_status", "contract_risks", ["status"])
    op.create_index("ix_contract_risks_severity", "contract_risks", ["severity"])

    op.create_table("document_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("document_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.UniqueConstraint("name", "parent_id", name="uq_doc_categories_name_parent"),
    )
    op.create_index("ix_document_categories_parent_id", "document_categories", ["parent_id"])
    op.create_table("documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("document_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("file_path", sa.String(1000), nullable=False),
        sa.Column("file_name", sa.String(500), nullable=False),
        sa.Column("file_size", sa.BigInteger, nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("related_type", sa.String(50), nullable=True),
        sa.Column("related_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("version", sa.BigInteger, nullable=False, server_default="1"),
        sa.Column("tags", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_documents_category_id", "documents", ["category_id"])
    op.create_index("ix_documents_related", "documents", ["related_type", "related_id"])
    op.create_index("ix_documents_uploaded_by", "documents", ["uploaded_by"])

    op.create_table("ai_chat_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("context", postgresql.JSONB, nullable=True),
        sa.Column("total_tokens", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_ai_chat_sessions_user_id", "ai_chat_sessions", ["user_id"])
    op.create_table("ai_chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_chat_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Enum(name="ai_message_role_enum", create_type=False), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("tokens_used", sa.Integer, nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_ai_chat_messages_session_id", "ai_chat_messages", ["session_id"])

    op.create_table("revenue_predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("period_start", sa.Date, nullable=False),
        sa.Column("period_end", sa.Date, nullable=False),
        sa.Column("predicted_amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("actual_amount", sa.Numeric(15, 2), nullable=True),
        sa.Column("confidence_score", sa.Numeric(5, 4), nullable=True),
        sa.Column("model_version", sa.String(50), nullable=False),
        sa.Column("features", postgresql.JSONB, nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_revenue_predictions_period", "revenue_predictions", ["period_start", "period_end"])
    op.create_table("payment_risk_predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("risk_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("risk_level", sa.Enum(name="risk_level_enum", create_type=False), nullable=False),
        sa.Column("predicted_delay_days", sa.Integer, nullable=True),
        sa.Column("factors", postgresql.JSONB, nullable=True),
        sa.Column("model_version", sa.String(50), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_payment_risk_invoice_id", "payment_risk_predictions", ["invoice_id"])
    op.create_index("ix_payment_risk_level", "payment_risk_predictions", ["risk_level"])
    op.create_table("project_delay_predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("risk_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("risk_level", sa.Enum(name="risk_level_enum", create_type=False), nullable=False),
        sa.Column("predicted_delay_days", sa.Integer, nullable=True),
        sa.Column("factors", postgresql.JSONB, nullable=True),
        sa.Column("model_version", sa.String(50), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_project_delay_project_id", "project_delay_predictions", ["project_id"])
    op.create_index("ix_project_delay_risk_level", "project_delay_predictions", ["risk_level"])

    op.create_table("notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("type", sa.Enum(name="notification_type_enum", create_type=False), nullable=False, server_default="info"),
        sa.Column("related_type", sa.String(50), nullable=True),
        sa.Column("related_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_read", sa.Boolean(), default=False, nullable=False),
        sa.Column("read_at", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
    op.create_index("ix_notifications_user_read", "notifications", ["user_id", "is_read"])
    op.create_table("audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.Enum(name="audit_action_enum", create_type=False), nullable=False),
        sa.Column("table_name", sa.String(100), nullable=False),
        sa.Column("record_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("old_values", postgresql.JSONB, nullable=True),
        sa.Column("new_values", postgresql.JSONB, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_table_record", "audit_logs", ["table_name", "record_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])
    op.create_table("activity_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("module", sa.String(100), nullable=False),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_activity_logs_user_id", "activity_logs", ["user_id"])
    op.create_index("ix_activity_logs_module", "activity_logs", ["module"])
    op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("activity_logs")
    op.drop_table("audit_logs")
    op.drop_table("notifications")
    op.drop_table("project_delay_predictions")
    op.drop_table("payment_risk_predictions")
    op.drop_table("revenue_predictions")
    op.drop_table("ai_chat_messages")
    op.drop_table("ai_chat_sessions")
    op.drop_table("documents")
    op.drop_table("document_categories")
    op.drop_table("contract_risks")
    op.drop_table("contracts")
    op.drop_table("po_items")
    op.drop_table("purchase_orders")
    op.drop_table("expenses")
    op.drop_table("payments")
    op.drop_table("invoice_items")
    op.drop_table("invoices")
    op.drop_table("milestones")
    op.drop_table("project_assignments")
    op.drop_table("project_tasks")
    op.drop_table("projects")
    op.drop_table("client_contacts")
    op.drop_table("clients")
    op.drop_table("leave_requests")
    op.drop_table("attendance")
    op.drop_constraint("fk_departments_manager_id", "departments", type_="foreignkey")
    op.drop_table("employees")
    op.drop_table("departments")
    op.drop_table("user_roles")
    op.drop_table("role_permissions")
    op.drop_table("users")
    op.drop_table("permissions")
    op.drop_table("roles")
    for enum_name in [
        "audit_action_enum","notification_type_enum","risk_level_enum",
        "ai_message_role_enum","risk_status_enum","risk_probability_enum",
        "risk_severity_enum","contract_status_enum","po_status_enum",
        "expense_category_enum","expense_status_enum","payment_status_enum",
        "payment_method_enum","invoice_status_enum","milestone_status_enum",
        "priority_enum","task_status_enum","project_status_enum",
        "leave_status_enum","leave_type_enum","attendance_status_enum","employment_type_enum",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
'@

# Append migration part2 to the already-written migration file
if (Test-Path "backend/app/db/migrations/versions/0001_initial_schema.py") {
    Add-Content -Path "backend/app/db/migrations/versions/0001_initial_schema.py" -Value $_migration_part2 -Encoding UTF8
    Write-Host "  APPEND backend/app/db/migrations/versions/0001_initial_schema.py" -ForegroundColor Yellow
}


# ---------------------------------------------------------------------------
# PLACEHOLDER STUBS
# ---------------------------------------------------------------------------
New-Stub -Path "backend/app/api/v1/routes/users.py"   -Content "# TODO: User management routes"
New-Stub -Path "backend/app/api/v1/routes/ai.py"       -Content "# TODO: AI chat routes"
New-Stub -Path "backend/app/api/v1/routes/storage.py"  -Content "# TODO: File storage routes"
New-Stub -Path "backend/app/core/exceptions.py"        -Content "# TODO: Custom exception classes"
New-Stub -Path "backend/app/schemas/user.py"           -Content "# TODO: User schemas"
New-Stub -Path "backend/app/schemas/common.py"         -Content "# TODO: Common schemas (pagination, response envelope)"
New-Stub -Path "backend/app/services/user.py"          -Content "# TODO: User service"
New-Stub -Path "backend/app/services/storage.py"       -Content "# TODO: MinIO storage service"
New-Stub -Path "backend/app/services/ai/agent.py"      -Content "# TODO: LangGraph agent"
New-Stub -Path "backend/app/services/ai/chains.py"     -Content "# TODO: LangChain chains"
New-Stub -Path "backend/app/services/ai/graphs.py"     -Content "# TODO: LangGraph graphs"
New-Stub -Path "backend/app/services/ai/vectorstore.py" -Content "# TODO: ChromaDB vectorstore"
New-Stub -Path "backend/app/repositories/base.py"      -Content "# TODO: Generic async repository base"
New-Stub -Path "backend/app/repositories/user.py"      -Content "# TODO: User repository"
New-Stub -Path "backend/app/tasks/celery_app.py"       -Content "# TODO: Celery app instance"
New-Stub -Path "backend/app/cache/redis.py"            -Content "# TODO: Redis client"
New-Stub -Path "backend/tests/conftest.py"             -Content "# TODO: pytest fixtures"

Write-Host "`n=== Setup complete ===" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  cd backend"
Write-Host "  cp .env.example .env  # then fill in real values"
Write-Host "  pip install -r requirements.txt"
Write-Host "  alembic upgrade head"
Write-Host "  python -m app.db.seed"
Write-Host "  uvicorn app.main:app --reload"
