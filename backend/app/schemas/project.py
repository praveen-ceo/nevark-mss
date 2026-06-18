from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import MilestoneStatus, Priority, ProjectStatus, TaskStatus


class ClientBrief(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}


class TaskBrief(BaseModel):
    id: UUID
    title: str
    status: TaskStatus
    priority: Priority
    due_date: Optional[date] = None
    model_config = {"from_attributes": True}


class MilestoneBrief(BaseModel):
    id: UUID
    title: str
    due_date: date
    status: MilestoneStatus
    completed_at: Optional[date] = None
    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    name: str
    code: Optional[str] = None          # auto-generated if omitted
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    status: ProjectStatus = ProjectStatus.PLANNING
    priority: Priority = Priority.MEDIUM
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    currency: str = "INR"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[Priority] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str] = None
    status: ProjectStatus
    priority: Priority
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    currency: str
    is_active: bool
    client: Optional[ClientBrief] = None
    tasks: List[TaskBrief] = []
    milestones: List[MilestoneBrief] = []
    model_config = {"from_attributes": True}
