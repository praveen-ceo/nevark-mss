from __future__ import annotations

import re
from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Attendance, Employee
from app.models.finance import Invoice
from app.models.client import Client
from app.models.product import Product
from app.models.project import Project, ProjectTask
from app.models.enums import (
    InvoiceStatus, ProjectStatus, TaskStatus,
)

# ---------------------------------------------------------------------------
# Intent detection
# ---------------------------------------------------------------------------
_INTENT_PATTERNS: list[tuple[str, list[str]]] = [
    ("gst_summary",         ["gst", "cgst", "sgst", "igst", "tax amount"]),
    ("pending_payments",    ["pending payment", "unpaid", "outstanding", "overdue", "amount due", "dues", "pending amount", "pending invoice"]),
    ("top_clients",         ["top client", "best client", "client revenue", "biggest client", "major client"]),
    ("project_finance",     ["project finance", "project profit", "profitable project", "project budget", "project earning", "which project"]),
    ("active_projects",     ["active project", "ongoing project", "current project", "running project"]),
    ("pending_tasks",       ["pending task", "incomplete task", "open task", "todo", "to-do", "unfinished task", "remaining task"]),
    ("attendance_today",    ["attendance today", "who attended", "present today", "today attendance", "checked in today"]),
    ("product_performance", ["product performance", "product stats", "product revenue", "product data", "show product"]),
    ("revenue_summary",     ["revenue", "total revenue", "income", "earnings", "total income"]),
    ("general_help",        []),  # fallback
]

def detect_intent(message: str) -> str:
    lowered = message.lower()
    lowered = re.sub(r"[^\w\s]", " ", lowered)
    for intent, keywords in _INTENT_PATTERNS:
        if not keywords:
            continue
        for kw in keywords:
            if kw in lowered:
                return intent
    return "general_help"


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


# ---------------------------------------------------------------------------
# Data fetchers
# ---------------------------------------------------------------------------

async def fetch_revenue_summary(db: AsyncSession) -> tuple[str, list[dict]]:
    q = await db.execute(
        select(
            func.count(Invoice.id).label("count"),
            func.sum(Invoice.total_amount).label("total"),
            func.sum(Invoice.paid_amount).label("paid"),
        ).where(Invoice.is_active == True)  # noqa: E712
    )
    row = q.one()
    total = float(row.total or 0)
    paid  = float(row.paid  or 0)
    count = row.count or 0
    answer = (
        f"Total invoiced: {_fmt(total)} across {count} invoice(s). "
        f"Collected: {_fmt(paid)}. "
        f"Outstanding: {_fmt(total - paid)}."
    )
    return answer, [{"metric": "Total Invoiced", "value": _fmt(total)},
                    {"metric": "Collected",       "value": _fmt(paid)},
                    {"metric": "Outstanding",     "value": _fmt(total - paid)},
                    {"metric": "Invoice Count",   "value": str(count)}]


async def fetch_pending_payments(db: AsyncSession) -> tuple[str, list[dict]]:
    q = await db.execute(
        select(
            Invoice.invoice_number,
            Invoice.status,
            Invoice.total_amount,
            Invoice.paid_amount,
            Invoice.due_date,
        ).where(
            Invoice.is_active == True,  # noqa: E712
            Invoice.status.in_([
                InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE
            ]),
        ).order_by(Invoice.due_date)
        .limit(20)
    )
    rows = q.all()
    if not rows:
        return "No pending payments found. All invoices are settled.", []
    data = []
    total_due = 0.0
    for r in rows:
        due = float(r.total_amount or 0) - float(r.paid_amount or 0)
        total_due += due
        data.append({
            "Invoice":    r.invoice_number,
            "Status":     r.status.value,
            "Total":      _fmt(r.total_amount),
            "Paid":       _fmt(r.paid_amount),
            "Balance Due": _fmt(due),
            "Due Date":   str(r.due_date) if r.due_date else "—",
        })
    answer = f"Found {len(rows)} pending invoice(s) with total balance due of {_fmt(total_due)}."
    return answer, data


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
        data.append({
            "Project":  p.name,
            "Status":   p.status.value,
            "Budget":   _fmt(budget) if budget else "—",
            "Invoiced": _fmt(invoiced),
            "Variance": _fmt(invoiced - budget) if budget else "—",
        })
    profitable = sum(1 for d in data if d["Variance"] not in ("—",) and float(d["Variance"].replace("₹","").replace(",","")) > 0)
    answer = f"Showing finance for {len(data)} project(s). {profitable} project(s) have invoiced above budget."
    return answer, data


async def fetch_active_projects(db: AsyncSession) -> tuple[str, list[dict]]:
    q = await db.execute(
        select(Project.name, Project.code, Project.status, Project.start_date, Project.end_date, Project.budget)
        .where(Project.is_active == True, Project.status == ProjectStatus.ACTIVE)  # noqa: E712
        .order_by(Project.name)
    )
    rows = q.all()
    if not rows:
        return "No active projects at the moment.", []
    data = [{"Project": r.name, "Code": r.code, "Start": str(r.start_date or "—"),
             "End": str(r.end_date or "—"), "Budget": _fmt(r.budget)} for r in rows]
    return f"There are {len(rows)} active project(s) currently running.", data


async def fetch_pending_tasks(db: AsyncSession, employee_id: str | None = None) -> tuple[str, list[dict]]:
    stmt = (
        select(ProjectTask.title, ProjectTask.status, ProjectTask.priority, ProjectTask.due_date)
        .where(
            ProjectTask.is_active == True,  # noqa: E712
            ProjectTask.status.notin_([TaskStatus.DONE]),
        )
    )
    if employee_id:
        # join to employee to find by id
        emp_q = await db.execute(
            select(Employee.id).where(Employee.user_id == employee_id, Employee.is_active == True)  # noqa: E712
        )
        emp_row = emp_q.scalar_one_or_none()
        if emp_row:
            stmt = stmt.where(ProjectTask.assignee_id == emp_row)

    stmt = stmt.order_by(ProjectTask.due_date).limit(20)
    q = await db.execute(stmt)
    rows = q.all()
    if not rows:
        return "No pending tasks found.", []
    data = [{"Task": r.title, "Status": r.status.value, "Priority": r.priority.value,
             "Due": str(r.due_date) if r.due_date else "—"} for r in rows]
    scope = "your" if employee_id else "all"
    return f"Found {len(rows)} pending task(s) across {scope} assignments.", data


async def fetch_attendance_today(db: AsyncSession, employee_id: str | None = None) -> tuple[str, list[dict]]:
    today = date.today()
    stmt = (
        select(Employee.first_name, Employee.last_name, Attendance.status, Attendance.check_in, Attendance.check_out)
        .join(Employee, Attendance.employee_id == Employee.id)
        .where(Attendance.date == today, Employee.is_active == True)  # noqa: E712
    )
    if employee_id:
        emp_q = await db.execute(
            select(Employee.id).where(Employee.user_id == employee_id, Employee.is_active == True)  # noqa: E712
        )
        emp_row = emp_q.scalar_one_or_none()
        if emp_row:
            stmt = stmt.where(Attendance.employee_id == emp_row)

    q = await db.execute(stmt)
    rows = q.all()
    if not rows:
        return f"No attendance records found for today ({today}).", []
    data = [{"Employee": f"{r.first_name} {r.last_name}", "Status": r.status.value,
             "Check In":  str(r.check_in.strftime("%H:%M")) if r.check_in  else "—",
             "Check Out": str(r.check_out.strftime("%H:%M")) if r.check_out else "—"} for r in rows]
    present = sum(1 for d in data if d["Status"] == "present")
    return f"Today ({today}): {len(rows)} attendance record(s), {present} present.", data


async def fetch_product_performance(db: AsyncSession) -> tuple[str, list[dict]]:
    q = await db.execute(
        select(Product.name, Product.product_code, Product.status,
               Product.revenue_generated, Product.units_sold, Product.total_customers)
        .where(Product.is_active == True)  # noqa: E712
        .order_by(Product.revenue_generated.desc().nulls_last())
        .limit(15)
    )
    rows = q.all()
    if not rows:
        return "No product data available.", []
    data = [{"Product": r.name, "Code": r.product_code, "Status": r.status.value,
             "Revenue": _fmt(r.revenue_generated), "Units Sold": str(r.units_sold or "—"),
             "Customers": str(r.total_customers or "—")} for r in rows]
    return f"Showing performance for {len(rows)} product(s), sorted by revenue.", data


async def fetch_top_clients(db: AsyncSession) -> tuple[str, list[dict]]:
    q = await db.execute(
        select(Client.name, func.sum(Invoice.total_amount).label("total"),
               func.count(Invoice.id).label("invoices"))
        .join(Invoice, Invoice.client_id == Client.id)
        .where(Client.is_active == True, Invoice.is_active == True)  # noqa: E712
        .group_by(Client.id, Client.name)
        .order_by(func.sum(Invoice.total_amount).desc())
        .limit(10)
    )
    rows = q.all()
    if not rows:
        return "No client invoice data available yet.", []
    data = [{"Client": r.name, "Total Invoiced": _fmt(r.total), "Invoices": str(r.invoices)} for r in rows]
    return f"Top {len(rows)} client(s) by total invoiced amount.", data


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
    r = q.one()
    cgst = float(r.cgst or 0)
    sgst = float(r.sgst or 0)
    igst = float(r.igst or 0)
    tax  = float(r.tax  or 0)
    total_gst = cgst + sgst + igst
    answer = (
        f"GST summary across {r.count} invoice(s): "
        f"CGST {_fmt(cgst)}, SGST {_fmt(sgst)}, IGST {_fmt(igst)}. "
        f"Total GST collected: {_fmt(total_gst)}. Total tax (all types): {_fmt(tax)}."
    )
    return answer, [
        {"Tax Type": "CGST",      "Amount": _fmt(cgst)},
        {"Tax Type": "SGST",      "Amount": _fmt(sgst)},
        {"Tax Type": "IGST",      "Amount": _fmt(igst)},
        {"Tax Type": "Total GST", "Amount": _fmt(total_gst)},
        {"Tax Type": "All Tax",   "Amount": _fmt(tax)},
    ]


def general_help() -> tuple[str, list[dict]]:
    text = (
        "I can answer questions about your business data. Try asking: "
        "- What is total revenue? (Revenue summary) "
        "- Show pending payments (Outstanding invoices) "
        "- Which projects are active? (Active project list) "
        "- Show project finance (Budget vs invoiced) "
        "- Show pending tasks (Open tasks) "
        "- Who has attendance today? (Today attendance) "
        "- Show product performance (Product metrics) "
        "- Show top clients (Top clients by revenue) "
        "- What is GST amount? (Tax summary)"
    )
    return text, []
