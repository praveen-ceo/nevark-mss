from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import MilestoneStatus, Priority, TaskStatus


class ProjectBrief(BaseModel):
    id: UUID
    name: str
    code: str
    model_config = {"from_attributes": True}


class EmployeeBrief(BaseModel):
    id: UUID
    employee_code: str
    first_name: str
    last_name: str
    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    project_id: UUID
    title: str
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    status: TaskStatus = TaskStatus.TODO
    priority: Priority = Priority.MEDIUM
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    status: Optional[TaskStatus] = None
    priority: Optional[Priority] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None
    actual_hours: Optional[Decimal] = None
    is_active: Optional[bool] = None


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    status: TaskStatus
    priority: Priority
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None
    actual_hours: Optional[Decimal] = None
    is_active: bool
    is_overdue: bool = False
    project: Optional[ProjectBrief] = None
    assignee: Optional[EmployeeBrief] = None
    model_config = {"from_attributes": True}


class MilestoneCreate(BaseModel):
    project_id: UUID
    title: str
    description: Optional[str] = None
    due_date: date


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[MilestoneStatus] = None


class MilestoneResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    due_date: date
    completed_at: Optional[date] = None
    status: MilestoneStatus
    is_active: bool
    project: Optional[ProjectBrief] = None
    model_config = {"from_attributes": True}


class TaskDashboard(BaseModel):
    total: int
    completed: int
    in_progress: int
    overdue: int
    todo: int
    blocked: int
