from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

# Re-import composites from existing schemas
from app.schemas.finance import FinanceDashboard
from app.schemas.tasks import TaskDashboard


class MonthlyRevenue(BaseModel):
    month: str          # e.g. "Jan 2025"
    revenue: Decimal
    expenses: Decimal
    profit: Decimal


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
    monthly_revenue: List[MonthlyRevenue] = []

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
