from __future__ import annotations

import uuid
from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DBDep
from app.schemas.notifications import NotificationList, NotificationResponse, UnreadCountResponse
import app.services.notifications as svc

router = APIRouter()


@router.get("", response_model=NotificationList)
async def list_notifications(
    db: DBDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
):
    try:
        items, total, unread = await svc.list_notifications(db, current_user.id, skip=skip, limit=limit)
        return NotificationList(
            total=total,
            unread=unread,
            items=[NotificationResponse.model_validate(n) for n in items],
        )
    except Exception as exc:
        raise HTTPException(500, detail=f"Failed to list notifications. {type(exc).__name__}: {exc}")


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(db: DBDep, current_user: CurrentUser):
    try:
        count = await svc.unread_count(db, current_user.id)
        return UnreadCountResponse(count=count)
    except Exception as exc:
        raise HTTPException(500, detail=f"Failed to get unread count. {type(exc).__name__}: {exc}")


@router.patch("/{notif_id}/read", response_model=NotificationResponse)
async def mark_read(notif_id: uuid.UUID, db: DBDep, current_user: CurrentUser):
    try:
        notif = await svc.mark_read(db, notif_id, current_user.id)
        if not notif:
            raise HTTPException(404, detail="Notification not found.")
        return NotificationResponse.model_validate(notif)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, detail=f"Failed to mark read. {type(exc).__name__}: {exc}")


@router.post("/read-all", response_model=dict)
async def mark_all_read(db: DBDep, current_user: CurrentUser):
    try:
        updated = await svc.mark_all_read(db, current_user.id)
        return {"updated": updated}
    except Exception as exc:
        raise HTTPException(500, detail=f"Failed to mark all read. {type(exc).__name__}: {exc}")
