from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UUID,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import MilestoneStatus, Priority, ProjectStatus, TaskStatus

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.contract import Contract
    from app.models.employee import Employee
    from app.models.finance import Expense, Invoice


class Project(BaseModel):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("code", name="uq_projects_code"),
        Index("ix_projects_client_id", "client_id"),
        Index("ix_projects_status", "status"),
        Index("ix_projects_priority", "priority"),
    )

    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(
            ProjectStatus,
            name="project_status_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=ProjectStatus.PLANNING,
        nullable=False,
    )

    priority: Mapped[Priority] = mapped_column(
        Enum(
            Priority,
            name="priority_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=Priority.MEDIUM,
        nullable=False,
    )
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    budget: Mapped[Optional[Numeric]] = mapped_column(Numeric(15, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    client: Mapped[Optional[Client]] = relationship("Client", back_populates="projects")
    tasks: Mapped[List[ProjectTask]] = relationship("ProjectTask", back_populates="project")
    assignments: Mapped[List[ProjectAssignment]] = relationship(
        "ProjectAssignment", back_populates="project"
    )
    milestones: Mapped[List[Milestone]] = relationship(
        "Milestone", back_populates="project"
    )
    invoices: Mapped[List[Invoice]] = relationship("Invoice", back_populates="project")
    expenses: Mapped[List[Expense]] = relationship("Expense", back_populates="project")
    contracts: Mapped[List[Contract]] = relationship("Contract", back_populates="project")


class ProjectTask(BaseModel):
    __tablename__ = "project_tasks"
    __table_args__ = (
        Index("ix_project_tasks_project_id", "project_id"),
        Index("ix_project_tasks_assignee_id", "assignee_id"),
        Index("ix_project_tasks_status", "status"),
        Index("ix_project_tasks_parent_id", "parent_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("project_tasks.id", ondelete="SET NULL"),
        nullable=True,
    )
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(
            TaskStatus,
            name="task_status_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=TaskStatus.TODO,
        nullable=False,
    )
    priority: Mapped[Priority] = mapped_column(
        Enum(
            Priority,
            name="priority_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=Priority.MEDIUM,
        nullable=False,
    )
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    estimated_hours: Mapped[Optional[Numeric]] = mapped_column(
        Numeric(8, 2), nullable=True
    )
    actual_hours: Mapped[Optional[Numeric]] = mapped_column(Numeric(8, 2), nullable=True)

    project: Mapped[Project] = relationship("Project", back_populates="tasks")
    parent: Mapped[Optional[ProjectTask]] = relationship(
        "ProjectTask",
        back_populates="subtasks",
        remote_side="ProjectTask.id",
        foreign_keys=[parent_id],
    )
    subtasks: Mapped[List[ProjectTask]] = relationship(
        "ProjectTask", back_populates="parent", foreign_keys=[parent_id]
    )
    assignee: Mapped[Optional[Employee]] = relationship(
        "Employee", foreign_keys=[assignee_id]
    )


class ProjectAssignment(BaseModel):
    __tablename__ = "project_assignments"
    __table_args__ = (
        UniqueConstraint(
            "project_id", "employee_id", name="uq_project_assignments_project_employee"
        ),
        Index("ix_project_assignments_employee_id", "employee_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    project: Mapped[Project] = relationship("Project", back_populates="assignments")
    employee: Mapped[Employee] = relationship(
        "Employee", back_populates="project_assignments"
    )


class Milestone(BaseModel):
    __tablename__ = "milestones"
    __table_args__ = (
        Index("ix_milestones_project_id", "project_id"),
        Index("ix_milestones_due_date", "due_date"),
        Index("ix_milestones_status", "status"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    completed_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[MilestoneStatus] = mapped_column(
    Enum(
        MilestoneStatus,
        name="milestone_status_enum",
        values_callable=lambda obj: [e.value for e in obj],
    ),
    default=MilestoneStatus.PENDING,
    nullable=False,
)

    project: Mapped[Project] = relationship("Project", back_populates="milestones")
