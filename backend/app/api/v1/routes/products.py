from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DBDep, require_permission
from app.models.auth import User
from app.models.enums import ProductCategory, ProductStatus, ProductStream
from app.schemas.product import ProductCreate, ProductResponse, ProductStats, ProductUpdate
from app.services import product as svc

router = APIRouter()


# ---------------------------------------------------------------------------
# Revenue masking
# ---------------------------------------------------------------------------

def _has_revenue_perm(user: User) -> bool:
    """True if any of the user's roles carries products.view_revenue."""
    return any(
        p.codename == "products.view_revenue"
        for role in user.roles
        for p in role.permissions
    )


def _mask(product: ProductResponse, user: User) -> ProductResponse:
    """Zero out revenue field for callers without the revenue permission."""
    if not _has_revenue_perm(user):
        product.revenue_generated = None
    return product


def _mask_stats(stats: ProductStats, user: User) -> ProductStats:
    if not _has_revenue_perm(user):
        stats.total_revenue = None
        for cat in stats.by_category:
            cat.revenue = None
    return stats


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=List[ProductResponse])
async def list_products(
    db: DBDep,
    current_user: CurrentUser,
    category: Optional[ProductCategory] = Query(None),
    status: Optional[ProductStatus]     = Query(None),
    stream:  Optional[ProductStream]    = Query(None),
    search:  Optional[str]              = Query(None),
    skip:    int                        = Query(0, ge=0),
    limit:   int                        = Query(100, ge=1, le=500),
):
    products = await svc.list_products(
        db,
        category=category, status=status, stream=stream,
        search=search, skip=skip, limit=limit,
    )
    return [
        _mask(ProductResponse.model_validate(p), current_user)
        for p in products
    ]


@router.get("/stats", response_model=ProductStats)
async def get_stats(db: DBDep, current_user: CurrentUser):
    stats = await svc.get_stats(db)
    return _mask_stats(stats, current_user)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: uuid.UUID, db: DBDep, current_user: CurrentUser):
    try:
        product = await svc.get_product(db, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _mask(ProductResponse.model_validate(product), current_user)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[require_permission("products.create")])
async def create_product(
    data: ProductCreate,
    db: DBDep,
    current_user: CurrentUser,
):
    user_roles = [r.name for r in current_user.roles]
    try:
        product = await svc.create_product(db, data, user_roles, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return _mask(ProductResponse.model_validate(product), current_user)


@router.put("/{product_id}", response_model=ProductResponse,
            dependencies=[require_permission("products.edit")])
async def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    db: DBDep,
    current_user: CurrentUser,
):
    user_roles = [r.name for r in current_user.roles]
    try:
        product = await svc.update_product(db, product_id, data, user_roles, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _mask(ProductResponse.model_validate(product), current_user)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[require_permission("products.delete")])
async def delete_product(
    product_id: uuid.UUID,
    db: DBDep,
    current_user: CurrentUser,
):
    try:
        await svc.deactivate_product(db, product_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/{product_id}/documents", response_model=List[dict])
async def list_product_documents(
    product_id: uuid.UUID,
    db: DBDep,
    current_user: CurrentUser,
):
    """List documents attached to a product via the polymorphic Document pattern."""
    from sqlalchemy import select
    from app.models.document import Document

    result = await db.execute(
        select(Document).where(
            Document.related_type == "product",
            Document.related_id == product_id,
            Document.is_active.is_(True),
        ).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "title": d.title,
            "file_name": d.file_name,
            "mime_type": d.mime_type,
            "file_size": d.file_size,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]
