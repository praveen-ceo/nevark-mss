from __future__ import annotations

import os
import re
from datetime import date
from typing import Any

from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentCategory
from app.models.employee import Attendance, Department, Employee
from app.models.finance import Expense, Invoice
from app.models.client import Client
from app.models.project import Project, ProjectTask
from app.models.enums import (
    AttendanceStatus, InvoiceStatus, ProjectStatus, TaskStatus,
)

# ---------------------------------------------------------------------------
# Intent detection
# ---------------------------------------------------------------------------
_INTENT_PATTERNS: list[tuple[str, list[str]]] = [
    ("revenue_this_month", [
        "revenue this month", "income this month", "earnings this month",
        "this month revenue", "monthly revenue", "month revenue",
        "how much this month", "how much income this month",
        "current month revenue", "revenue for this month",
    ]),
    ("total_revenue", [
        "total revenue", "all time revenue", "overall revenue",
        "total income", "total earnings", "revenue summary",
        "revenue total", "how much revenue",
    ]),
    ("overdue_invoices", [
        "overdue invoice", "overdue payment", "overdue bill",
        "past due", "late payment", "unpaid overdue",
    ]),
    ("pending_invoices", [
        "pending invoice", "unpaid invoice", "outstanding invoice",
        "pending payment", "unpaid payment", "outstanding payment",
        "amount due", "outstanding amount", "pending bill",
    ]),
    ("finance_summary", [
        "finance summary", "financial summary", "financial overview",
        "money summary", "cash summary", "income expense summary",
        "profit summary", "net profit", "overall finance",
    ]),
    ("top_clients", [
        "top client", "best client", "biggest client", "major client",
        "client revenue", "highest revenue client", "client ranking",
    ]),
    ("top_projects", [
        "top project", "best project", "most profitable project",
        "highest project", "project revenue", "project ranking",
        "project earning",
    ]),
    ("delayed_projects", [
        "delayed project", "overdue project", "late project",
        "behind schedule", "past deadline", "project delay",
        "which project delayed", "projects past due",
        "projects are delayed", "projects delayed", "project is delayed",
    ]),
    ("active_projects", [
        "active project", "ongoing project", "current project",
        "running project", "in progress project",
    ]),
    ("project_summary", [
        "project summary", "project overview", "project status summary",
        "how many project", "total project", "project count",
    ]),
    ("absent_today", [
        "absent today", "who is absent", "who absent", "absent employee",
        "not present today", "absentee", "who didn't come",
    ]),
    ("attendance_today", [
        "attendance today", "who attended", "present today",
        "today attendance", "checked in today", "who is present",
        "attendance report",
    ]),
    ("employee_count", [
        "employee count", "how many employee", "total employee",
        "staff count", "headcount", "workforce count",
        "number of employee", "employee strength",
    ]),
    ("pending_tasks", [
        "pending task", "incomplete task", "open task",
        "todo", "to-do", "unfinished task", "remaining task",
        "task pending", "tasks due",
    ]),
    ("document_summary", [
        "document summary", "file summary", "document count",
        "how many document", "total document", "document overview",
        "storage summary",
    ]),
    ("gst_summary", [
        "gst", "cgst", "sgst", "igst", "tax amount",
        "tax summary", "gst amount", "tax collected",
    ]),
    ("project_finance", [
        "project finance", "project budget", "project profit",
        "budget vs", "which project earns",
    ]),
    ("product_performance", [
        "product performance", "product stats", "product revenue",
        "product data", "show product",
    ]),
]


# ---------------------------------------------------------------------------
# Business signals — used both by detect_intent and classifier
# ---------------------------------------------------------------------------
_BUSINESS_SIGNALS = {
    "revenue", "invoice", "invoic", "payment", "client", "project", "task",
    "employee", "attendance", "document", "expense", "gst", "finance",
    "dashboard", "nevark", "mss", "hr", "operations", "proposal",
    "email", "business", "profit", "budget", "tax", "income", "sales",
    "collection", "billing", "startup", "company", "team", "leave",
    "absent", "present", "overdue", "pending", "accounts", "audit",
}


def is_business_or_mss_question(message: str) -> bool:
    """Return True if the message is about business, finance, or MSS operations."""
    q = message.lower()
    return any(sig in q for sig in _BUSINESS_SIGNALS)


def detect_intent(message: str) -> str:  # noqa: PLR0911
    """
    Hybrid intent detector.
    Layer 1: Boolean combination rules — more flexible than exact substrings.
    Layer 2: Substring pattern fallback (_INTENT_PATTERNS).
    Layer 3: general_ai catch-all.
    """
    q = re.sub(r"[^\w\s]", " ", message.lower())

    # ── Boolean combination rules (checked first, order matters) ──────────

    # revenue_this_month: any revenue/income/sales word + any month word
    _rev  = ("revenue", "income", "sales", "invoic", "collection", "earning")
    _mon  = ("this month", "month", "monthly", "current month")
    if any(w in q for w in _rev) and any(w in q for w in _mon):
        return "revenue_this_month"

    # finance_summary: profit / overall finance keywords
    if any(w in q for w in ("net profit", "overall finance", "financial overview",
                             "finance summary", "financial summary", "profit summary",
                             "income expense", "cash summary")):
        return "finance_summary"

    # overdue — must come before pending (more specific)
    if any(w in q for w in ("overdue", "past due", "late payment", "unpaid overdue")):
        if any(w in q for w in ("invoice", "bill", "payment", "amount")):
            return "overdue_invoices"

    # pending invoices
    if any(w in q for w in ("pending", "unpaid", "outstanding")) and        any(w in q for w in ("invoice", "bill", "payment", "amount", "due")):
        return "pending_invoices"

    # absent today — before attendance (more specific)
    if ("absent" in q or "didn't come" in q or "not present" in q or "absentee" in q):
        return "absent_today"

    # attendance today
    if any(w in q for w in ("attendance", "who attended", "present today",
                             "checked in", "who is present")):
        return "attendance_today"

    # delayed / behind-schedule projects
    if any(w in q for w in ("delayed", "behind schedule", "past deadline",
                             "overdue project", "late project")):
        return "delayed_projects"

    # employee / headcount
    if any(w in q for w in ("how many employee", "employee count", "staff count",
                             "headcount", "workforce", "number of employee",
                             "total employee", "employee strength")):
        return "employee_count"

    # top clients — before general client queries
    if any(w in q for w in ("top client", "best client", "highest revenue client",
                             "biggest client", "major client", "client ranking",
                             "client revenue", "highest client", "clients have highest")):
        return "top_clients"

    # ── Substring pattern fallback ─────────────────────────────────────────
    for intent, keywords in _INTENT_PATTERNS:
        for kw in keywords:
            if kw in q:
                return intent

    return "general_ai"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fmt(val: Any) -> str:
    if val is None:
        return "—"
    try:
        return f"₹{float(val):,.2f}"
    except (TypeError, ValueError):
        return str(val)


def _s(val: Any) -> str:
    return str(val) if val is not None else "—"


# ---------------------------------------------------------------------------
# 1. Revenue this month
# ---------------------------------------------------------------------------
async def fetch_revenue_this_month(db: AsyncSession) -> tuple[str, list[dict]]:
    today = date.today()
    q = await db.execute(
        select(
            func.count(Invoice.id).label("count"),
            func.sum(Invoice.total_amount).label("total"),
            func.sum(Invoice.paid_amount).label("paid"),
        ).where(
            Invoice.is_active == True,  # noqa: E712
            extract("year",  Invoice.issue_date) == today.year,
            extract("month", Invoice.issue_date) == today.month,
        )
    )
    row     = q.one()
    total   = float(row.total or 0)
    paid    = float(row.paid  or 0)
    pending = total - paid
    count   = row.count or 0
    month_label = today.strftime("%B %Y")
    follow_up = " Follow-up is recommended if due dates are approaching." if pending > 0 else " Collections are on track."
    answer = (
        f"This month ({month_label}), Nevark has generated {_fmt(total)} in invoiced revenue "
        f"across {count} invoice(s). "
        f"Total received: {_fmt(paid)}. Pending collection: {_fmt(pending)}.{follow_up}"
    )
    return answer, [
        {"Metric": "Month",           "Value": month_label},
        {"Metric": "Total Invoiced",  "Value": _fmt(total)},
        {"Metric": "Total Received",  "Value": _fmt(paid)},
        {"Metric": "Pending Amount",  "Value": _fmt(pending)},
        {"Metric": "Invoice Count",   "Value": _s(count)},
    ]


# ---------------------------------------------------------------------------
# 2. Total revenue (all time)
# ---------------------------------------------------------------------------
async def fetch_total_revenue(db: AsyncSession) -> tuple[str, list[dict]]:
    q = await db.execute(
        select(
            func.count(Invoice.id).label("count"),
            func.sum(Invoice.total_amount).label("total"),
            func.sum(Invoice.paid_amount).label("paid"),
        ).where(Invoice.is_active == True)  # noqa: E712
    )
    row     = q.one()
    total   = float(row.total or 0)
    paid    = float(row.paid  or 0)
    pending = total - paid
    count   = row.count or 0
    collection_rate = round((paid / total * 100), 1) if total > 0 else 0.0
    answer = (
        f"Across all time, Nevark has invoiced {_fmt(total)} through {count} invoice(s). "
        f"Total collected: {_fmt(paid)} ({collection_rate}% collection rate). "
        f"Outstanding balance: {_fmt(pending)}."
    )
    return answer, [
        {"Metric": "Total Invoiced",       "Value": _fmt(total)},
        {"Metric": "Total Received",       "Value": _fmt(paid)},
        {"Metric": "Pending Amount",       "Value": _fmt(pending)},
        {"Metric": "Total Invoice Count",  "Value": _s(count)},
    ]


# ---------------------------------------------------------------------------
# 3. Pending invoices (SENT / PARTIAL)
# ---------------------------------------------------------------------------
async def fetch_pending_invoices(db: AsyncSession) -> tuple[str, list[dict]]:
    q = await db.execute(
        select(
            Invoice.invoice_number,
            Client.name.label("client"),
            Invoice.total_amount,
            Invoice.paid_amount,
            Invoice.due_date,
        )
        .join(Client, Invoice.client_id == Client.id)
        .where(
            Invoice.is_active == True,  # noqa: E712
            Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.PARTIAL]),
        )
        .order_by(Invoice.due_date)
        .limit(20)
    )
    rows = q.all()
    if not rows:
        return "No pending invoices found. All invoices are settled.", []
    data, total_outstanding = [], 0.0
    for r in rows:
        outstanding       = float(r.total_amount or 0) - float(r.paid_amount or 0)
        total_outstanding += outstanding
        data.append({
            "Invoice #":   r.invoice_number,
            "Client":      r.client,
            "Total":       _fmt(r.total_amount),
            "Paid":        _fmt(r.paid_amount),
            "Outstanding": _fmt(outstanding),
            "Due Date":    _s(r.due_date),
        })
    # Find highest outstanding for the summary sentence
    if data:
        top = max(data, key=lambda d: float(d["Outstanding"].replace("₹","").replace(",","") or 0))
        top_note = (
            f" The largest outstanding is {top['Invoice #']} from {top['Client']} "
            f"for {top['Outstanding']}."
        )
    else:
        top_note = ""
    return (
        f"There are {len(rows)} pending invoice(s) with a total outstanding amount of "
        f"{_fmt(total_outstanding)}.{top_note}",
        data,
    )


# ---------------------------------------------------------------------------
# 4. Overdue invoices
# ---------------------------------------------------------------------------
async def fetch_overdue_invoices(db: AsyncSession) -> tuple[str, list[dict]]:
    today = date.today()
    q = await db.execute(
        select(
            Invoice.invoice_number,
            Client.name.label("client"),
            Invoice.total_amount,
            Invoice.paid_amount,
            Invoice.due_date,
        )
        .join(Client, Invoice.client_id == Client.id)
        .where(
            Invoice.is_active == True,  # noqa: E712
            Invoice.status == InvoiceStatus.OVERDUE,
        )
        .order_by(Invoice.due_date)
        .limit(20)
    )
    rows = q.all()
    if not rows:
        return "No overdue invoices. All outstanding amounts are within due dates.", []
    data = []
    for r in rows:
        outstanding  = float(r.total_amount or 0) - float(r.paid_amount or 0)
        days_overdue = (today - r.due_date).days if r.due_date else 0
        data.append({
            "Invoice #":    r.invoice_number,
            "Client":       r.client,
            "Outstanding":  _fmt(outstanding),
            "Due Date":     _s(r.due_date),
            "Days Overdue": _s(days_overdue),
        })
    total_ov = sum(float(d["Outstanding"].replace("₹","").replace(",","") or 0) for d in data)
    return (
        f"{len(rows)} invoice(s) are overdue with a combined outstanding of {_fmt(total_ov)}. "
        f"Immediate follow-up is recommended to recover these receivables.",
        data,
    )


# ---------------------------------------------------------------------------
# 5. Top clients (by total invoiced)
# ---------------------------------------------------------------------------
async def fetch_top_clients(db: AsyncSession) -> tuple[str, list[dict]]:
    q = await db.execute(
        select(
            Client.name,
            func.sum(Invoice.total_amount).label("total"),
            func.count(Invoice.id).label("invoices"),
        )
        .join(Invoice, Invoice.client_id == Client.id)
        .where(Client.is_active == True, Invoice.is_active == True)  # noqa: E712
        .group_by(Client.id, Client.name)
        .order_by(func.sum(Invoice.total_amount).desc())
        .limit(5)
    )
    rows = q.all()
    if not rows:
        return "No client invoice data available yet.", []
    data = [
        {"Client": r.name, "Total Revenue": _fmt(r.total), "Invoice Count": _s(r.invoices)}
        for r in rows
    ]
    top_name = rows[0].name if rows else "—"
    top_val  = _fmt(rows[0].total) if rows else "—"
    return (
        f"Here are the top {len(rows)} client(s) by total invoiced revenue. "
        f"{top_name} leads with {top_val} invoiced.",
        data,
    )


# ---------------------------------------------------------------------------
# 6. Top projects (by invoiced amount)
# ---------------------------------------------------------------------------
async def fetch_top_projects(db: AsyncSession) -> tuple[str, list[dict]]:
    q = await db.execute(
        select(
            Project.name.label("project"),
            Client.name.label("client"),
            func.sum(Invoice.total_amount).label("total_invoiced"),
            func.sum(Invoice.paid_amount).label("total_received"),
        )
        .join(Invoice, Invoice.project_id == Project.id)
        .outerjoin(Client, Project.client_id == Client.id)
        .where(Project.is_active == True, Invoice.is_active == True)  # noqa: E712
        .group_by(Project.id, Project.name, Client.name)
        .order_by(func.sum(Invoice.total_amount).desc())
        .limit(5)
    )
    rows = q.all()
    if not rows:
        return "No project invoice data available yet.", []
    data = [
        {
            "Project":        r.project,
            "Client":         r.client or "—",
            "Total Invoiced": _fmt(r.total_invoiced),
            "Total Received": _fmt(r.total_received),
        }
        for r in rows
    ]
    return f"Top {len(rows)} project(s) by invoiced amount.", data


# ---------------------------------------------------------------------------
# 7. Active projects
# ---------------------------------------------------------------------------
async def fetch_active_projects(db: AsyncSession) -> tuple[str, list[dict]]:
    q = await db.execute(
        select(Project.name, Client.name.label("client"), Project.status, Project.start_date, Project.end_date)
        .outerjoin(Client, Project.client_id == Client.id)
        .where(Project.is_active == True, Project.status == ProjectStatus.ACTIVE)  # noqa: E712
        .order_by(Project.name)
    )
    rows = q.all()
    if not rows:
        return "No active projects at the moment.", []
    data = [
        {
            "Project":    r.name,
            "Client":     r.client or "—",
            "Status":     r.status.value,
            "Start Date": _s(r.start_date),
            "End Date":   _s(r.end_date),
        }
        for r in rows
    ]
    return f"There are {len(rows)} active project(s) currently running.", data


# ---------------------------------------------------------------------------
# 8. Delayed projects
# ---------------------------------------------------------------------------
async def fetch_delayed_projects(db: AsyncSession) -> tuple[str, list[dict]]:
    today = date.today()
    q = await db.execute(
        select(Project.name, Client.name.label("client"), Project.end_date)
        .outerjoin(Client, Project.client_id == Client.id)
        .where(
            Project.is_active == True,  # noqa: E712
            Project.end_date < today,
            Project.status.notin_([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]),
        )
        .order_by(Project.end_date)
    )
    rows = q.all()
    if not rows:
        return "No delayed projects. All active projects are within their deadlines.", []
    data = [
        {
            "Project":      r.name,
            "Client":       r.client or "—",
            "End Date":     _s(r.end_date),
            "Days Delayed": _s((today - r.end_date).days) if r.end_date else "—",
        }
        for r in rows
    ]
    return (
        f"{len(rows)} project(s) are past their end date and not yet completed. "
        f"These require immediate attention or timeline revision.",
        data,
    )


# ---------------------------------------------------------------------------
# 9. Employee count
# ---------------------------------------------------------------------------
async def fetch_employee_count(db: AsyncSession) -> tuple[str, list[dict]]:
    total_q  = await db.execute(select(func.count(Employee.id)))
    total    = total_q.scalar_one() or 0
    active_q = await db.execute(
        select(func.count(Employee.id)).where(Employee.is_active == True)  # noqa: E712
    )
    active   = active_q.scalar_one() or 0
    inactive = total - active
    return (
        f"Total employees: {total} ({active} active, {inactive} inactive).",
        [
            {"Metric": "Total Employees",    "Value": _s(total)},
            {"Metric": "Active Employees",   "Value": _s(active)},
            {"Metric": "Inactive Employees", "Value": _s(inactive)},
        ],
    )


# ---------------------------------------------------------------------------
# 10. Attendance today (summary + per-employee detail)
# ---------------------------------------------------------------------------
async def fetch_attendance_today(
    db: AsyncSession, employee_id: str | None = None
) -> tuple[str, list[dict]]:
    today = date.today()
    stmt  = (
        select(
            Employee.first_name, Employee.last_name,
            Attendance.status, Attendance.check_in, Attendance.check_out,
        )
        .join(Employee, Attendance.employee_id == Employee.id)
        .where(Attendance.date == today, Employee.is_active == True)  # noqa: E712
    )
    if employee_id:
        emp_q = await db.execute(
            select(Employee.id).where(
                Employee.user_id == employee_id, Employee.is_active == True  # noqa: E712
            )
        )
        emp_row = emp_q.scalar_one_or_none()
        if emp_row:
            stmt = stmt.where(Attendance.employee_id == emp_row)

    q    = await db.execute(stmt)
    rows = q.all()
    if not rows:
        return f"No attendance records found for today ({today}).", []

    present  = sum(1 for r in rows if r.status == AttendanceStatus.PRESENT)
    late     = sum(1 for r in rows if r.status == AttendanceStatus.LATE)
    on_leave = sum(1 for r in rows if r.status == AttendanceStatus.ON_LEAVE)
    absent   = sum(1 for r in rows if r.status == AttendanceStatus.ABSENT)

    data = [
        {
            "Employee":  f"{r.first_name} {r.last_name}",
            "Status":    r.status.value,
            "Check In":  r.check_in.strftime("%H:%M")  if r.check_in  else "—",
            "Check Out": r.check_out.strftime("%H:%M") if r.check_out else "—",
        }
        for r in rows
    ]
    return (
        f"Today ({today}): {len(rows)} record(s) — "
        f"{present} present, {late} late, {on_leave} on leave, {absent} absent.",
        data,
    )


# ---------------------------------------------------------------------------
# 11. Absent today
# ---------------------------------------------------------------------------
async def fetch_absent_today(db: AsyncSession) -> tuple[str, list[dict]]:
    today = date.today()
    q = await db.execute(
        select(
            Employee.first_name, Employee.last_name,
            Employee.employee_code,
            Department.name.label("department"),
        )
        .join(Attendance, Attendance.employee_id == Employee.id)
        .outerjoin(Department, Employee.department_id == Department.id)
        .where(
            Attendance.date   == today,
            Attendance.status == AttendanceStatus.ABSENT,
            Employee.is_active == True,  # noqa: E712
        )
        .order_by(Employee.first_name)
    )
    rows = q.all()
    if not rows:
        return f"No employees marked absent today ({today}).", []
    data = [
        {
            "Employee Name": f"{r.first_name} {r.last_name}",
            "Code":          r.employee_code,
            "Department":    r.department or "—",
        }
        for r in rows
    ]
    return (
        f"{len(rows)} employee(s) are marked absent today ({today}). "
        f"HR may wish to follow up for attendance regularisation.",
        data,
    )


# ---------------------------------------------------------------------------
# 12. Pending tasks
# ---------------------------------------------------------------------------
async def fetch_pending_tasks(
    db: AsyncSession, employee_id: str | None = None
) -> tuple[str, list[dict]]:
    stmt = (
        select(
            ProjectTask.title,
            Project.name.label("project"),
            Employee.first_name, Employee.last_name,
            ProjectTask.due_date, ProjectTask.priority, ProjectTask.status,
        )
        .outerjoin(Project,  ProjectTask.project_id  == Project.id)
        .outerjoin(Employee, ProjectTask.assignee_id == Employee.id)
        .where(
            ProjectTask.is_active == True,  # noqa: E712
            ProjectTask.status.notin_([TaskStatus.DONE]),
        )
    )
    if employee_id:
        emp_q = await db.execute(
            select(Employee.id).where(
                Employee.user_id == employee_id, Employee.is_active == True  # noqa: E712
            )
        )
        emp_row = emp_q.scalar_one_or_none()
        if emp_row:
            stmt = stmt.where(ProjectTask.assignee_id == emp_row)

    stmt = stmt.order_by(ProjectTask.due_date).limit(20)
    q    = await db.execute(stmt)
    rows = q.all()
    if not rows:
        return "No pending tasks found.", []
    data = [
        {
            "Task":     r.title,
            "Project":  r.project or "—",
            "Assignee": f"{r.first_name} {r.last_name}" if r.first_name else "Unassigned",
            "Due Date": _s(r.due_date),
            "Priority": r.priority.value,
            "Status":   r.status.value,
        }
        for r in rows
    ]
    scope = "your" if employee_id else "all"
    return f"Found {len(rows)} pending task(s) across {scope} assignments.", data


# ---------------------------------------------------------------------------
# 13. Finance summary
# ---------------------------------------------------------------------------
async def fetch_finance_summary(db: AsyncSession) -> tuple[str, list[dict]]:
    inv_q = await db.execute(
        select(
            func.sum(Invoice.total_amount).label("total"),
            func.sum(Invoice.paid_amount).label("paid"),
            func.sum(Invoice.total_amount).filter(
                Invoice.status == InvoiceStatus.OVERDUE
            ).label("overdue_amt"),
        ).where(Invoice.is_active == True)  # noqa: E712
    )
    ir         = inv_q.one()
    total_inv  = float(ir.total       or 0)
    total_paid = float(ir.paid        or 0)
    overdue    = float(ir.overdue_amt or 0)
    pending    = total_inv - total_paid

    exp_q  = await db.execute(
        select(func.sum(Expense.amount)).where(Expense.is_active == True)  # noqa: E712
    )
    expenses   = float(exp_q.scalar_one() or 0)
    net_profit = total_paid - expenses

    health = "positive" if net_profit >= 0 else "negative"
    answer = (
        f"Financial overview — Total invoiced: {_fmt(total_inv)}, "
        f"collected: {_fmt(total_paid)}, pending: {_fmt(pending)}, overdue: {_fmt(overdue)}. "
        f"Total expenses: {_fmt(expenses)}. Net profit is {_fmt(net_profit)} ({health}). "
        + ("Strong financial health." if net_profit > 0 else "Cost review is recommended.")
    )
    return answer, [
        {"Metric": "Total Invoiced", "Value": _fmt(total_inv)},
        {"Metric": "Total Received", "Value": _fmt(total_paid)},
        {"Metric": "Pending",        "Value": _fmt(pending)},
        {"Metric": "Overdue",        "Value": _fmt(overdue)},
        {"Metric": "Total Expenses", "Value": _fmt(expenses)},
        {"Metric": "Net Profit",     "Value": _fmt(net_profit)},
    ]


# ---------------------------------------------------------------------------
# 14. Project summary
# ---------------------------------------------------------------------------
async def fetch_project_summary(db: AsyncSession) -> tuple[str, list[dict]]:
    today = date.today()

    total_q = await db.execute(
        select(func.count(Project.id)).where(Project.is_active == True)  # noqa: E712
    )
    total = total_q.scalar_one() or 0

    active_q = await db.execute(
        select(func.count(Project.id))
        .where(Project.is_active == True, Project.status == ProjectStatus.ACTIVE)  # noqa: E712
    )
    active = active_q.scalar_one() or 0

    completed_q = await db.execute(
        select(func.count(Project.id))
        .where(Project.is_active == True, Project.status == ProjectStatus.COMPLETED)  # noqa: E712
    )
    completed = completed_q.scalar_one() or 0

    delayed_q = await db.execute(
        select(func.count(Project.id))
        .where(
            Project.is_active == True,  # noqa: E712
            Project.end_date < today,
            Project.status.notin_([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]),
        )
    )
    delayed = delayed_q.scalar_one() or 0

    return (
        f"Projects: {total} total, {active} active, {completed} completed, {delayed} delayed.",
        [
            {"Metric": "Total Projects",     "Value": _s(total)},
            {"Metric": "Active Projects",    "Value": _s(active)},
            {"Metric": "Completed Projects", "Value": _s(completed)},
            {"Metric": "Delayed Projects",   "Value": _s(delayed)},
        ],
    )


# ---------------------------------------------------------------------------
# 15. Document summary
# ---------------------------------------------------------------------------
async def fetch_document_summary(db: AsyncSession) -> tuple[str, list[dict]]:
    total_q = await db.execute(
        select(func.count(Document.id)).where(Document.is_active == True)  # noqa: E712
    )
    total = total_q.scalar_one() or 0

    recent_q = await db.execute(
        select(func.count(Document.id))
        .where(
            Document.is_active == True,  # noqa: E712
            func.date(Document.created_at) >= func.current_date() - 7,
        )
    )
    recent = recent_q.scalar_one() or 0

    cat_q = await db.execute(
        select(DocumentCategory.name, func.count(Document.id).label("cnt"))
        .join(Document, Document.category_id == DocumentCategory.id)
        .where(Document.is_active == True)  # noqa: E712
        .group_by(DocumentCategory.id, DocumentCategory.name)
        .order_by(func.count(Document.id).desc())
    )
    cats = cat_q.all()

    data = [
        {"Metric": "Total Documents", "Value": _s(total)},
        {"Metric": "Recent Uploads (7d)", "Value": _s(recent)},
    ]
    for c in cats:
        data.append({"Metric": f"Category: {c.name}", "Value": _s(c.cnt)})
    return f"Total documents: {total}. Recent uploads (last 7 days): {recent}.", data


# ---------------------------------------------------------------------------
# Legacy helpers kept for backward compatibility
# ---------------------------------------------------------------------------
async def fetch_project_finance(db: AsyncSession) -> tuple[str, list[dict]]:
    proj_q = await db.execute(
        select(Project.id, Project.name, Project.budget, Project.status)
        .where(Project.is_active == True)  # noqa: E712
        .order_by(Project.name)
        .limit(20)
    )
    projects = proj_q.all()
    if not projects:
        return "No projects found.", []
    project_ids = [p.id for p in projects]
    inv_q = await db.execute(
        select(Invoice.project_id, func.sum(Invoice.total_amount).label("invoiced"))
        .where(Invoice.project_id.in_(project_ids), Invoice.is_active == True)  # noqa: E712
        .group_by(Invoice.project_id)
    )
    invoiced_map = {str(r.project_id): float(r.invoiced or 0) for r in inv_q.all()}
    data = []
    for p in projects:
        budget   = float(p.budget or 0)
        invoiced = invoiced_map.get(str(p.id), 0.0)
        variance = invoiced - budget if budget else None
        data.append({
            "Project":  p.name,
            "Status":   p.status.value,
            "Budget":   _fmt(budget) if budget else "—",
            "Invoiced": _fmt(invoiced),
            "Variance": _fmt(variance) if variance is not None else "—",
        })
    return f"Showing finance for {len(data)} project(s).", data


async def fetch_gst_summary(db: AsyncSession) -> tuple[str, list[dict]]:
    q = await db.execute(
        select(
            func.sum(Invoice.cgst_amount).label("cgst"),
            func.sum(Invoice.sgst_amount).label("sgst"),
            func.sum(Invoice.igst_amount).label("igst"),
            func.sum(Invoice.tax_amount).label("tax"),
            func.count(Invoice.id).label("count"),
        ).where(Invoice.is_active == True)  # noqa: E712
    )
    r         = q.one()
    cgst      = float(r.cgst or 0)
    sgst      = float(r.sgst or 0)
    igst      = float(r.igst or 0)
    tax       = float(r.tax  or 0)
    total_gst = cgst + sgst + igst
    answer    = (
        f"GST across {r.count} invoice(s): "
        f"CGST {_fmt(cgst)}, SGST {_fmt(sgst)}, IGST {_fmt(igst)}. "
        f"Total GST: {_fmt(total_gst)}."
    )
    return answer, [
        {"Tax Type": "CGST",      "Amount": _fmt(cgst)},
        {"Tax Type": "SGST",      "Amount": _fmt(sgst)},
        {"Tax Type": "IGST",      "Amount": _fmt(igst)},
        {"Tax Type": "Total GST", "Amount": _fmt(total_gst)},
        {"Tax Type": "All Tax",   "Amount": _fmt(tax)},
    ]


async def fetch_product_performance(db: AsyncSession) -> tuple[str, list[dict]]:
    from app.models.product import Product
    q = await db.execute(
        select(
            Product.name, Product.product_code, Product.status,
            Product.revenue_generated, Product.units_sold, Product.total_customers,
        )
        .where(Product.is_active == True)  # noqa: E712
        .order_by(Product.revenue_generated.desc().nulls_last())
        .limit(15)
    )
    rows = q.all()
    if not rows:
        return "No product data available.", []
    data = [
        {
            "Product":    r.name,
            "Code":       r.product_code,
            "Status":     r.status.value,
            "Revenue":    _fmt(r.revenue_generated),
            "Units Sold": _s(r.units_sold),
            "Customers":  _s(r.total_customers),
        }
        for r in rows
    ]
    return f"Showing performance for {len(rows)} product(s), sorted by revenue.", data


# ---------------------------------------------------------------------------
# Built-in fallback answers (no API key needed)
# ---------------------------------------------------------------------------
_BUILTIN_TOPICS: list[tuple[list[str], str]] = [
    (
        ["docker", "container", "kubernetes", "deploy", "deployment"],
        """Docker is a containerisation platform that packages your application and its dependencies
into a portable container — so it runs identically in development, testing, and production.

For Nevark MSS deployment:
• Backend (FastAPI): packaged as a Docker container with Python, Alembic migrations, and Uvicorn.
• Frontend (Next.js): built into a standalone Docker image served on port 3000.
• PostgreSQL: runs as a separate container with a persistent volume.
• All three services are orchestrated via docker-compose.prod.yml.

Quick start: docker-compose -f docker-compose.prod.yml up -d --build

For detailed steps, refer to the README-DEPLOYMENT.md in your project root.""",
    ),
    (
        ["gst", "cgst", "sgst", "igst", "tax filing", "gst filing", "gst return"],
        """GST (Goods and Services Tax) — India's unified indirect tax system.

Key components on invoices:
• CGST (Central GST) — collected by the Centre; applies on intra-state sales.
• SGST (State GST) — collected by the State; applies on intra-state sales.
• IGST (Integrated GST) — applies on inter-state sales (replaces CGST + SGST).

Standard rates: 0%, 5%, 12%, 18%, 28%
Most IT/software services: 18% GST.

For Nevark MSS invoices:
• Intra-state client: charge CGST 9% + SGST 9%.
• Inter-state client: charge IGST 18%.
• File GSTR-1 (outward supplies) by the 11th of next month.
• File GSTR-3B (monthly summary) by the 20th of next month.

Tip: Maintain GST registration number (GSTIN) for all clients to enable ITC (Input Tax Credit).""",
    ),
    (
        ["email", "draft email", "write email", "payment follow", "follow-up", "client email"],
        """Here is a professional payment follow-up email template:

Subject: Payment Follow-Up — Invoice [Invoice Number] | [Company Name]

Dear [Client Name],

I hope this message finds you well.

I am writing to follow up on Invoice [Invoice Number] dated [Invoice Date] for ₹[Amount], which was due on [Due Date].

As of today, we have not yet received the payment. Could you please confirm the status and let us know the expected payment date?

If there are any concerns or if you need a revised copy of the invoice, please do not hesitate to reach out.

We value our partnership and look forward to your prompt response.

Warm regards,
[Your Name]
[Your Designation]
Nevark | [Contact Number]

---
Tip: Send this 2–3 days after the due date. For overdue invoices, follow up weekly.""",
    ),
    (
        ["revenue collection", "improve revenue", "improve collection", "increase revenue",
         "collect payment", "better collection", "recover payment"],
        """Practical steps to improve revenue collection for Nevark MSS clients:

1. Invoice immediately — raise invoices the same day service is delivered.
2. Set clear payment terms — Net 15 or Net 30. Add late fees for overdue accounts.
3. Automated reminders — use the AI Assistant to flag overdue invoices weekly.
4. Partial payment milestones — for large projects, break payments into milestone-linked invoices.
5. Offer multiple payment methods — bank transfer, UPI, cheque.
6. Follow up proactively — contact clients 3 days before due date, not after.
7. Escalation path — if overdue > 30 days, escalate to senior contact.
8. Track overdue metrics — use the "Overdue Invoices" report in the AI Assistant regularly.

Target: Keep Days Sales Outstanding (DSO) below 30 days for healthy cash flow.""",
    ),
    (
        ["project plan", "project proposal", "write proposal", "project template"],
        """Standard project plan structure for Nevark MSS projects:

1. Project Overview
   — Name, client, objective, timeline, budget.

2. Scope of Work
   — Deliverables, milestones, out-of-scope items.

3. Timeline
   — Phase 1: Discovery (Week 1–2)
   — Phase 2: Development (Week 3–8)
   — Phase 3: UAT & QA (Week 9–10)
   — Phase 4: Deployment (Week 11)

4. Resource Plan
   — Team members, roles, estimated hours per phase.

5. Budget Breakdown
   — Development cost, infrastructure, contingency (10–15%).

6. Risk & Mitigation
   — Identify top 3 risks and mitigation strategies.

7. Payment Schedule
   — 30% on kickoff, 40% on mid-milestone, 30% on delivery.

Tip: Create this project in Nevark MSS to track milestones and invoices in one place.""",
    ),
    (
        ["revenue", "invoice", "finance", "billing", "payment", "collection"],
        """Here are some business intelligence questions you can ask me about your MSS data:

• "What is the revenue this month?" — Monthly invoiced and collected amounts.
• "Show pending invoices" — All unpaid invoices with due dates.
• "Show overdue invoices" — Invoices past their due date.
• "Finance summary" — Full P&L snapshot: invoiced, collected, expenses, profit.
• "Top clients" — Clients ranked by total revenue.
• "Top projects" — Projects ranked by invoiced amount.
• "GST summary" — CGST, SGST, IGST breakdown across all invoices.

I have live access to your Nevark MSS database for all these queries.""",
    ),
]


def _builtin_fallback(message: str) -> str | None:
    """Return a built-in answer if the message matches a known topic, else None."""
    q = message.lower()
    for keywords, answer in _BUILTIN_TOPICS:
        if any(kw in q for kw in keywords):
            return answer
    return None


# ---------------------------------------------------------------------------
# General AI fallback (OpenAI if configured, else built-in answers)
# ---------------------------------------------------------------------------
async def general_ai_response(message: str) -> tuple[str, list[dict]]:
    # ── Try OpenAI first ──────────────────────────────────────────────────
    try:
        from app.core.config import settings
        api_key = getattr(settings, "OPENAI_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            raise ValueError("No API key")

        from openai import AsyncOpenAI
        oai    = AsyncOpenAI(api_key=api_key)
        model  = getattr(settings, "OPENAI_MODEL", "gpt-4o") or "gpt-4o"
        resp   = await oai.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are the Nevark Business Intelligence Assistant — a professional, "
                        "CEO-friendly AI advisor for an Indian business management platform "
                        "called Nevark MSS. "
                        "Your tone is concise, practical, and action-oriented. "
                        "Focus on business operations, finance, projects, HR, GST, and strategy. "
                        "Use ₹ (INR) for currency. Keep responses under 300 words unless asked otherwise. "
                        "Do not start responses with 'I' or 'As an AI'. "
                        "Speak directly as an expert advisor."
                    ),
                },
                {"role": "user", "content": message},
            ],
            max_tokens=600,
            temperature=0.35,
        )
        answer = resp.choices[0].message.content or "I could not generate a response."
        return answer, []

    except Exception:
        pass

    # ── Built-in topic answers (no API key needed) ────────────────────────
    builtin = _builtin_fallback(message)
    if builtin:
        return builtin, []

    # ── Final catch-all ───────────────────────────────────────────────────
    return (
        "Here are the business intelligence queries I can answer from your live MSS data:\n\n"
        "• Revenue this month / total revenue\n"
        "• Pending invoices / overdue invoices\n"
        "• Finance summary (P&L snapshot)\n"
        "• Top clients / top projects\n"
        "• Active projects / delayed projects\n"
        "• Pending tasks\n"
        "• Attendance today / who is absent today\n"
        "• Employee count\n"
        "• GST summary\n"
        "• Document summary\n\n"
        "For open-ended business questions (like drafting emails or explaining Docker), "
        "configure OPENAI_API_KEY in your .env file.",
        [],
    )
