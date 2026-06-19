"""Dashboard analytics service — aggregates across all modules."""
from __future__ import annotations

from datetime import date, timedelta

import structlog
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee
from app.models.enums import (
    EmploymentType,
    ExpenseStatus,
    InvoiceStatus,
    ProjectStatus,
    TaskStatus,
)
from app.models.finance import Expense, Invoice, Payment
from app.models.project import Milestone, Project, ProjectTask
from app.schemas.analytics import (
    ActivityItem,
    DashboardAnalytics,
    DeadlineItem,
    EmploymentTypeCount,
    MonthlyRevenue,
    StatusCount,
)
from app.services import finance as finance_svc
from app.services import tasks as tasks_svc

log = structlog.get_logger(__name__)

# Status display names
_PROJECT_STATUS_LABELS = {
    ProjectStatus.PLANNING:  "Planning",
    ProjectStatus.ACTIVE:    "Active",
    ProjectStatus.ON_HOLD:   "On Hold",
    ProjectStatus.COMPLETED: "Completed",
    ProjectStatus.CANCELLED: "Cancelled",
}

_EMP_TYPE_LABELS = {
    EmploymentType.FULL_TIME:  "Full-time",
    EmploymentType.PART_TIME:  "Part-time",
    EmploymentType.CONTRACT:   "Contract",
    EmploymentType.INTERN:     "Intern",
}


async def get_dashboard(db: AsyncSession) -> DashboardAnalytics:
    today = date.today()

    # -----------------------------------------------------------------------
    # 1. Finance KPIs — reuse existing service (5 queries inside)
    # -----------------------------------------------------------------------
    finance_data = await finance_svc.get_dashboard(db)

    # -----------------------------------------------------------------------
    # 2. Monthly revenue — last 6 calendar months (paid invoices + expenses)
    # -----------------------------------------------------------------------
    months_back = 6
    month_start = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
    # go back months_back-1 more months
    for _ in range(months_back - 1):
        month_start = (month_start - timedelta(days=1)).replace(day=1)

    rev_rows = await db.execute(
        select(
            func.date_trunc("month", Invoice.created_at).label("mo"),
            func.sum(Invoice.total_amount).label("rev"),
        )
        .where(Invoice.status == InvoiceStatus.PAID)
        .where(Invoice.is_active == True)
        .where(Invoice.created_at >= month_start)
        .group_by(text("mo"))
        .order_by(text("mo"))
    )
    rev_map = {row.mo.date().replace(day=1): row.rev for row in rev_rows.all()}

    exp_rows = await db.execute(
        select(
            func.date_trunc("month", Expense.created_at).label("mo"),
            func.sum(Expense.amount).label("exp"),
        )
        .where(Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]))
        .where(Expense.is_active == True)
        .where(Expense.created_at >= month_start)
        .group_by(text("mo"))
        .order_by(text("mo"))
    )
    exp_map = {row.mo.date().replace(day=1): row.exp for row in exp_rows.all()}

    monthly_revenue: list[MonthlyRevenue] = []
    cursor = month_start
    for _ in range(months_back):
        rev = rev_map.get(cursor, 0) or 0
        exp = exp_map.get(cursor, 0) or 0
        monthly_revenue.append(MonthlyRevenue(
            month=cursor.strftime("%b %Y"),
            revenue=rev,
            expenses=exp,
            profit=rev - exp,
        ))
        # advance one month
        nxt = cursor.replace(day=28) + timedelta(days=4)
        cursor = nxt.replace(day=1)

    # -----------------------------------------------------------------------
    # 3. Project KPIs
    # -----------------------------------------------------------------------
    proj_status_rows = await db.execute(
        select(Project.status, func.count(Project.id))
        .where(Project.is_active == True)
        .group_by(Project.status)
    )
    proj_counts = {row[0]: row[1] for row in proj_status_rows.all()}
    total_projects = sum(proj_counts.values())
    active_projects = proj_counts.get(ProjectStatus.ACTIVE, 0)

    overdue_projects = await db.scalar(
        select(func.count(Project.id))
        .where(Project.is_active == True)
        .where(Project.end_date < today)
        .where(Project.status.notin_([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]))
    ) or 0

    project_by_status = [
        StatusCount(status=_PROJECT_STATUS_LABELS.get(s, s.value), count=c)
        for s, c in proj_counts.items()
    ]

    # -----------------------------------------------------------------------
    # 4. Task KPIs — reuse existing service
    # -----------------------------------------------------------------------
    tasks_data = await tasks_svc.get_dashboard(db)

    # -----------------------------------------------------------------------
    # 5. Employee KPIs
    # -----------------------------------------------------------------------
    month_first = today.replace(day=1)

    total_employees = await db.scalar(
        select(func.count(Employee.id))
        .where(Employee.is_active == True)
        .where(Employee.termination_date == None)
    ) or 0

    new_hires = await db.scalar(
        select(func.count(Employee.id))
        .where(Employee.is_active == True)
        .where(Employee.hire_date >= month_first)
    ) or 0

    emp_type_rows = await db.execute(
        select(Employee.employment_type, func.count(Employee.id))
        .where(Employee.is_active == True)
        .where(Employee.termination_date == None)
        .group_by(Employee.employment_type)
    )
    employees_by_type = [
        EmploymentTypeCount(
            employment_type=_EMP_TYPE_LABELS.get(row[0], row[0].value),
            count=row[1],
        )
        for row in emp_type_rows.all()
    ]

    # -----------------------------------------------------------------------
    # 6. Upcoming deadlines — projects with end_date in next 30 days
    # -----------------------------------------------------------------------
    deadline_rows = await db.execute(
        select(Project)
        .options(selectinload(Project.client))
        .where(Project.is_active == True)
        .where(Project.end_date >= today)
        .where(Project.end_date <= today + timedelta(days=30))
        .where(Project.status.notin_([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]))
        .order_by(Project.end_date.asc())
        .limit(6)
    )
    upcoming_deadlines = [
        DeadlineItem(
            project_id=p.id,
            name=p.name,
            client_name=p.client.name if p.client else None,
            end_date=p.end_date,
            days_left=(p.end_date - today).days,
            status=p.status.value,
        )
        for p in deadline_rows.scalars().all()
        if p.end_date is not None
    ]

    # -----------------------------------------------------------------------
    # 7. Recent activity — last 10 events across Invoice / Project / Task
    # -----------------------------------------------------------------------
    recent_invoices = await db.execute(
        select(Invoice.id, Invoice.invoice_number, Invoice.status, Invoice.created_at)
        .where(Invoice.is_active == True)
        .order_by(Invoice.created_at.desc())
        .limit(4)
    )
    recent_projects = await db.execute(
        select(Project.id, Project.name, Project.status, Project.created_at)
        .where(Project.is_active == True)
        .order_by(Project.created_at.desc())
        .limit(3)
    )
    recent_tasks = await db.execute(
        select(ProjectTask.id, ProjectTask.title, ProjectTask.status, ProjectTask.created_at)
        .where(ProjectTask.is_active == True)
        .order_by(ProjectTask.created_at.desc())
        .limit(4)
    )

    activity_raw: list[ActivityItem] = []
    for row in recent_invoices.all():
        activity_raw.append(ActivityItem(
            entity_type="invoice",
            entity_id=row[0],
            description=f"Invoice {row[1]} — {row[2].value}",
            occurred_at=row[3],
        ))
    for row in recent_projects.all():
        activity_raw.append(ActivityItem(
            entity_type="project",
            entity_id=row[0],
            description=f"Project \"{row[1]}\" — {row[2].value.replace('_', ' ')}",
            occurred_at=row[3],
        ))
    for row in recent_tasks.all():
        activity_raw.append(ActivityItem(
            entity_type="task",
            entity_id=row[0],
            description=f"Task \"{row[1]}\" — {row[2].value.replace('_', ' ')}",
            occurred_at=row[3],
        ))

    activity_raw.sort(key=lambda a: a.occurred_at, reverse=True)
    recent_activity = activity_raw[:10]

    return DashboardAnalytics(
        finance=finance_data,
        monthly_revenue=monthly_revenue,
        total_projects=total_projects,
        active_projects=active_projects,
        overdue_projects=overdue_projects,
        project_by_status=project_by_status,
        tasks=tasks_data,
        total_employees=total_employees,
        new_hires_this_month=new_hires,
        employees_by_type=employees_by_type,
        recent_activity=recent_activity,
        upcoming_deadlines=upcoming_deadlines,
    )
