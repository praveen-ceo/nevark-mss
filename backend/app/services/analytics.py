# ============================================================
# Nevark Technologies Pvt. Ltd.
# All rights reserved © 2026 Nevark Technologies.
# Unauthorized use, reproduction, or distribution of this
# code is strictly prohibited.
# Module  : analytics.py
# Author  : Development Team
# Created : 2026-09-05 15:08:00
# ============================================================

"""Dashboard analytics service — aggregates across all modules.

Enhancement 1 — Organisational Filtering:
  Accepts optional group_id and business_unit_id parameters.
  Resolves descendant department IDs via application-level BFS traversal
  (see app.core.org). No recursive SQL CTEs used.

  Filter semantics by metric:
    - Finance (revenue/expenses): Project.department_id IN dept_ids
                                  / Employee.department_id IN dept_ids
    - Projects: Project.department_id IN dept_ids
    - Tasks: ProjectTask.assignee_id → Employee.department_id IN dept_ids
    - Employees: Employee.department_id IN dept_ids

  LIMITATION — Recent Activity feed:
    The activity feed is backed by Notifications. Notification records
    have no reliable organisational attribution. The feed remains global
    (unfiltered) regardless of the org filter selected.

  LIMITATION — Unattributed projects:
    Projects with department_id = NULL are valid baseline records.
    They appear in the global (no-filter) view but are excluded from
    organisation-filtered project/finance metrics. This is the authoritative
    documented behaviour for Enhancement 1.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Optional
import statistics
import structlog
from sqlalchemy import func, select, text, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.org import collect_descendant_ids, is_descendant_of, load_all_departments
from app.models.employee import Employee
from app.models.enums import (
    EmploymentType,
    ExpenseStatus,
    InvoiceStatus,
    ProjectStatus,
    TaskStatus,
    MilestoneStatus,
    PaymentStatus,
)
from app.models.finance import Expense, Invoice, Payment
from app.models.project import Milestone, Project, ProjectTask
from app.schemas.analytics import (
    ActivityItem,
    DashboardAnalytics,
    DeadlineItem,
    EmploymentTypeCount,
    ExpenseAnomaly,
    MonthlyRevenue,
    ProjectRisk,
    StatusCount,
    CashFlowPoint,
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


async def resolve_dept_ids(
    db: AsyncSession,
    group_id: Optional[uuid.UUID],
    business_unit_id: Optional[uuid.UUID],
) -> Optional[set[uuid.UUID]]:
    """Resolve the effective department ID set for the given filter parameters.

    Returns:
      None         — no filter; global view
      set[UUID]    — the root ID plus all descendant IDs to filter on

    Raises ValueError if business_unit_id does not belong to group_id.
    """
    if group_id is None and business_unit_id is None:
        return None

    all_depts = await load_all_departments(db)

    if group_id is not None and business_unit_id is not None:
        if not is_descendant_of(all_depts, business_unit_id, group_id):
            raise ValueError(
                "business_unit_id does not belong to the selected group_id"
            )
        # BU filter takes precedence — narrows to BU subtree within group
        return collect_descendant_ids(all_depts, business_unit_id)

    if business_unit_id is not None:
        return collect_descendant_ids(all_depts, business_unit_id)

    # group_id only
    return collect_descendant_ids(all_depts, group_id)


async def get_dashboard(
    db: AsyncSession,
    group_id: Optional[uuid.UUID] = None,
    business_unit_id: Optional[uuid.UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> DashboardAnalytics:
    today = date.today()

    # Resolve the set of department IDs to filter on (None = no filter)
    dept_ids = await resolve_dept_ids(db, group_id, business_unit_id)

    # -----------------------------------------------------------------------
    # 1. Finance KPIs — reuse existing service (with dept_ids filter)
    # -----------------------------------------------------------------------
    finance_data = await finance_svc.get_dashboard(
        db, dept_ids=dept_ids, start_date=start_date, end_date=end_date
    )

    # -----------------------------------------------------------------------
    # 2. Monthly revenue
    # -----------------------------------------------------------------------
    if start_date and end_date:
        # Custom range: show all months covered by the range
        months_back = 0
        cursor = end_date.replace(day=1)
        start_month = start_date.replace(day=1)
        
        # Guard against absurdly large ranges in UI by capping it to e.g. 60 months
        while cursor >= start_month and months_back < 60:
            months_back += 1
            if cursor.month == 1:
                cursor = cursor.replace(year=cursor.year - 1, month=12)
            else:
                cursor = cursor.replace(month=cursor.month - 1)
                
        month_start = start_month
        if months_back == 0:
            months_back = 1
            month_start = end_date.replace(day=1)
    else:
        # Frozen E1 behaviour
        months_back = 6
        month_start = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
        for _ in range(months_back - 1):
            month_start = (month_start - timedelta(days=1)).replace(day=1)

    rev_q = (
        select(
            func.date_trunc("month", Invoice.issue_date).label("mo"),
            func.sum(Invoice.total_amount).label("rev"),
        )
        .where(Invoice.status == InvoiceStatus.PAID)
        .where(Invoice.is_active == True)
    )
    if start_date and end_date:
        # For the chart, we must include all data up to the end_date month,
        # but also bound it so it matches the custom range calculation.
        # However, custom range month buckets should span month_start to end_date.
        rev_q = rev_q.where(Invoice.issue_date >= month_start).where(Invoice.issue_date < end_date + timedelta(days=1))
    else:
        rev_q = rev_q.where(Invoice.issue_date >= month_start)
        
    if dept_ids is not None:
        rev_q = (
            rev_q
            .join(Project, Project.id == Invoice.project_id)
            .where(Project.department_id.in_(dept_ids))
        )
    rev_rows = await db.execute(
        rev_q.group_by(text("mo")).order_by(text("mo"))
    )
    rev_map = {row.mo.date().replace(day=1): row.rev for row in rev_rows.all()}

    exp_q = (
        select(
            func.date_trunc("month", Expense.date).label("mo"),
            func.sum(Expense.amount).label("exp"),
        )
        .where(Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]))
        .where(Expense.is_active == True)
    )
    
    if start_date and end_date:
        exp_q = exp_q.where(Expense.date >= month_start).where(Expense.date < end_date + timedelta(days=1))
    else:
        exp_q = exp_q.where(Expense.date >= month_start)
        
    if dept_ids is not None:
        exp_q = (
            exp_q
            .join(Employee, Employee.id == Expense.employee_id)
            .where(Employee.department_id.in_(dept_ids))
        )
    exp_rows = await db.execute(
        exp_q.group_by(text("mo")).order_by(text("mo"))
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
        nxt = cursor.replace(day=28) + timedelta(days=4)
        cursor = nxt.replace(day=1)

    # -----------------------------------------------------------------------
    # 2b. Enhancement 7: Cash Flow Forecasting
    # -----------------------------------------------------------------------
    current_month_start = today.replace(day=1)
    base_month_3 = (current_month_start - timedelta(days=1)).replace(day=1)
    base_month_2 = (base_month_3 - timedelta(days=1)).replace(day=1)
    base_month_1 = (base_month_2 - timedelta(days=1)).replace(day=1)
    
    query_start = min(month_start, base_month_1)
    if start_date and end_date:
        query_end = max(end_date + timedelta(days=1), current_month_start)
    else:
        query_end = (current_month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        
    cf_in_q = (
        select(
            func.date_trunc("month", Payment.payment_date).label("mo"),
            func.sum(Payment.amount).label("inflow"),
        )
        .where(Payment.status == PaymentStatus.COMPLETED)
        .where(Payment.payment_date >= query_start)
        .where(Payment.payment_date < query_end)
    )
    if dept_ids is not None:
        cf_in_q = (
            cf_in_q
            .join(Invoice, Invoice.id == Payment.invoice_id)
            .join(Project, Project.id == Invoice.project_id)
            .where(Project.department_id.in_(dept_ids))
        )
    cf_in_rows = await db.execute(cf_in_q.group_by(text("mo")))
    inflow_map = {row.mo.date().replace(day=1): row.inflow for row in cf_in_rows.all() if row.mo}

    cf_out_q = (
        select(
            func.date_trunc("month", Expense.date).label("mo"),
            func.sum(Expense.amount).label("outflow"),
        )
        .where(Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]))
        .where(Expense.is_active == True)
        .where(Expense.date >= query_start)
        .where(Expense.date < query_end)
    )
    if dept_ids is not None:
        cf_out_q = (
            cf_out_q
            .join(Employee, Employee.id == Expense.employee_id)
            .where(Employee.department_id.in_(dept_ids))
        )
    cf_out_rows = await db.execute(cf_out_q.group_by(text("mo")))
    outflow_map = {row.mo.date().replace(day=1): row.outflow for row in cf_out_rows.all() if row.mo}

    cash_flow: list[CashFlowPoint] = []
    
    cf_cursor = month_start
    for _ in range(months_back):
        inf = float(inflow_map.get(cf_cursor, 0) or 0)
        outf = float(outflow_map.get(cf_cursor, 0) or 0)
        cash_flow.append(CashFlowPoint(
            month=cf_cursor.strftime("%b %Y"),
            inflow=inf,
            outflow=outf,
            net_cash=inf - outf,
            is_forecast=False
        ))
        cf_cursor = (cf_cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
        
    base_inf_1 = float(inflow_map.get(base_month_1, 0) or 0)
    base_out_1 = float(outflow_map.get(base_month_1, 0) or 0)
    base_inf_2 = float(inflow_map.get(base_month_2, 0) or 0)
    base_out_2 = float(outflow_map.get(base_month_2, 0) or 0)
    base_inf_3 = float(inflow_map.get(base_month_3, 0) or 0)
    base_out_3 = float(outflow_map.get(base_month_3, 0) or 0)
    
    total_base = base_inf_1 + base_out_1 + base_inf_2 + base_out_2 + base_inf_3 + base_out_3
    forecast_available = total_base > 0
    
    if forecast_available:
        avg_inf = (base_inf_1 + base_inf_2 + base_inf_3) / 3.0
        avg_out = (base_out_1 + base_out_2 + base_out_3) / 3.0
        
        fc_cursor = current_month_start
        for _ in range(3):
            cash_flow.append(CashFlowPoint(
                month=fc_cursor.strftime("%b %Y"),
                inflow=avg_inf,
                outflow=avg_out,
                net_cash=avg_inf - avg_out,
                is_forecast=True
            ))
            fc_cursor = (fc_cursor.replace(day=28) + timedelta(days=4)).replace(day=1)

    # -----------------------------------------------------------------------
    # 3. Project KPIs — filtered by Project.department_id
    # -----------------------------------------------------------------------
    proj_q = (
        select(Project.status, func.count(Project.id))
        .where(Project.is_active == True)
    )
    if start_date and end_date:
        from sqlalchemy import or_
        proj_q = proj_q.where(Project.start_date <= end_date).where(
            or_(Project.end_date >= start_date, Project.end_date.is_(None))
        )
        
    if dept_ids is not None:
        proj_q = proj_q.where(Project.department_id.in_(dept_ids))
    proj_status_rows = await db.execute(proj_q.group_by(Project.status))
    proj_counts = {row[0]: row[1] for row in proj_status_rows.all()}
    total_projects = sum(proj_counts.values())
    active_projects = proj_counts.get(ProjectStatus.ACTIVE, 0)

    overdue_q = (
        select(func.count(Project.id))
        .where(Project.is_active == True)
        .where(Project.end_date < today)
        .where(Project.status.notin_([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]))
    )
    if start_date and end_date:
        from sqlalchemy import or_
        overdue_q = overdue_q.where(Project.start_date <= end_date).where(
            or_(Project.end_date >= start_date, Project.end_date.is_(None))
        )
        
    if dept_ids is not None:
        overdue_q = overdue_q.where(Project.department_id.in_(dept_ids))
    overdue_projects = await db.scalar(overdue_q) or 0

    project_by_status = [
        StatusCount(status=_PROJECT_STATUS_LABELS.get(s, s.value), count=c)
        for s, c in proj_counts.items()
    ]

    # --- Enhancement 5: Project Risk Indicators ---
    # 1. Fetch eligible projects
    risk_base_q = (
        select(Project.id, Project.name, Project.end_date, Project.budget)
        .where(Project.status.in_([ProjectStatus.PLANNING, ProjectStatus.ACTIVE]))
        .where(Project.is_active == True)
    )
    if start_date and end_date:
        risk_base_q = risk_base_q.where(Project.start_date <= end_date).where(
            or_(Project.end_date >= start_date, Project.end_date.is_(None))
        )
    if dept_ids is not None:
        risk_base_q = risk_base_q.where(Project.department_id.in_(dept_ids))
        
    eligible_projs = await db.execute(risk_base_q)
    proj_rows = eligible_projs.all()
    project_ids = [r.id for r in proj_rows]
    
    project_risks = []
    if project_ids:
        # 2. Grouped tasks
        task_q = (
            select(
                ProjectTask.project_id,
                func.sum(case((ProjectTask.status.notin_([TaskStatus.DONE]), 1), else_=0)).label("incomplete"),
                func.sum(case((and_(ProjectTask.due_date < today, ProjectTask.status.notin_([TaskStatus.DONE])), 1), else_=0)).label("overdue"),
                func.sum(case((ProjectTask.status == TaskStatus.BLOCKED, 1), else_=0)).label("blocked"),
            )
            .where(ProjectTask.project_id.in_(project_ids))
            .where(ProjectTask.is_active == True)
            .group_by(ProjectTask.project_id)
        )
        task_rows = await db.execute(task_q)
        task_map = {r.project_id: {"inc": r.incomplete or 0, "over": r.overdue or 0, "blk": r.blocked or 0} for r in task_rows.all()}
        
        # 3. Grouped milestones
        ms_q = (
            select(
                Milestone.project_id,
                func.sum(case((and_(Milestone.due_date < today, Milestone.status != MilestoneStatus.COMPLETED), 1), else_=0)).label("overdue_ms")
            )
            .where(Milestone.project_id.in_(project_ids))
            .where(Milestone.is_active == True)
            .group_by(Milestone.project_id)
        )
        ms_rows = await db.execute(ms_q)
        ms_map = {r.project_id: r.overdue_ms or 0 for r in ms_rows.all()}
        
        # 4. Grouped expenses
        exp_r_q = (
            select(Expense.project_id, func.sum(Expense.amount).label("total_exp"))
            .where(Expense.project_id.in_(project_ids))
            .where(Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]))
            .where(Expense.is_active == True)
            .group_by(Expense.project_id)
        )
        exp_rows = await db.execute(exp_r_q)
        exp_map = {r.project_id: r.total_exp or 0 for r in exp_rows.all()}
        
        for p in proj_rows:
            p_id = p.id
            t_data = task_map.get(p_id, {"inc": 0, "over": 0, "blk": 0})
            ms_over = ms_map.get(p_id, 0)
            p_exp = exp_map.get(p_id, 0)
            
            reasons = []
            level = "ON TRACK"
            severity = 0 # 0=ON TRACK, 1=MEDIUM, 2=HIGH, 3=CRITICAL
            
            # Evaluate CRITICAL
            if p.end_date and p.end_date < today:
                reasons.append("Project end date is in the past")
                severity = max(severity, 3)
                
            # Evaluate HIGH
            if ms_over >= 1:
                reasons.append(f"{ms_over} overdue milestone(s)")
                severity = max(severity, 2)
            if p.end_date and (p.end_date - today).days <= 7 and (p.end_date - today).days >= 0 and t_data["inc"] >= 1:
                reasons.append(f"Deadline in {(p.end_date - today).days} days with {t_data['inc']} incomplete task(s)")
                severity = max(severity, 2)
            if p.budget is not None and p_exp > p.budget:
                reasons.append(f"Expenses (₹{float(p_exp):,.2f}) exceed budget (₹{float(p.budget):,.2f})")
                severity = max(severity, 2)
                
            # Evaluate MEDIUM
            if t_data["over"] >= 3:
                reasons.append(f"{t_data['over']} overdue task(s)")
                severity = max(severity, 1)
            if t_data["blk"] >= 1:
                reasons.append(f"{t_data['blk']} blocked task(s)")
                severity = max(severity, 1)
                
            if severity > 0:
                lvl_str = "CRITICAL" if severity == 3 else "HIGH" if severity == 2 else "MEDIUM"
                project_risks.append(ProjectRisk(
                    project_id=p_id,
                    name=p.name,
                    risk_level=lvl_str,
                    reasons=reasons
                ))
    
    # Sort risks: CRITICAL first, then HIGH, then MEDIUM
    _sev_map = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1}
    project_risks.sort(key=lambda x: _sev_map.get(x.risk_level, 0), reverse=True)

    # -----------------------------------------------------------------------
    # 4. Task KPIs — reuse service (filtered via assignee dept path)
    # -----------------------------------------------------------------------
    tasks_data = await tasks_svc.get_dashboard(
        db, dept_ids=dept_ids, start_date=start_date, end_date=end_date
    )

    # -----------------------------------------------------------------------
    # 5. Employee KPIs — filtered by Employee.department_id
    # -----------------------------------------------------------------------
    month_first = today.replace(day=1)

    emp_q = (
        select(func.count(Employee.id))
        .where(Employee.is_active == True)
    )
    type_q = (
        select(Employee.employment_type, func.count(Employee.id))
        .where(Employee.is_active == True)
    )
    
    if start_date and end_date:
        from sqlalchemy import or_
        emp_q = emp_q.where(Employee.hire_date <= end_date).where(
            or_(Employee.termination_date >= start_date, Employee.termination_date.is_(None))
        )
        type_q = type_q.where(Employee.hire_date <= end_date).where(
            or_(Employee.termination_date >= start_date, Employee.termination_date.is_(None))
        )
    else:
        emp_q = emp_q.where(Employee.termination_date.is_(None))
        type_q = type_q.where(Employee.termination_date.is_(None))

    if dept_ids is not None:
        emp_q = emp_q.where(Employee.department_id.in_(dept_ids))
        type_q = type_q.where(Employee.department_id.in_(dept_ids))
        
    total_employees = await db.scalar(emp_q) or 0

    hire_q = (
        select(func.count(Employee.id))
        .where(Employee.is_active == True)
    )
    if start_date and end_date:
        hire_q = hire_q.where(Employee.hire_date >= start_date).where(Employee.hire_date <= end_date)
    else:
        hire_q = hire_q.where(Employee.hire_date >= month_first)
        
    if dept_ids is not None:
        hire_q = hire_q.where(Employee.department_id.in_(dept_ids))
    new_hires = await db.scalar(hire_q) or 0

    emp_type_rows = await db.execute(type_q.group_by(Employee.employment_type))
    employees_by_type = [
        EmploymentTypeCount(
            employment_type=_EMP_TYPE_LABELS.get(row[0], row[0].value),
            count=row[1],
        )
        for row in emp_type_rows.all()
    ]

    # -----------------------------------------------------------------------
    # 6. Upcoming deadlines — projects filtered by department
    # -----------------------------------------------------------------------
    deadline_q = (
        select(Project)
        .options(selectinload(Project.client))
        .where(Project.is_active == True)
        .where(Project.end_date >= today)
        .where(Project.end_date <= today + timedelta(days=30))
        .where(Project.status.notin_([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]))
    )
    if dept_ids is not None:
        deadline_q = deadline_q.where(Project.department_id.in_(dept_ids))
    deadline_rows = await db.execute(
        deadline_q.order_by(Project.end_date.asc()).limit(6)
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
    # 7. Recent activity — ALWAYS GLOBAL (unfiltered)
    #    The Notifications table has no reliable organisational attribution.
    #    Filtering would require fabricating notification-to-org relationships.
    #    This is documented as a known limitation of Enhancement 1.
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

    # --- Enhancement 4: Expense Anomaly Highlighting ---
    anomaly_q = (
        select(
            Expense.id,
            Expense.category,
            Expense.amount,
            Expense.date,
            Expense.description,
            Employee.first_name,
            Employee.last_name,
        )
        .join(Employee, Employee.id == Expense.employee_id)
        .where(Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]))
        .where(Expense.is_active == True)
    )
    if start_date and end_date:
        anomaly_q = anomaly_q.where(Expense.date >= start_date).where(Expense.date <= end_date)
    
    if dept_ids is not None:
        anomaly_q = anomaly_q.where(Employee.department_id.in_(dept_ids))
        
    anomaly_rows = await db.execute(anomaly_q)
    
    # Group by category
    expense_dict = {}
    for row in anomaly_rows.all():
        if row.amount is None:
            continue
        amt = float(row.amount)
        cat = str(row.category.value if hasattr(row.category, "value") else row.category)
        if cat not in expense_dict:
            expense_dict[cat] = []
        
        name = f"{row.first_name} {row.last_name}"
        expense_dict[cat].append({
            "expense_id": row.id,
            "category": cat,
            "amount": row.amount,
            "float_amount": amt,
            "date": row.date,
            "description": row.description,
            "employee_name": name
        })

    expense_anomalies = []
    for cat, items in expense_dict.items():
        if len(items) < 4:
            continue
            
        amounts = [item["float_amount"] for item in items]
        q1, _, q3 = statistics.quantiles(amounts, n=4, method="inclusive")
        iqr = q3 - q1
        
        if iqr > 0:
            upper_fence = q3 + 1.5 * iqr
            for item in items:
                if item["float_amount"] > upper_fence:
                    expense_anomalies.append(ExpenseAnomaly(
                        expense_id=item["expense_id"],
                        category=item["category"],
                        amount=item["amount"],
                        date=item["date"],
                        employee_name=item["employee_name"],
                        description=item["description"],
                    ))
                    
    # Sort anomalies descending by date, then amount
    expense_anomalies.sort(key=lambda x: (x.date, x.amount), reverse=True)

    # --- Enhancement 6: Employee Productivity ---
    from app.schemas.analytics import EmployeeProductivity
    task_active = ProjectTask.is_active == True
    if start_date and end_date:
        task_active = and_(
            task_active,
            ProjectTask.created_at >= start_date,
            ProjectTask.created_at < end_date + timedelta(days=1)
        )

    prod_q = (
        select(
            Employee.id,
            Employee.first_name,
            Employee.last_name,
            func.count(ProjectTask.id).label("assigned_tasks"),
            func.sum(case((ProjectTask.status == TaskStatus.DONE, 1), else_=0)).label("completed_tasks"),
            func.sum(case((and_(ProjectTask.due_date < today, ProjectTask.status != TaskStatus.DONE), 1), else_=0)).label("overdue_tasks"),
            func.sum(case((ProjectTask.status == TaskStatus.BLOCKED, 1), else_=0)).label("blocked_tasks"),
        )
        .outerjoin(ProjectTask, and_(ProjectTask.assignee_id == Employee.id, task_active))
        .where(Employee.is_active == True)
    )

    if dept_ids is not None:
        prod_q = prod_q.where(Employee.department_id.in_(dept_ids))

    prod_q = prod_q.group_by(Employee.id).order_by(
        text("assigned_tasks DESC"), Employee.first_name.asc(), Employee.last_name.asc()
    )

    prod_rows = await db.execute(prod_q)
    employee_productivity = []
    for r in prod_rows.all():
        completed = r.completed_tasks or 0
        assigned = r.assigned_tasks or 0
        completion_rate = float(completed) / float(assigned) if assigned > 0 else None
        
        employee_productivity.append(EmployeeProductivity(
            employee_id=r.id,
            employee_name=f"{r.first_name} {r.last_name}",
            assigned_tasks=assigned,
            completed_tasks=completed,
            completion_rate=completion_rate,
            overdue_tasks=r.overdue_tasks or 0,
            blocked_tasks=r.blocked_tasks or 0
        ))

    return DashboardAnalytics(
        finance=finance_data,
        monthly_revenue=monthly_revenue,
        cash_flow=cash_flow,
        forecast_available=forecast_available,
        expense_anomalies=expense_anomalies,
        project_risks=project_risks,
        employee_productivity=employee_productivity,
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

