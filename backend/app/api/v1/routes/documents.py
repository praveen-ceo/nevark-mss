"""Documents API routes."""
from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Form, HTTPException, Query, UploadFile, status

from app.api.deps import CurrentUser, DBDep
from app.schemas.documents import (
    DocumentCategoryCreate,
    DocumentCategoryResponse,
    DocumentCreate,
    DocumentResponse,
    DocumentUpdate,
    DownloadUrlResponse,
)
from app.services import documents as svc
from app.services import storage
import app.services.notifications as notif_svc

router = APIRouter()

_PRESIGN_MINUTES = 15


def _to_response(doc, user) -> DocumentResponse:
    data = DocumentResponse.model_validate(doc)
    data.uploader_name = svc.resolve_uploader_name(user)
    return data


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@router.get("/categories", response_model=List[DocumentCategoryResponse])
async def list_categories(db: DBDep, _: CurrentUser):
    await svc.seed_default_categories(db)
    return await svc.list_categories(db)


@router.post(
    "/categories",
    response_model=DocumentCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(data: DocumentCategoryCreate, db: DBDep, _: CurrentUser):
    try:
        return await svc.create_category(db, data)
    except Exception as exc:
        raise HTTPException(500, detail=f"{type(exc).__name__}: {exc}")


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    db: DBDep,
    current_user: CurrentUser,
    related_type: Optional[str] = Query(None),
    related_id: Optional[uuid.UUID] = Query(None),
    category_id: Optional[uuid.UUID] = Query(None),
    mime_filter: Optional[str] = Query(None, description="pdf|docx|xlsx|image"),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
):
    docs = await svc.list_documents(
        db,
        related_type=related_type,
        related_id=related_id,
        category_id=category_id,
        mime_filter=mime_filter,
        search=search,
        skip=skip,
        limit=limit,
    )
    return [_to_response(d, current_user) for d in docs]


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    db: DBDep,
    current_user: CurrentUser,
    file: UploadFile,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category_id: Optional[uuid.UUID] = Form(None),
    related_type: Optional[str] = Form(None),
    related_id: Optional[uuid.UUID] = Form(None),
    tags: Optional[str] = Form(None),
):
    try:
        object_key, file_size, mime_type = await storage.upload_file(
            file,
            related_type=related_type,
            related_id=str(related_id) if related_id else None,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    data = DocumentCreate(
        title=title,
        description=description,
        category_id=category_id,
        related_type=related_type,
        related_id=related_id,
        tags=tags,
    )
    try:
        doc = await svc.create_document(
            db,
            data=data,
            file_name=file.filename or "upload",
            file_path=object_key,
            file_size=file_size,
            mime_type=mime_type,
            uploaded_by=current_user.id,
        )
    except Exception as exc:
        # MinIO object uploaded but DB failed — attempt cleanup
        storage.delete_object(object_key)
        raise HTTPException(500, detail=f"DB error: {type(exc).__name__}: {exc}")

    try:
        await notif_svc.push(db, "document", f"Document uploaded: {doc.title}", entity_id=doc.id)
    except Exception:
        pass

    return _to_response(doc, current_user)


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: uuid.UUID, db: DBDep, current_user: CurrentUser):
    try:
        doc = await svc.get_document(db, doc_id)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return _to_response(doc, current_user)


@router.get("/{doc_id}/download", response_model=DownloadUrlResponse)
async def download_document(doc_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        doc = await svc.get_document(db, doc_id)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    try:
        url = storage.get_presigned_url(doc.file_path, expires_minutes=_PRESIGN_MINUTES)
    except RuntimeError as exc:
        raise HTTPException(502, detail=str(exc))
    return DownloadUrlResponse(url=url, expires_in_minutes=_PRESIGN_MINUTES)


@router.put("/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: uuid.UUID, data: DocumentUpdate, db: DBDep, current_user: CurrentUser
):
    try:
        doc = await svc.update_document(db, doc_id, data)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(500, detail=f"{type(exc).__name__}: {exc}")
    return _to_response(doc, current_user)



@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        file_path = await svc.deactivate_document(db, doc_id)
        if file_path:
            storage.delete_object(file_path)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
