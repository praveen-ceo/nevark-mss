"""
Seed script — roles, permissions, and default accounts.
Run: python -m app.db.seed
"""

import asyncio
import uuid
import os
from datetime import date

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.models.auth import User, Permission, Role, role_permissions, user_roles
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
from app.models.enums import EmploymentType
from app.core.security import hash_password

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

ROLES: list[dict] = [
    {"name": "super_admin",     "description": "Full system access"},
    {"name": "admin",           "description": "Administrative access"},
    {"name": "ceo",             "description": "Chief Executive Officer — full access"},
    {"name": "cto",             "description": "Chief Technology Officer"},
    {"name": "cfo",             "description": "Chief Financial Officer"},
    {"name": "manager",         "description": "General management"},
    {"name": "hr_manager",      "description": "HR module management"},
    {"name": "project_manager", "description": "Project module management"},
    {"name": "finance_manager", "description": "Finance module management"},
    {"name": "employee",        "description": "Standard employee access"},
    {"name": "viewer",          "description": "Read-only access"},
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
    # products
    ("products.view",         "View Products",        "products"),
    ("products.create",       "Create Products",      "products"),
    ("products.edit",         "Edit Products",        "products"),
    ("products.delete",       "Delete Products",      "products"),
    ("products.view_revenue", "View Product Revenue", "products"),
]

_ALL = [p[0] for p in PERMISSIONS]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "super_admin": _ALL,
    "admin": [p for p in _ALL if p not in ("auth.delete_users", "system.audit_logs")],
    "ceo": _ALL,
    "cto": [
        "employees.view", "employees.create", "employees.edit",
        "attendance.view", "attendance.manage",
        "leave.view", "leave.approve", "leave.manage",
        "clients.view", "clients.create", "clients.edit",
        "projects.view", "projects.create", "projects.edit", "projects.delete", "projects.tasks",
        "documents.view", "documents.upload",
        "ai.chat", "ai.predictions",
        "system.notifications",
        "products.view", "products.create", "products.edit", "products.view_revenue",
    ],
    "cfo": [
        "clients.view",
        "finance.view_invoices", "finance.create_invoices", "finance.edit_invoices", "finance.delete_invoices",
        "finance.view_payments", "finance.manage_payments",
        "finance.view_expenses", "finance.approve_expenses",
        "po.view", "po.create", "po.edit", "po.approve",
        "contracts.view", "contracts.create", "contracts.edit",
        "documents.view", "documents.upload",
        "ai.chat", "ai.predictions",
        "system.notifications",
        "products.view", "products.view_revenue",
    ],
    "manager": [
        "employees.view", "attendance.view", "leave.view", "leave.approve",
        "clients.view", "clients.create", "clients.edit",
        "projects.view", "projects.create", "projects.edit", "projects.tasks",
        "finance.view_invoices", "finance.view_payments", "finance.view_expenses",
        "finance.approve_expenses", "contracts.view", "documents.view",
        "documents.upload", "ai.chat", "ai.predictions",
        "products.view", "products.create", "products.edit", "products.view_revenue",
    ],
    "hr_manager": [
        "employees.view", "employees.create", "employees.edit",
        "attendance.view", "attendance.manage",
        "leave.view", "leave.approve", "leave.manage",
        "documents.view", "documents.upload",
        "products.view",
    ],
    "project_manager": [
        "clients.view", "projects.view", "projects.create",
        "projects.edit", "projects.tasks", "employees.view",
        "finance.view_invoices", "finance.view_expenses",
        "documents.view", "documents.upload", "ai.chat", "ai.predictions",
        "products.view",
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
        "products.view", "products.view_revenue",
    ],
    "employee": [
        "attendance.view", "leave.view",
        "projects.view", "finance.view_expenses",
        "documents.view", "ai.chat",
        "products.view",
    ],
    "viewer": [
        "employees.view", "clients.view", "projects.view",
        "finance.view_invoices", "documents.view",
        "products.view",
    ],
}

# ---------------------------------------------------------------------------
# Default accounts: (email, full_name, password, role_name, emp_code, first, last, title)
# ---------------------------------------------------------------------------

DEFAULT_ACCOUNTS = [
    {
        "email":      "superadmin@nevark.com",
        "full_name":  "Nevark Super Admin",
        "password":   "admin123",
        "role":       "super_admin",
        "emp_code":   None,          # superadmin has no Employee row
        "first_name": None,
        "last_name":  None,
        "job_title":  None,
    },
    {
        "email":      "ceopraveen@nevark.in",
        "full_name":  "Praveen CEO",
        "password":   "ceonrk1@",
        "role":       "ceo",
        "emp_code":   "CEO2026001",
        "first_name": "Praveen",
        "last_name":  "CEO",
        "job_title":  "Chief Executive Officer",
    },
    {
        "email":      "ctonikhil@nevark.in",
        "full_name":  "Nikhil CTO",
        "password":   "ctonrk1@",
        "role":       "cto",
        "emp_code":   "CTO2026001",
        "first_name": "Nikhil",
        "last_name":  "CTO",
        "job_title":  "Chief Technology Officer",
    },
    {
        "email":      "cfonevark@nevark.in",
        "full_name":  "Nevark CFO",
        "password":   "cfonevark1@",
        "role":       "cfo",
        "emp_code":   "CFO2026001",
        "first_name": "Nevark",
        "last_name":  "CFO",
        "job_title":  "Chief Financial Officer",
    },
]

DEPARTMENTS = [
    "Engineering", "Human Resources", "Finance",
    "Sales", "Operations", "Marketing",
]


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------

async def seed(session: AsyncSession) -> None:
    from sqlalchemy import select

    # --- Permissions ---
    perm_map: dict[str, Permission] = {}
    for codename, name, module in PERMISSIONS:
        perm = await session.scalar(select(Permission).where(Permission.codename == codename))
        if not perm:
            perm = Permission(id=uuid.uuid4(), name=name, codename=codename, module=module)
            session.add(perm)
        perm_map[codename] = perm
    await session.flush()

    # --- Roles + permission links ---
    role_map: dict[str, Role] = {}
    for role_data in ROLES:
        role = await session.scalar(select(Role).where(Role.name == role_data["name"]))
        if not role:
            role = Role(id=uuid.uuid4(), **role_data)
            session.add(role)
        await session.flush()
        role_map[role_data["name"]] = role

        allowed_codes = set(ROLE_PERMISSIONS.get(role_data["name"], []))
        await session.execute(role_permissions.delete().where(role_permissions.c.role_id == role.id))
        for code in allowed_codes:
            if code in perm_map:
                await session.execute(
                    role_permissions.insert().values(role_id=role.id, permission_id=perm_map[code].id)
                )

    # --- Default accounts ---
    today = date.today()
    for acct in DEFAULT_ACCOUNTS:
        existing = await session.scalar(select(User).where(User.email == acct["email"]))
        if not existing:
            user = User(
                id=uuid.uuid4(),
                email=acct["email"],
                full_name=acct["full_name"],
                hashed_password=hash_password(acct["password"]),
                is_verified=True,
                is_active=True,
            )
            session.add(user)
            await session.flush()

            # Assign role
            r = role_map.get(acct["role"])
            if r:
                await session.execute(
                    user_roles.insert().values(user_id=user.id, role_id=r.id)
                )

            # Create Employee row for C-suite accounts
            if acct["emp_code"]:
                emp_exists = await session.scalar(
                    select(Employee).where(Employee.employee_code == acct["emp_code"])
                )
                if not emp_exists:
                    emp = Employee(
                        id=uuid.uuid4(),
                        user_id=user.id,
                        employee_code=acct["emp_code"],
                        first_name=acct["first_name"],
                        last_name=acct["last_name"],
                        job_title=acct["job_title"],
                        employment_type=EmploymentType.FULL_TIME,
                        hire_date=today,
                    )
                    session.add(emp)
                    await session.flush()

    # --- Departments ---
    for dept_name in DEPARTMENTS:
        exists = await session.scalar(select(Department).where(Department.name == dept_name))
        if not exists:
            session.add(Department(id=uuid.uuid4(), name=dept_name))
    await session.flush()


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await seed(session)
        await session.commit()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
