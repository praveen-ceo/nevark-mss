from __future__ import annotations

import uuid
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DBDep
from app.models.enums import AttendanceStatus, LeaveStatus, LeaveType
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceResponse,
    AttendanceUpdate,
    CheckInRequest,
    CheckOutRequest,
    LeaveRejectRequest,
    LeaveRequestCreate,
    LeaveRequestResponse,
    MonthlyReport,
)
from app.services import attendance as svc
import app.services.notifications as notif_svc

router = APIRouter()


# ---------------------------------------------------------------------------
# Check-in / Check-out
# ---------------------------------------------------------------------------

@router.post("/check-in", response_model=AttendanceResponse, status_code=status.HTTP_200_OK)
async def check_in(data: CheckInRequest, db: DBDep, current_user: CurrentUser):
    try:
        # Service returns AttendanceResponse (schema) — no lazy-load risk
        return await svc.check_in(db, current_user.id, notes=data.notes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@router.post("/check-out", response_model=AttendanceResponse, status_code=status.HTTP_200_OK)
async def check_out(data: CheckOutRequest, db: DBDep, current_user: CurrentUser):
    try:
        return await svc.check_out(db, current_user.id, notes=data.notes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@router.get("/today", response_model=Optional[AttendanceResponse])
async def today_status(db: DBDep, current_user: CurrentUser):
    try:
        return await svc.get_today(db, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Attendance list / admin CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=List[AttendanceResponse])
async def list_attendance(
    db: DBDep,
    _: CurrentUser,
    employee_id: Optional[uuid.UUID] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    status: Optional[AttendanceStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
):
    return await svc.list_attendance(
        db,
        employee_id=employee_id,
        date_from=date_from,
        date_to=date_to,
        status=status,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
async def create_attendance(data: AttendanceCreate, db: DBDep, _: CurrentUser):
    try:
        return await svc.create_attendance(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@router.put("/{record_id}", response_model=AttendanceResponse)
async def update_attendance(
    record_id: uuid.UUID, data: AttendanceUpdate, db: DBDep, _: CurrentUser
):
    try:
        return await svc.update_attendance(db, record_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


# ---------------------------------------------------------------------------
# Monthly report
# ---------------------------------------------------------------------------

@router.get("/monthly-report", response_model=MonthlyReport)
async def get_monthly_report(
    db: DBDep,
    _: CurrentUser,
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    employee_id: Optional[uuid.UUID] = Query(None),
):
    try:
        return await svc.monthly_report(db, year=year, month=month, employee_id=employee_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


# ---------------------------------------------------------------------------
# Leave requests
# ---------------------------------------------------------------------------

@router.post("/leave", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
async def submit_leave(data: LeaveRequestCreate, db: DBDep, current_user: CurrentUser):
    try:
        leave = await svc.create_leave(db, current_user.id, data)
        try:
            await notif_svc.push(
                db, "leave",
                f"Leave request submitted: {data.leave_type.value} ({data.start_date} – {data.end_date})",
                entity_id=leave.id,
            )
        except Exception:
            pass
        return leave  # already a LeaveRequestResponse schema object
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@router.get("/leave", response_model=List[LeaveRequestResponse])
async def list_leave(
    db: DBDep,
    _: CurrentUser,
    employee_id: Optional[uuid.UUID] = Query(None),
    status: Optional[LeaveStatus] = Query(None),
    leave_type: Optional[LeaveType] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await svc.list_leave(
        db,
        employee_id=employee_id,
        status=status,
        leave_type=leave_type,
        skip=skip,
        limit=limit,
    )


@router.get("/leave/{leave_id}", response_model=LeaveRequestResponse)
async def get_leave(leave_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        return await svc.get_leave(db, leave_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.put("/leave/{leave_id}/approve", response_model=LeaveRequestResponse)
async def approve_leave(leave_id: uuid.UUID, db: DBDep, current_user: CurrentUser):
    try:
        leave = await svc.approve_leave(db, leave_id, current_user.id)
        try:
            # leave is a LeaveRequestResponse schema — use flat fields, no ORM lazy-load
            name = leave.employee_name or "Employee"
            await notif_svc.push(
                db, "leave",
                f"Leave approved for {name}: {leave.leave_type.value} ({leave.start_date} – {leave.end_date})",
                entity_id=leave.id,
            )
        except Exception:
            pass
        return leave
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@router.put("/leave/{leave_id}/reject", response_model=LeaveRequestResponse)
async def reject_leave(
    leave_id: uuid.UUID, data: LeaveRejectRequest, db: DBDep, current_user: CurrentUser
):
    try:
        leave = await svc.reject_leave(db, leave_id, current_user.id, data.rejection_reason)
        try:
            name = leave.employee_name or "Employee"
            await notif_svc.push(
                db, "leave",
                f"Leave rejected for {name}: {leave.leave_type.value} ({leave.start_date} – {leave.end_date})",
                entity_id=leave.id,
            )
        except Exception:
            pass
        return leave
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@router.put("/leave/{leave_id}/cancel", response_model=LeaveRequestResponse)
async def cancel_leave(leave_id: uuid.UUID, db: DBDep, current_user: CurrentUser):
    try:
        return await svc.cancel_leave(db, leave_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")
