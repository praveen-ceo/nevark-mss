"""Document CRUD service."""
from __future__ import annotations

import uuid as _uuid
from typing import List, Optional

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import Document, DocumentCategory
from app.schemas.documents import DocumentCategoryCreate, DocumentCreate, DocumentUpdate

log = structlog.get_logger(__name__)

DEFAULT_CATEGORIES = ["Reports", "HR", "Contracts", "Finance", "Legal", "Other"]


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

async def seed_default_categories(db: AsyncSession) -> None:
    """Create default categories if table is empty."""
    count = await db.scalar(select(func.count(DocumentCategory.id)))
    if count:
        return
    for name in DEFAULT_CATEGORIES:
        db.add(DocumentCategory(id=_uuid.uuid4(), name=name))
    await db.commit()
    log.info("documents.categories_seeded")


async def list_categories(db: AsyncSession) -> List[DocumentCategory]:
    result = await db.execute(
        select(DocumentCategory)
        .where(DocumentCategory.is_active == True)
        .order_by(DocumentCategory.name)
    )
    return list(result.scalars().all())


async def create_category(db: AsyncSession, data: DocumentCategoryCreate) -> DocumentCategory:
    cat = DocumentCategory(id=_uuid.uuid4(), **data.model_dump())
    db.add(cat)
    await db.commit()
    result = await db.execute(select(DocumentCategory).where(DocumentCategory.id == cat.id))
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

def _base_query():
    return select(Document).options(selectinload(Document.category))


async def list_documents(
    db: AsyncSession,
    related_type: Optional[str] = None,
    related_id: Optional[_uuid.UUID] = None,
    category_id: Optional[_uuid.UUID] = None,
    mime_filter: Optional[str] = None,   # 'pdf' | 'docx' | 'xlsx' | 'image'
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
) -> List[Document]:
    q = _base_query().where(Document.is_active == True)

    if related_type:
        q = q.where(Document.related_type == related_type)
    if related_id:
        q = q.where(Document.related_id == related_id)
    if category_id:
        q = q.where(Document.category_id == category_id)

    if mime_filter:
        mime_map = {
            "pdf": ["application/pdf"],
            "docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                     "application/msword"],
            "xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     "application/vnd.ms-excel"],
            "image": ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"],
        }
        types = mime_map.get(mime_filter, [])
        if types:
            q = q.where(Document.mime_type.in_(types))

    if search:
        term = f"%{search.lower()}%"
        q = q.where(
            Document.title.ilike(term) | Document.tags.ilike(term)
        )

    q = q.order_by(Document.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_document(db: AsyncSession, doc_id: _uuid.UUID) -> Document:
    result = await db.execute(_base_query().where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if doc is None:
        raise ValueError("Document not found")
    return doc


async def create_document(
    db: AsyncSession,
    data: DocumentCreate,
    file_name: str,
    file_path: str,
    file_size: int,
    mime_type: str,
    uploaded_by: _uuid.UUID,
) -> Document:
    doc = Document(
        id=_uuid.uuid4(),
        title=data.title,
        description=data.description,
        category_id=data.category_id,
        related_type=data.related_type,
        related_id=data.related_id,
        tags=data.tags,
        file_name=file_name,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime_type,
        uploaded_by=uploaded_by,
        version=1,
    )
    db.add(doc)
    await db.commit()
    log.info("document.created", title=data.title, id=str(doc.id))
    return await get_document(db, doc.id)


async def update_document(
    db: AsyncSession, doc_id: _uuid.UUID, data: DocumentUpdate
) -> Document:
    doc = await get_document(db, doc_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(doc, field, value)
    await db.commit()
    return await get_document(db, doc_id)


async def deactivate_document(db: AsyncSession, doc_id: _uuid.UUID) -> str:
    """Soft-delete. Returns file_path for MinIO cleanup."""
    doc = await get_document(db, doc_id)
    file_path = doc.file_path
    doc.is_active = False
    await db.commit()
    log.info("document.deactivated", id=str(doc_id))
    return file_path


def resolve_uploader_name(user) -> str:
    return user.full_name if user.full_name else user.email
