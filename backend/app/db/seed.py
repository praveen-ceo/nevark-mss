"""
Seed script — roles and permissions.
Run: python -m app.db.seed
"""

import asyncio
import uuid
import os

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker 
from app.models.auth import User
from app.core.security import hash_password

from app.models.auth import Permission, Role
from app.models.employee import Employee
from app.models.employee import Employee, Department, Attendance, LeaveRequest
from app.models.client import Client, ClientContact
from app.models.project import Project, ProjectTask, ProjectAssignment, Milestone
from app.models.finance import Invoice, InvoiceItem, Payment, Expense
from app.models.purchase_order import PurchaseOrder, POItem
from app.models.contract import Contract, ContractRisk
from app.models.document import DocumentCategory, Document
from app.models.ai import AIChatSession, AIChatMessage
from app.models.prediction import RevenuePrediction, PaymentRiskPrediction, ProjectDelayPrediction
from app.models.system import Notification, AuditLog, ActivityLog
from app.models.auth import Permission, Role, role_permissions, user_roles, User
DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

ROLES: list[dict] = [
    {"name": "super_admin",      "description": "Full system access"},
    {"name": "admin",            "description": "Administrative access"},
    {"name": "manager",          "description": "General management"},
    {"name": "hr_manager",       "description": "HR module management"},
    {"name": "project_manager",  "description": "Project module management"},
    {"name": "finance_manager",  "description": "Finance module management"},
    {"name": "employee",         "description": "Standard employee access"},
    {"name": "viewer",           "description": "Read-only access"},
]

# (codename, name, module)
PERMISSIONS: list[tuple[str, str, str]] = [
    # auth
    ("auth.view_users",     "View Users",        "auth"),
    ("auth.create_users",   "Create Users",      "auth"),
    ("auth.edit_users",     "Edit Users",        "auth"),
    ("auth.delete_users",   "Delete Users",      "auth"),
    ("auth.manage_roles",   "Manage Roles",      "auth"),
    # employees
    ("employees.view",      "View Employees",    "employees"),
    ("employees.create",    "Create Employees",  "employees"),
    ("employees.edit",      "Edit Employees",    "employees"),
    ("employees.delete",    "Delete Employees",  "employees"),
    # attendance
    ("attendance.view",     "View Attendance",   "attendance"),
    ("attendance.manage",   "Manage Attendance", "attendance"),
    # leave
    ("leave.view",          "View Leave",        "leave"),
    ("leave.approve",       "Approve Leave",     "leave"),
    ("leave.manage",        "Manage Leave",      "leave"),
    # clients
    ("clients.view",        "View Clients",      "clients"),
    ("clients.create",      "Create Clients",    "clients"),
    ("clients.edit",        "Edit Clients",      "clients"),
    ("clients.delete",      "Delete Clients",    "clients"),
    # projects
    ("projects.view",       "View Projects",     "projects"),
    ("projects.create",     "Create Projects",   "projects"),
    ("projects.edit",       "Edit Projects",     "projects"),
    ("projects.delete",     "Delete Projects",   "projects"),
    ("projects.tasks",      "Manage Tasks",      "projects"),
    # finance
    ("finance.view_invoices",    "View Invoices",    "finance"),
    ("finance.create_invoices",  "Create Invoices",  "finance"),
    ("finance.edit_invoices",    "Edit Invoices",    "finance"),
    ("finance.delete_invoices",  "Delete Invoices",  "finance"),
    ("finance.view_payments",    "View Payments",    "finance"),
    ("finance.manage_payments",  "Manage Payments",  "finance"),
    ("finance.view_expenses",    "View Expenses",    "finance"),
    ("finance.approve_expenses", "Approve Expenses", "finance"),
    # purchase orders
    ("po.view",             "View POs",          "purchase_orders"),
    ("po.create",           "Create POs",        "purchase_orders"),
    ("po.edit",             "Edit POs",          "purchase_orders"),
    ("po.approve",          "Approve POs",       "purchase_orders"),
    # contracts
    ("contracts.view",      "View Contracts",    "contracts"),
    ("contracts.create",    "Create Contracts",  "contracts"),
    ("contracts.edit",      "Edit Contracts",    "contracts"),
    # documents
    ("documents.view",      "View Documents",    "documents"),
    ("documents.upload",    "Upload Documents",  "documents"),
    ("documents.delete",    "Delete Documents",  "documents"),
    # ai
    ("ai.chat",             "Use AI Chat",       "ai"),
    ("ai.predictions",      "View Predictions",  "ai"),
    # system
    ("system.audit_logs",   "View Audit Logs",   "system"),
    ("system.notifications","Manage Notifications","system"),
]

# Role → set of permission codenames
ROLE_PERMISSIONS: dict[str, list[str]] = {
    "super_admin": [p[0] for p in PERMISSIONS],  # all
    "admin": [
        p[0] for p in PERMISSIONS
        if p[0] not in ("auth.delete_users", "system.audit_logs")
    ],
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
        "finance.view_invoices", "finance.create_invoices",
        "finance.edit_invoices", "finance.delete_invoices",
        "finance.view_payments", "finance.manage_payments",
        "finance.view_expenses", "finance.approve_expenses",
        "po.view", "po.create", "po.edit", "po.approve",
        "contracts.view", "documents.view", "documents.upload",
        "ai.predictions",
    ],
    "employee": [
        "attendance.view", "leave.view",
        "projects.view", "finance.view_expenses",
        "documents.view", "ai.chat",
    ],
    "viewer": [
        "employees.view", "clients.view", "projects.view",
        "finance.view_invoices", "documents.view",
    ],
}


async def seed(session: AsyncSession) -> None:
    from sqlalchemy import select

    # Upsert permissions
    perm_map: dict[str, Permission] = {}
    for codename, name, module in PERMISSIONS:
        result = await session.execute(
            select(Permission).where(Permission.codename == codename)
        )
        perm = result.scalar_one_or_none()
        if not perm:
            perm = Permission(
                id=uuid.uuid4(),
                name=name,
                codename=codename,
                module=module,
            )
            session.add(perm)
        perm_map[codename] = perm

    await session.flush()

    # Upsert roles
    for role_data in ROLES:
        result = await session.execute(
            select(Role).where(Role.name == role_data["name"])
        )
        role = result.scalar_one_or_none()
        if not role:
            role = Role(id=uuid.uuid4(), **role_data)
            session.add(role)
        await session.flush()

        # Sync permissions directly through association table
        allowed_codes = set(ROLE_PERMISSIONS.get(role_data["name"], []))
        permission_ids = [perm_map[c].id for c in allowed_codes if c in perm_map]

        await session.execute(
            role_permissions.delete().where(role_permissions.c.role_id == role.id)
        )

        for permission_id in permission_ids:
            await session.execute(
                role_permissions.insert().values(
                    role_id=role.id,
                    permission_id=permission_id,
                )
            )

    # Create default superadmin user
    result = await session.execute(
        select(User).where(User.email == "superadmin@nevark.com")
    )
    admin_user = result.scalar_one_or_none()

    if not admin_user:
        admin_user = User(
            id=uuid.uuid4(),
            email="superadmin@nevark.com",
            full_name="Nevark Super Admin",
            hashed_password=hash_password("admin123"),
            is_verified=True,
            is_active=True,
        )
        session.add(admin_user)
        await session.flush()

        result = await session.execute(
            select(Role).where(Role.name == "super_admin")
        )
        super_admin_role = result.scalar_one_or_none()

        if super_admin_role:
            await session.execute(
                user_roles.insert().values(
                    user_id=admin_user.id,
                    role_id=super_admin_role.id,
                )
            )

    # Seed departments
    DEPARTMENTS = [
        "Engineering",
        "Human Resources",
        "Finance",
        "Sales",
        "Operations",
        "Marketing",
    ]
    for dept_name in DEPARTMENTS:
        result = await session.execute(
            select(Department).where(Department.name == dept_name)
        )
        if not result.scalar_one_or_none():
            session.add(Department(id=uuid.uuid4(), name=dept_name))
    await session.flush()


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await seed(session)
        await session.commit()

if __name__ == "__main__":
    asyncio.run(main())
