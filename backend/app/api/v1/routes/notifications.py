from __future__ import annotations

import uuid
from typing import Optional
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
    entity_type: Optional[str] = None,
):
    """List notifications.

    entity_type: optional comma-separated list of entity_type values to filter by,
    e.g. ``?entity_type=task`` or ``?entity_type=employee,leave``.
    Omit (or pass an empty string) to return all.
    """
    entity_types: Optional[list[str]] = None
    if entity_type:
        entity_types = [t.strip().lower() for t in entity_type.split(",") if t.strip()]

    try:
        items, total, unread = await svc.list_notifications(
            db, current_user.id, skip=skip, limit=limit, entity_types=entity_types
        )
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
