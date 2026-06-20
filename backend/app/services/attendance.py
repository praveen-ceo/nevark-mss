from __future__ import annotations

import random
import uuid
from calendar import monthrange
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Attendance, Employee, LeaveRequest
from app.models.enums import AttendanceStatus, LeaveStatus, LeaveType
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceUpdate,
    LeaveRequestCreate,
    MonthlyReport,
    MonthlyReportRow,
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _att_q():
    return select(Attendance).options(selectinload(Attendance.employee))


def _leave_q():
    return select(LeaveRequest).options(
        selectinload(LeaveRequest.employee),
        selectinload(LeaveRequest.approver),
    )


def _status_from_checkin(dt: datetime) -> AttendanceStatus:
    local = dt.astimezone()
    if local.hour > 9 or (local.hour == 9 and local.minute > 30):
        return AttendanceStatus.LATE
    return AttendanceStatus.PRESENT


def _hours(check_in: datetime, check_out: datetime) -> Decimal:
    secs = (check_out - check_in).total_seconds()
    return Decimal(str(round(max(secs, 0) / 3600, 2)))


async def _emp_id_for_user(db: AsyncSession, user_id: uuid.UUID) -> uuid.UUID:
    emp_id = await db.scalar(
        select(Employee.id).where(
            Employee.user_id == user_id,
            Employee.is_active.is_(True),
        )
    )
    if emp_id is not None:
        return emp_id

    # No employee row — auto-create one (handles superadmin / pre-existing users).
    # Import here to avoid circular import at module load time.
    from app.models.auth import User as _User
    from app.models.enums import EmploymentType as _EmpType

    user = await db.scalar(select(_User).where(_User.id == user_id))
    if user is None:
        raise ValueError("User not found.")

    # Generate unique employee code
    code: str = ""
    year = date.today().year
    for _ in range(20):
        candidate = f"EMP{year}{random.randint(1000, 9999)}"
        taken = await db.scalar(
            select(func.count()).where(Employee.employee_code == candidate)
        )
        if not taken:
            code = candidate
            break
    if not code:
        raise ValueError("Could not generate a unique employee code.")

    full = (user.full_name or "").strip()
    parts = full.split(maxsplit=1)
    first = parts[0] if parts else user.email.split("@")[0]
    last = parts[1] if len(parts) > 1 else ""

    emp = Employee(
        user_id=user_id,
        employee_code=code,
        first_name=first,
        last_name=last,
        job_title="Administrator",
        employment_type=_EmpType.FULL_TIME,
        hire_date=date.today(),
    )
    db.add(emp)
    await db.flush()  # get emp.id; committed by the calling function
    return emp.id


async def _today_record(db: AsyncSession, emp_id: uuid.UUID) -> Optional[Attendance]:
    return await db.scalar(
        select(Attendance).where(
            Attendance.employee_id == emp_id,
            Attendance.date == date.today(),
            Attendance.is_active.is_(True),
        )
    )


# ---------------------------------------------------------------------------
# Check-in / Check-out
# ---------------------------------------------------------------------------

async def check_in(
    db: AsyncSession, user_id: uuid.UUID, notes: Optional[str] = None
) -> Attendance:
    emp_id = await _emp_id_for_user(db, user_id)
    now = datetime.now(timezone.utc)
    record = await _today_record(db, emp_id)
    if record:
        if record.check_in is not None:
            raise ValueError("Already checked in today.")
        record.check_in = now
        record.status = _status_from_checkin(now)
        if notes:
            record.notes = notes
    else:
        record = Attendance(
            employee_id=emp_id,
            date=date.today(),
            check_in=now,
            status=_status_from_checkin(now),
            notes=notes,
        )
        db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def check_out(
    db: AsyncSession, user_id: uuid.UUID, notes: Optional[str] = None
) -> Attendance:
    emp_id = await _emp_id_for_user(db, user_id)
    now = datetime.now(timezone.utc)
    record = await _today_record(db, emp_id)
    if record is None:
        raise ValueError("No attendance record for today — check in first.")
    if record.check_in is None:
        raise ValueError("Must check in before checking out.")
    if record.check_out is not None:
        raise ValueError("Already checked out today.")
    record.check_out = now
    record.work_hours = _hours(record.check_in, now)
    if notes:
        record.notes = notes
    await db.commit()
    await db.refresh(record)
    return record


async def get_today(db: AsyncSession, user_id: uuid.UUID) -> Optional[Attendance]:
    emp_id = await _emp_id_for_user(db, user_id)
    return await _today_record(db, emp_id)


# ---------------------------------------------------------------------------
# List / admin CRUD
# ---------------------------------------------------------------------------

async def list_attendance(
    db: AsyncSession,
    *,
    employee_id: Optional[uuid.UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[AttendanceStatus] = None,
    skip: int = 0,
    limit: int = 200,
) -> List[Attendance]:
    q = _att_q().where(Attendance.is_active.is_(True))
    if employee_id:
        q = q.where(Attendance.employee_id == employee_id)
    if date_from:
        q = q.where(Attendance.date >= date_from)
    if date_to:
        q = q.where(Attendance.date <= date_to)
    if status:
        q = q.where(Attendance.status == status)
    q = q.order_by(Attendance.date.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def create_attendance(db: AsyncSession, data: AttendanceCreate) -> Attendance:
    existing = await db.scalar(
        select(Attendance).where(
            Attendance.employee_id == data.employee_id,
            Attendance.date == data.date,
            Attendance.is_active.is_(True),
        )
    )
    if existing:
        raise ValueError(f"Attendance record already exists for {data.date}.")
    rec = Attendance(**data.model_dump())
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


async def update_attendance(
    db: AsyncSession, record_id: uuid.UUID, data: AttendanceUpdate
) -> Attendance:
    rec = await db.scalar(
        select(Attendance).where(
            Attendance.id == record_id, Attendance.is_active.is_(True)
        )
    )
    if rec is None:
        raise ValueError("Attendance record not found.")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(rec, k, v)
    if rec.check_in and rec.check_out:
        rec.work_hours = _hours(rec.check_in, rec.check_out)
    await db.commit()
    await db.refresh(rec)
    return rec


# ---------------------------------------------------------------------------
# Monthly report
# ---------------------------------------------------------------------------

async def monthly_report(
    db: AsyncSession,
    year: int,
    month: int,
    employee_id: Optional[uuid.UUID] = None,
) -> MonthlyReport:
    d_from = date(year, month, 1)
    d_to = date(year, month, monthrange(year, month)[1])

    q = (
        select(
            Attendance.employee_id,
            Employee.first_name,
            Employee.last_name,
            Employee.employee_code,
            func.count().filter(Attendance.status == AttendanceStatus.PRESENT).label("present"),
            func.count().filter(Attendance.status == AttendanceStatus.ABSENT).label("absent"),
            func.count().filter(Attendance.status == AttendanceStatus.LATE).label("late"),
            func.count().filter(Attendance.status == AttendanceStatus.HALF_DAY).label("half_day"),
            func.count().filter(Attendance.status == AttendanceStatus.ON_LEAVE).label("on_leave"),
            func.coalesce(func.sum(Attendance.work_hours), 0).label("total_hours"),
        )
        .join(Employee, Attendance.employee_id == Employee.id)
        .where(
            Attendance.date >= d_from,
            Attendance.date <= d_to,
            Attendance.is_active.is_(True),
        )
        .group_by(
            Attendance.employee_id,
            Employee.first_name,
            Employee.last_name,
            Employee.employee_code,
        )
        .order_by(Employee.first_name)
    )
    if employee_id:
        q = q.where(Attendance.employee_id == employee_id)

    result = await db.execute(q)
    rows = [
        MonthlyReportRow(
            employee_id=r.employee_id,
            employee_name=f"{r.first_name} {r.last_name}".strip(),
            employee_code=r.employee_code,
            present=r.present,
            absent=r.absent,
            late=r.late,
            half_day=r.half_day,
            on_leave=r.on_leave,
            total_hours=Decimal(str(r.total_hours)),
        )
        for r in result.all()
    ]
    return MonthlyReport(year=year, month=month, rows=rows, total_employees=len(rows))


# ---------------------------------------------------------------------------
# Leave requests
# ---------------------------------------------------------------------------

async def create_leave(
    db: AsyncSession, user_id: uuid.UUID, data: LeaveRequestCreate
) -> LeaveRequest:
    emp_id = await _emp_id_for_user(db, user_id)
    leave = LeaveRequest(
        employee_id=emp_id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        days=data.days,
        reason=data.reason,
        status=LeaveStatus.PENDING,
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)
    return leave


async def list_leave(
    db: AsyncSession,
    *,
    employee_id: Optional[uuid.UUID] = None,
    status: Optional[LeaveStatus] = None,
    leave_type: Optional[LeaveType] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[LeaveRequest]:
    q = _leave_q().where(LeaveRequest.is_active.is_(True))
    if employee_id:
        q = q.where(LeaveRequest.employee_id == employee_id)
    if status:
        q = q.where(LeaveRequest.status == status)
    if leave_type:
        q = q.where(LeaveRequest.leave_type == leave_type)
    q = q.order_by(LeaveRequest.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_leave(db: AsyncSession, leave_id: uuid.UUID) -> LeaveRequest:
    result = await db.execute(
        _leave_q().where(
            LeaveRequest.id == leave_id, LeaveRequest.is_active.is_(True)
        )
    )
    leave = result.scalar_one_or_none()
    if leave is None:
        raise ValueError("Leave request not found.")
    return leave


async def approve_leave(
    db: AsyncSession, leave_id: uuid.UUID, approver_user_id: uuid.UUID
) -> LeaveRequest:
    leave = await get_leave(db, leave_id)
    if leave.status != LeaveStatus.PENDING:
        raise ValueError(f"Cannot approve — status is {leave.status.value}.")
    approver_emp_id = await _emp_id_for_user(db, approver_user_id)
    leave.status = LeaveStatus.APPROVED
    leave.approved_by = approver_emp_id
    await db.commit()
    await db.refresh(leave)
    return leave


async def reject_leave(
    db: AsyncSession,
    leave_id: uuid.UUID,
    approver_user_id: uuid.UUID,
    rejection_reason: str,
) -> LeaveRequest:
    leave = await get_leave(db, leave_id)
    if leave.status != LeaveStatus.PENDING:
        raise ValueError(f"Cannot reject — status is {leave.status.value}.")
    approver_emp_id = await _emp_id_for_user(db, approver_user_id)
    leave.status = LeaveStatus.REJECTED
    leave.approved_by = approver_emp_id
    leave.rejection_reason = rejection_reason
    await db.commit()
    await db.refresh(leave)
    return leave


async def cancel_leave(
    db: AsyncSession, leave_id: uuid.UUID, user_id: uuid.UUID
) -> LeaveRequest:
    emp_id = await _emp_id_for_user(db, user_id)
    leave = await get_leave(db, leave_id)
    if leave.employee_id != emp_id:
        raise ValueError("You can only cancel your own leave requests.")
    if leave.status != LeaveStatus.PENDING:
        raise ValueError(f"Cannot cancel — status is {leave.status.value}.")
    leave.status = LeaveStatus.CANCELLED
    await db.commit()
    await db.refresh(leave)
    return leave
