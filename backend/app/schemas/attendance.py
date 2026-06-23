from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.enums import AttendanceStatus, LeaveStatus, LeaveType


class EmployeeBrief(BaseModel):
    """Kept for internal use — not used in HTTP response models."""
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    first_name: str
    last_name: str
    employee_code: str
    job_title: Optional[str] = None


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

class AttendanceCreate(BaseModel):
    employee_id: UUID
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatus = AttendanceStatus.PRESENT
    work_hours: Optional[Decimal] = None
    notes: Optional[str] = None


class AttendanceUpdate(BaseModel):
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: Optional[AttendanceStatus] = None
    work_hours: Optional[Decimal] = None
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    """Flat response — no ORM relationship fields to avoid async lazy-load errors."""
    model_config = ConfigDict(from_attributes=False)
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None   # resolved by service, never lazy-loaded
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatus
    work_hours: Optional[Decimal] = None
    notes: Optional[str] = None
    created_at: datetime


class CheckInRequest(BaseModel):
    notes: Optional[str] = None


class CheckOutRequest(BaseModel):
    notes: Optional[str] = None


class MonthlyReportRow(BaseModel):
    employee_id: UUID
    employee_name: str
    employee_code: str
    present: int
    absent: int
    late: int
    half_day: int
    on_leave: int
    total_hours: Decimal


class MonthlyReport(BaseModel):
    year: int
    month: int
    rows: List[MonthlyReportRow]
    total_employees: int


# ---------------------------------------------------------------------------
# Leave
# ---------------------------------------------------------------------------

class LeaveRequestCreate(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    days: Optional[Decimal] = None
    reason: Optional[str] = None

    @model_validator(mode="after")
    def compute_days(self) -> "LeaveRequestCreate":
        if self.days is None:
            delta = (self.end_date - self.start_date).days + 1
            self.days = Decimal(str(max(delta, 1)))
        return self


class LeaveRejectRequest(BaseModel):
    rejection_reason: str


class LeaveRequestResponse(BaseModel):
    """Flat response — no ORM relationship fields to avoid async lazy-load errors."""
    model_config = ConfigDict(from_attributes=False)
    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None    # resolved by service, never lazy-loaded
    approved_by: Optional[UUID] = None
    approver_name: Optional[str] = None    # resolved by service, never lazy-loaded
    leave_type: LeaveType
    start_date: date
    end_date: date
    days: Decimal
    reason: Optional[str] = None
    status: LeaveStatus
    rejection_reason: Optional[str] = None
    created_at: datetime
