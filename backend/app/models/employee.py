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
from app.models.enums import AttendanceStatus, EmploymentType, LeaveStatus, LeaveType

if TYPE_CHECKING:
    from app.models.auth import User
    from app.models.finance import Expense
    from app.models.project import ProjectAssignment, ProjectTask


class Department(BaseModel):
    __tablename__ = "departments"
    __table_args__ = (
        UniqueConstraint("name", name="uq_departments_name"),
        Index("ix_departments_parent_id", "parent_id"),
        Index("ix_departments_manager_id", "manager_id"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    # use_alter breaks the departments ↔ employees circular FK at DDL time
    manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "employees.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_departments_manager_id",
        ),
        nullable=True,
    )

    parent: Mapped[Optional[Department]] = relationship(
        "Department",
        back_populates="children",
        remote_side="Department.id",
        foreign_keys=[parent_id],
    )
    children: Mapped[List[Department]] = relationship(
        "Department", back_populates="parent", foreign_keys=[parent_id]
    )
    manager: Mapped[Optional[Employee]] = relationship(
        "Employee", foreign_keys=[manager_id], back_populates="managed_departments"
    )
    employees: Mapped[List[Employee]] = relationship(
        "Employee", foreign_keys="Employee.department_id", back_populates="department"
    )


class Employee(BaseModel):
    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("employee_code", name="uq_employees_code"),
        UniqueConstraint("user_id", name="uq_employees_user_id"),
        Index("ix_employees_department_id", "department_id"),
        Index("ix_employees_employment_type", "employment_type"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    employee_code: Mapped[str] = mapped_column(String(50), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    job_title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    employment_type: Mapped[EmploymentType] = mapped_column(
        Enum(
            EmploymentType,
            name="employment_type_enum",
            values_callable=lambda obj: [e.value for e in obj],
), nullable=False
    )
    hire_date: Mapped[date] = mapped_column(Date, nullable=False)
    termination_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    salary: Mapped[Optional[Numeric]] = mapped_column(Numeric(15, 2), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="employee")
    department: Mapped[Optional[Department]] = relationship(
        "Department", foreign_keys=[department_id], back_populates="employees"
    )
    managed_departments: Mapped[List[Department]] = relationship(
        "Department", foreign_keys="Department.manager_id", back_populates="manager"
    )
    attendance_records: Mapped[List[Attendance]] = relationship(
        "Attendance", back_populates="employee"
    )
    leave_requests: Mapped[List[LeaveRequest]] = relationship(
        "LeaveRequest",
        foreign_keys="LeaveRequest.employee_id",
        back_populates="employee",
    )
    project_assignments: Mapped[List[ProjectAssignment]] = relationship(
        "ProjectAssignment", back_populates="employee"
    )
    expenses: Mapped[List[Expense]] = relationship(
    "Expense",
    back_populates="employee",
    foreign_keys="Expense.employee_id",
)


class Attendance(BaseModel):
    __tablename__ = "attendance"
    __table_args__ = (
        Index("ix_attendance_employee_date", "employee_id", "date"),
        Index("ix_attendance_date", "date"),
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    check_in: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    check_out: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status_enum"), nullable=False
    )
    work_hours: Mapped[Optional[Numeric]] = mapped_column(Numeric(5, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    employee: Mapped[Employee] = relationship("Employee", back_populates="attendance_records")


class LeaveRequest(BaseModel):
    __tablename__ = "leave_requests"
    __table_args__ = (
        Index("ix_leave_requests_employee_id", "employee_id"),
        Index("ix_leave_requests_status", "status"),
        Index("ix_leave_requests_dates", "start_date", "end_date"),
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    leave_type: Mapped[LeaveType] = mapped_column(
        Enum(LeaveType, name="leave_type_enum"), nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days: Mapped[Numeric] = mapped_column(Numeric(5, 1), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[LeaveStatus] = mapped_column(
        Enum(LeaveStatus, name="leave_status_enum"),
        default=LeaveStatus.PENDING,
        nullable=False,
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    employee: Mapped[Employee] = relationship(
        "Employee", foreign_keys=[employee_id], back_populates="leave_requests"
    )
    approver: Mapped[Optional[Employee]] = relationship(
        "Employee", foreign_keys=[approved_by]
    )
