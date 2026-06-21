from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system import Notification


async def push(
    db: AsyncSession,
    entity_type: str,
    title: str,
    *,
    entity_id: Optional[uuid.UUID] = None,
    body: Optional[str] = None,
    recipient_id: Optional[uuid.UUID] = None,
) -> Notification:
    """Insert a notification. recipient_id=None → broadcast."""
    notif = Notification(
        recipient_id=recipient_id,
        entity_type=entity_type,
        entity_id=entity_id,
        title=title,
        body=body,
        is_read=False,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif


def _visible(user_id: uuid.UUID):
    """SQLAlchemy filter: broadcasts (recipient_id IS NULL) OR targeted to user."""
    return or_(Notification.recipient_id.is_(None), Notification.recipient_id == user_id)


async def list_notifications(
    db: AsyncSession,
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
) -> tuple[List[Notification], int, int]:
    """Returns (items, total, unread)."""
    base = select(Notification).where(
        Notification.is_active == True,  # noqa: E712
        _visible(user_id),
    )
    total_q = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_q.scalar_one()

    unread_q = await db.execute(
        select(func.count()).select_from(
            base.where(Notification.is_read == False).subquery()  # noqa: E712
        )
    )
    unread = unread_q.scalar_one()

    items_q = await db.execute(
        base.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    )
    items = list(items_q.scalars().all())
    return items, total, unread


async def unread_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    q = await db.execute(
        select(func.count()).where(
            Notification.is_active == True,  # noqa: E712
            Notification.is_read == False,   # noqa: E712
            _visible(user_id),
        )
    )
    return q.scalar_one()


async def mark_read(db: AsyncSession, notif_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Notification]:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_id,
            Notification.is_active == True,  # noqa: E712
            _visible(user_id),
        )
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.commit()
        await db.refresh(notif)
    return notif


async def mark_all_read(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        update(Notification)
        .where(
            Notification.is_active == True,   # noqa: E712
            Notification.is_read == False,    # noqa: E712
            _visible(user_id),
        )
        .values(is_read=True)
        .returning(Notification.id)
    )
    rows = result.fetchall()
    await db.commit()
    return len(rows)
