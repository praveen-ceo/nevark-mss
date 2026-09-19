# ============================================================
# Nevark Technologies Pvt. Ltd.
# All rights reserved © 2026 Nevark Technologies.
# Unauthorized use, reproduction, or distribution of this
# code is strictly prohibited.
# Module  : employees.py
# Author  : Development Team
# Created : 2026-09-05 15:08:00
# ============================================================

import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBDep, require_permission
from app.models.employee import Department
from app.schemas.employee import (
    DepartmentBrief,
    DepartmentNode,
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


@router.get("/departments", response_model=list[DepartmentBrief])
async def list_departments(db: DBDep, _: CurrentUser):
    """Return all active departments as a flat list for use in dropdowns.

    Backward compatible: response contract is unchanged from baseline.
    parent_id and department_type fields are new nullable additions.
    """
    result = await db.execute(
        select(Department)
        .where(Department.is_active.is_(True))
        .order_by(Department.name)
    )
    return result.scalars().all()


@router.get("/departments/tree", response_model=list[DepartmentNode])
async def get_departments_tree(db: DBDep, _: CurrentUser):
    """Return all active departments as a nested tree for the dashboard OrgFilterBar.

    Enhancement 1: this endpoint is NEW and does not affect the existing
    /departments flat-list endpoint consumed by employee management forms.

    The tree is built in-memory from the flat department list using parent_id.
    Root nodes (parent_id = NULL) are returned as top-level items.
    Children are nested under their parent.
    """
    result = await db.execute(
        select(Department)
        .where(Department.is_active.is_(True))
        .order_by(Department.name)
    )
    depts = list(result.scalars().all())

    # Build id → DepartmentNode mapping
    node_map: dict = {}
    for d in depts:
        node_map[d.id] = DepartmentNode(
            id=d.id,
            name=d.name,
            parent_id=d.parent_id,
            department_type=d.department_type.value if d.department_type else None,
            children=[],
        )

    roots: list[DepartmentNode] = []
    for d in depts:
        node = node_map[d.id]
        if d.parent_id is not None and d.parent_id in node_map:
            node_map[d.parent_id].children.append(node)
        else:
            roots.append(node)

    return roots


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
