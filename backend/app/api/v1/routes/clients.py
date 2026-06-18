import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DBDep
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.services import client as svc

router = APIRouter()


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    db: DBDep,
    _: CurrentUser,
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await svc.list_clients(db, search=search, skip=skip, limit=limit)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(client_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        return await svc.get_client(db, client_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(data: ClientCreate, db: DBDep, _: CurrentUser):
    try:
        return await svc.create_client(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Create failed: {type(exc).__name__}: {exc}",
        )


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: uuid.UUID, data: ClientUpdate, db: DBDep, _: CurrentUser
):
    try:
        return await svc.update_client(db, client_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update failed: {type(exc).__name__}: {exc}",
        )


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(client_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        await svc.delete_client(db, client_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
