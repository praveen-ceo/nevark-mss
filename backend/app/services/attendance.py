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
    AttendanceResponse,
    AttendanceUpdate,
    LeaveRequestCreate,
    LeaveRequestResponse,
    MonthlyReport,
    MonthlyReportRow,
)


# ---------------------------------------------------------------------------
# Query helpers — always eager-load relationships
# ---------------------------------------------------------------------------

def _att_q():
    """Base Attendance query with employee pre-loaded (avoids lazy-load)."""
    return select(Attendance).options(selectinload(Attendance.employee))


def _leave_q():
    """Base LeaveRequest query with employee + approver pre-loaded."""
    return select(LeaveRequest).options(
        selectinload(LeaveRequest.employee),
        selectinload(LeaveRequest.approver),
    )


# ---------------------------------------------------------------------------
# Schema builder helpers — safe, no lazy loading
# Called only after selectinload has already populated the relationships.
# ---------------------------------------------------------------------------

def _build_att_resp(rec: Attendance) -> AttendanceResponse:
    """Construct AttendanceResponse from an eagerly-loaded Attendance object."""
    emp = getattr(rec, "employee", None)
    name: Optional[str] = None
    if emp is not None:
        name = f"{emp.first_name} {emp.last_name}".strip() or None
    return AttendanceResponse(
        id=rec.id,
        employee_id=rec.employee_id,
        employee_name=name,
        date=rec.date,
        check_in=rec.check_in,
        check_out=rec.check_out,
        status=rec.status,
        work_hours=rec.work_hours,
        notes=rec.notes,
        created_at=rec.created_at,
    )


def _build_leave_resp(rec: LeaveRequest) -> LeaveRequestResponse:
    """Construct LeaveRequestResponse from an eagerly-loaded LeaveRequest object."""
    emp = getattr(rec, "employee", None)
    apv = getattr(rec, "approver", None)
    emp_name: Optional[str] = None
    apv_name: Optional[str] = None
    if emp is not None:
        emp_name = f"{emp.first_name} {emp.last_name}".strip() or None
    if apv is not None:
        apv_name = f"{apv.first_name} {apv.last_name}".strip() or None
    return LeaveRequestResponse(
        id=rec.id,
        employee_id=rec.employee_id,
        employee_name=emp_name,
        approved_by=rec.approved_by,
        approver_name=apv_name,
        leave_type=rec.leave_type,
        start_date=rec.start_date,
        end_date=rec.end_date,
        days=rec.days,
        reason=rec.reason,
        status=rec.status,
        rejection_reason=rec.rejection_reason,
        created_at=rec.created_at,
    )


# ---------------------------------------------------------------------------
# Internal re-fetch helpers — re-query after commit to get loaded record
# ---------------------------------------------------------------------------

async def _fetch_att(db: AsyncSession, att_id: uuid.UUID) -> Attendance:
    """Re-fetch a single Attendance row with employee selectinloaded."""
    return await db.scalar(_att_q().where(Attendance.id == att_id))


async def _fetch_leave_orm(db: AsyncSession, leave_id: uuid.UUID) -> LeaveRequest:
    """Re-fetch a LeaveRequest with employee + approver selectinloaded."""
    result = await db.execute(
        _leave_q().where(
            LeaveRequest.id == leave_id,
            LeaveRequest.is_active.is_(True),
        )
    )
    leave = result.scalar_one_or_none()
    if leave is None:
        raise ValueError("Leave request not found.")
    return leave


# ---------------------------------------------------------------------------
# Domain helpers
# ---------------------------------------------------------------------------

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

    from app.models.auth import User as _User
    from app.models.enums import EmploymentType as _EmpType

    user = await db.scalar(select(_User).where(_User.id == user_id))
    if user is None:
        raise ValueError("User not found.")
    
    
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
    await db.flush()
    return emp.id


async def _today_record(db: AsyncSession, emp_id: uuid.UUID) -> Optional[Attendance]:
    """Fetch today's Attendance scalar (no relationship needed for mutations)."""
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
) -> AttendanceResponse:
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
    await db.flush()
    att_id = record.id
    await db.commit()
    loaded = await _fetch_att(db, att_id)
    return _build_att_resp(loaded)


async def check_out(
    db: AsyncSession, user_id: uuid.UUID, notes: Optional[str] = None
) -> AttendanceResponse:
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
    att_id = record.id
    await db.commit()
    loaded = await _fetch_att(db, att_id)
    return _build_att_resp(loaded)


async def get_today(
    db: AsyncSession, user_id: uuid.UUID
) -> Optional[AttendanceResponse]:
    emp_id = await _emp_id_for_user(db, user_id)
    record = await db.scalar(
        _att_q().where(
            Attendance.employee_id == emp_id,
            Attendance.date == date.today(),
            Attendance.is_active.is_(True),
        )
    )
    if record is None:
        return None
    return _build_att_resp(record)


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
) -> List[AttendanceResponse]:
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
    return [_build_att_resp(r) for r in result.scalars().all()]


async def create_attendance(
    db: AsyncSession, data: AttendanceCreate
) -> AttendanceResponse:
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
    await db.flush()
    att_id = rec.id
    await db.commit()
    loaded = await _fetch_att(db, att_id)
    return _build_att_resp(loaded)


async def update_attendance(
    db: AsyncSession, record_id: uuid.UUID, data: AttendanceUpdate
) -> AttendanceResponse:
    rec = await db.scalar(
        select(Attendance).where(
            Attendance.id == record_id,
            Attendance.is_active.is_(True),
        )
    )
    if rec is None:
        raise ValueError("Attendance record not found.")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(rec, k, v)
    if rec.check_in and rec.check_out:
        rec.work_hours = _hours(rec.check_in, rec.check_out)
    await db.commit()
    loaded = await _fetch_att(db, record_id)
    return _build_att_resp(loaded)


# ---------------------------------------------------------------------------
# Monthly report — explicit JOIN + aggregate, no ORM relationship needed
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
) -> LeaveRequestResponse:
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
    await db.flush()
    leave_id = leave.id
    await db.commit()
    loaded = await _fetch_leave_orm(db, leave_id)
    return _build_leave_resp(loaded)


async def list_leave(
    db: AsyncSession,
    *,
    employee_id: Optional[uuid.UUID] = None,
    status: Optional[LeaveStatus] = None,
    leave_type: Optional[LeaveType] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[LeaveRequestResponse]:
    q = _leave_q().where(LeaveRequest.is_active.is_(True))
    if employee_id:
        q = q.where(LeaveRequest.employee_id == employee_id)
    if status:
        q = q.where(LeaveRequest.status == status)
    if leave_type:
        q = q.where(LeaveRequest.leave_type == leave_type)
    q = q.order_by(LeaveRequest.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return [_build_leave_resp(r) for r in result.scalars().all()]


async def get_leave(
    db: AsyncSession, leave_id: uuid.UUID
) -> LeaveRequestResponse:
    leave = await _fetch_leave_orm(db, leave_id)
    return _build_leave_resp(leave)


async def approve_leave(
    db: AsyncSession, leave_id: uuid.UUID, approver_user_id: uuid.UUID
) -> LeaveRequestResponse:
    leave = await _fetch_leave_orm(db, leave_id)
    if leave.status != LeaveStatus.PENDING:
        raise ValueError(f"Cannot approve -- status is {leave.status.value}.")
    approver_emp_id = await _emp_id_for_user(db, approver_user_id)
    leave.status = LeaveStatus.APPROVED
    leave.approved_by = approver_emp_id
    await db.commit()
    loaded = await _fetch_leave_orm(db, leave_id)
    return _build_leave_resp(loaded)


async def reject_leave(
    db: AsyncSession,
    leave_id: uuid.UUID,
    approver_user_id: uuid.UUID,
    rejection_reason: str,
) -> LeaveRequestResponse:
    leave = await _fetch_leave_orm(db, leave_id)
    if leave.status != LeaveStatus.PENDING:
        raise ValueError(f"Cannot reject -- status is {leave.status.value}.")
    approver_emp_id = await _emp_id_for_user(db, approver_user_id)
    leave.status = LeaveStatus.REJECTED
    leave.approved_by = approver_emp_id
    leave.rejection_reason = rejection_reason
    await db.commit()
    loaded = await _fetch_leave_orm(db, leave_id)
    return _build_leave_resp(loaded)


async def cancel_leave(
    db: AsyncSession, leave_id: uuid.UUID, user_id: uuid.UUID
) -> LeaveRequestResponse:
    emp_id = await _emp_id_for_user(db, user_id)
    leave = await _fetch_leave_orm(db, leave_id)
    if leave.employee_id != emp_id:
        raise ValueError("You can only cancel your own leave requests.")
    if leave.status != LeaveStatus.PENDING:
        raise ValueError(f"Cannot cancel -- status is {leave.status.value}.")
    leave.status = LeaveStatus.CANCELLED
    await db.commit()
    loaded = await _fetch_leave_orm(db, leave_id)
    return _build_leave_resp(loaded)
