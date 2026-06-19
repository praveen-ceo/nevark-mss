import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBDep, require_permission
from app.models.employee import Department
from app.schemas.employee import (
    DepartmentBrief,
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
)
from app.services import employee as svc
import app.services.notifications as notif_svc

router = APIRouter()


@router.get("", response_model=List[EmployeeResponse])
async def list_employees(
    db: DBDep,
    _: CurrentUser,
    search: Optional[str] = Query(None, description="Search by name or job title"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await svc.list_employees(db, search=search, skip=skip, limit=limit)


@router.get("/departments", response_model=List[DepartmentBrief])
async def list_departments(db: DBDep, _: CurrentUser):
    """Return all active departments for use in dropdowns."""
    result = await db.execute(
        select(Department)
        .where(Department.is_active.is_(True))
        .order_by(Department.name)
    )
    return result.scalars().all()


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        return await svc.get_employee(db, employee_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    db: DBDep,
    current_user: CurrentUser,
):
    try:
        emp = await svc.create_employee(db, data)
        try:
            name = f"{emp.first_name} {emp.last_name}".strip()
            await notif_svc.push(db, "employee", f"New employee added: {name}", entity_id=emp.id)
        except Exception:
            pass
        return emp
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Create failed: {type(exc).__name__}: {exc}",
        )


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: uuid.UUID,
    data: EmployeeUpdate,
    db: DBDep,
    current_user: CurrentUser,
):
    try:
        return await svc.update_employee(db, employee_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update failed: {type(exc).__name__}: {exc}",
        )


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_employee(employee_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        await svc.deactivate_employee(db, employee_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
