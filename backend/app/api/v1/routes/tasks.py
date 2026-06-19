import uuid
from typing import List, Optional
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DBDep
from app.models.enums import TaskStatus
from app.schemas.tasks import (
    MilestoneCreate,
    MilestoneResponse,
    MilestoneUpdate,
    TaskCreate,
    TaskDashboard,
    TaskResponse,
    TaskUpdate,
)
from app.services import tasks as svc

router = APIRouter()


def _enrich(task) -> TaskResponse:
    today = date.today()
    data = TaskResponse.model_validate(task)
    data.is_overdue = bool(
        task.due_date and task.due_date < today and task.status != TaskStatus.DONE
    )
    return data


@router.get("/dashboard", response_model=TaskDashboard)
async def get_dashboard(db: DBDep, _: CurrentUser):
    try:
        return await svc.get_dashboard(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    db: DBDep,
    _: CurrentUser,
    project_id: Optional[uuid.UUID] = Query(None),
    status: Optional[TaskStatus] = Query(None),
    assignee_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
):
    tasks = await svc.list_tasks(db, project_id=project_id, status=status,
                                  assignee_id=assignee_id, skip=skip, limit=limit)
    return [_enrich(t) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(data: TaskCreate, db: DBDep, _: CurrentUser):
    try:
        return _enrich(await svc.create_task(db, data))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Create failed: {type(exc).__name__}: {exc}")


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        return _enrich(await svc.get_task(db, task_id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: uuid.UUID, data: TaskUpdate, db: DBDep, _: CurrentUser):
    try:
        return _enrich(await svc.update_task(db, task_id, data))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Update failed: {type(exc).__name__}: {exc}")


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_task(task_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        await svc.deactivate_task(db, task_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ---------------------------------------------------------------------------
# Milestones
# ---------------------------------------------------------------------------

@router.get("/milestones/list", response_model=List[MilestoneResponse])
async def list_milestones(
    db: DBDep,
    _: CurrentUser,
    project_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
):
    return await svc.list_milestones(db, project_id=project_id, skip=skip, limit=limit)


@router.post("/milestones", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
async def create_milestone(data: MilestoneCreate, db: DBDep, _: CurrentUser):
    try:
        return await svc.create_milestone(db, data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Create failed: {type(exc).__name__}: {exc}")


@router.put("/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(milestone_id: uuid.UUID, data: MilestoneUpdate, db: DBDep, _: CurrentUser):
    try:
        return await svc.update_milestone(db, milestone_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/milestones/{milestone_id}/complete", response_model=MilestoneResponse)
async def complete_milestone(milestone_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        return await svc.complete_milestone(db, milestone_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
