import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DBDep
from app.models.enums import ProjectStatus
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services import project as svc

router = APIRouter()


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    db: DBDep,
    _: CurrentUser,
    search: Optional[str] = Query(None),
    status: Optional[ProjectStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await svc.list_projects(db, search=search, status=status, skip=skip, limit=limit)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        return await svc.get_project(db, project_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(data: ProjectCreate, db: DBDep, _: CurrentUser):
    try:
        return await svc.create_project(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Create failed: {type(exc).__name__}: {exc}",
        )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID, data: ProjectUpdate, db: DBDep, _: CurrentUser
):
    try:
        return await svc.update_project(db, project_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update failed: {type(exc).__name__}: {exc}",
        )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        await svc.delete_project(db, project_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
