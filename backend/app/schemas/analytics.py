# ============================================================
# Nevark Technologies Pvt. Ltd.
# All rights reserved © 2026 Nevark Technologies.
# Unauthorized use, reproduction, or distribution of this
# code is strictly prohibited.
# Module  : analytics.py
# Author  : Development Team
# Created : 2026-09-05 15:08:00
# ============================================================

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

# Re-import composites from existing schemas
from app.schemas.finance import FinanceDashboard, MonthlyRevenue, CashFlowPoint
from app.schemas.tasks import TaskDashboard

class ExpenseAnomaly(BaseModel):
    expense_id: UUID
    category: str
    amount: Decimal
    date: date
    employee_name: str
    description: Optional[str] = None


class ProjectRisk(BaseModel):
    project_id: UUID
    name: str
    risk_level: str
    reasons: List[str]


class EmployeeProductivity(BaseModel):
    employee_id: UUID
    employee_name: str
    assigned_tasks: int
    completed_tasks: int
    completion_rate: Optional[float]
    overdue_tasks: int
    blocked_tasks: int





class StatusCount(BaseModel):
    status: str
    count: int


class EmploymentTypeCount(BaseModel):
    employment_type: str
    count: int


class ActivityItem(BaseModel):
    entity_type: str    # 'invoice' | 'project' | 'task' | 'payment'
    entity_id: UUID
    description: str
    occurred_at: datetime


class DeadlineItem(BaseModel):
    project_id: UUID
    name: str
    client_name: Optional[str] = None
    end_date: date
    days_left: int
    status: str


class DashboardAnalytics(BaseModel):
    # Finance — from finance.get_dashboard()
    finance: FinanceDashboard
    monthly_revenue: List[MonthlyRevenue] = Field(default_factory=list)
    cash_flow: List[CashFlowPoint] = Field(default_factory=list)
    forecast_available: bool = True
    expense_anomalies: List[ExpenseAnomaly] = Field(default_factory=list)
    project_risks: List[ProjectRisk] = Field(default_factory=list)
    employee_productivity: List[EmployeeProductivity] = Field(default_factory=list)

    # Projects
    total_projects: int
    active_projects: int
    overdue_projects: int
    project_by_status: List[StatusCount] = []

    # Tasks — from tasks.get_dashboard()
    tasks: TaskDashboard

    # Employees
    total_employees: int
    new_hires_this_month: int
    employees_by_type: List[EmploymentTypeCount] = []

    # Activity & Deadlines
    recent_activity: List[ActivityItem] = []
    upcoming_deadlines: List[DeadlineItem] = []
