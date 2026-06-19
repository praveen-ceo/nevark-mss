from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

ENTITY_TYPES = {"task", "project", "finance", "document", "employee", "system"}


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recipient_id: Optional[uuid.UUID]
    entity_type: str
    entity_id: Optional[uuid.UUID]
    title: str
    body: Optional[str]
    is_read: bool
    created_at: datetime


class NotificationList(BaseModel):
    total: int
    unread: int
    items: List[NotificationResponse]


class UnreadCountResponse(BaseModel):
    count: int
