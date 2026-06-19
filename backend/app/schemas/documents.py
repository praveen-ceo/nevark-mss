from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

class DocumentCategoryResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    model_config = {"from_attributes": True}


class DocumentCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[UUID] = None


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    related_type: Optional[str] = None   # 'project'|'client'|'employee'|'invoice'|'task'
    related_id: Optional[UUID] = None
    tags: Optional[str] = None           # comma-separated


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    tags: Optional[str] = None


class DocumentResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    file_name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    tags: Optional[str] = None
    related_type: Optional[str] = None
    related_id: Optional[UUID] = None
    version: int
    is_active: bool
    created_at: datetime
    category: Optional[DocumentCategoryResponse] = None
    uploader_name: Optional[str] = None   # resolved in service
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

class DownloadUrlResponse(BaseModel):
    url: str
    expires_in_minutes: int = 15
