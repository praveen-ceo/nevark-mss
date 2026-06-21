from __future__ import annotations

import uuid
from decimal import Decimal
from typing import List, Optional

import structlog
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import ProductCategory, ProductStatus, ProductStream
from app.models.product import Product
from app.schemas.product import CategoryStat, ProductCreate, ProductStats, ProductUpdate

log = structlog.get_logger(__name__)

# Categories that CTO is allowed to manage
_CTO_CATEGORIES = {ProductCategory.TECHNOLOGIES, ProductCategory.SYSTEMS}

# Human-readable labels for category stats
_CATEGORY_LABELS = {
    ProductCategory.TECHNOLOGIES:      "NEVARK Technologies",
    ProductCategory.FASHION_BOUTIQUES: "NEVARK Fashion & Boutiques",
    ProductCategory.LOGISTICS:         "NEVARK Logistics",
    ProductCategory.FOODS:             "NEVARK Foods",
    ProductCategory.SYSTEMS:           "NEVARK Systems",
}


def _base_q():
    return select(Product).options(selectinload(Product.product_owner))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check_cto_category(user_roles: list[str], category: ProductCategory) -> None:
    """Raise ValueError if a CTO tries to manage a category outside their scope."""
    if "cto" in user_roles and category not in _CTO_CATEGORIES:
        raise PermissionError(
            f"CTO role can only manage NEVARK Technologies and NEVARK Systems products. "
            f"Category '{category.value}' is not permitted."
        )


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------

async def list_products(
    db: AsyncSession,
    *,
    category: Optional[ProductCategory] = None,
    status: Optional[ProductStatus] = None,
    stream: Optional[ProductStream] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Product]:
    q = _base_q().where(Product.is_active.is_(True))
    if category:
        q = q.where(Product.category == category)
    if status:
        q = q.where(Product.status == status)
    if stream:
        q = q.where(Product.stream == stream)
    if search:
        s = f"%{search}%"
        q = q.where(
            or_(Product.name.ilike(s), Product.product_code.ilike(s))
        )
    q = q.order_by(Product.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_product(db: AsyncSession, product_id: uuid.UUID) -> Product:
    result = await db.execute(
        _base_q().where(Product.id == product_id, Product.is_active.is_(True))
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise ValueError("Product not found.")
    return product


async def get_stats(db: AsyncSession) -> ProductStats:
    # Aggregate totals in one query
    totals = await db.execute(
        select(
            func.count().filter(Product.is_active.is_(True)).label("total"),
            func.count().filter(
                Product.is_active.is_(True), Product.status == ProductStatus.ACTIVE
            ).label("active"),
            func.coalesce(
                func.sum(Product.total_customers).filter(Product.is_active.is_(True)), 0
            ).label("customers"),
            func.coalesce(
                func.sum(Product.revenue_generated).filter(Product.is_active.is_(True)), 0
            ).label("revenue"),
        )
    )
    row = totals.one()

    # Per-category breakdown in one query
    cat_rows = await db.execute(
        select(
            Product.category,
            func.count().label("total"),
            func.count().filter(Product.status == ProductStatus.ACTIVE).label("active"),
            func.coalesce(func.sum(Product.revenue_generated), 0).label("revenue"),
        )
        .where(Product.is_active.is_(True))
        .group_by(Product.category)
    )

    by_category = [
        CategoryStat(
            category=r.category,
            label=_CATEGORY_LABELS.get(r.category, r.category.value),
            total=r.total,
            active=r.active,
            revenue=Decimal(str(r.revenue)),
        )
        for r in cat_rows.all()
    ]

    return ProductStats(
        total_products=row.total,
        active_products=row.active,
        total_customers=row.customers,
        total_revenue=Decimal(str(row.revenue)),
        by_category=by_category,
    )


# ---------------------------------------------------------------------------
# Write
# ---------------------------------------------------------------------------

async def create_product(
    db: AsyncSession,
    data: ProductCreate,
    user_roles: list[str],
    created_by: uuid.UUID,
) -> Product:
    _check_cto_category(user_roles, data.category)

    # Unique code check
    existing = await db.scalar(
        select(func.count()).where(Product.product_code == data.product_code)
    )
    if existing:
        raise ValueError(f"Product code '{data.product_code}' is already in use.")

    product = Product(
        id=uuid.uuid4(),
        created_by=created_by,
        **data.model_dump(),
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    log.info("product.created", code=data.product_code, category=data.category.value)
    return await get_product(db, product.id)


async def update_product(
    db: AsyncSession,
    product_id: uuid.UUID,
    data: ProductUpdate,
    user_roles: list[str],
    updated_by: uuid.UUID,
) -> Product:
    product = await get_product(db, product_id)

    # If category is being changed, or if no change but product already in a restricted category
    target_category = data.category if data.category is not None else product.category
    _check_cto_category(user_roles, target_category)

    payload = data.model_dump(exclude_none=True)
    for k, v in payload.items():
        setattr(product, k, v)
    product.updated_by = updated_by

    await db.commit()
    await db.refresh(product)
    log.info("product.updated", product_id=str(product_id))
    return await get_product(db, product_id)


async def deactivate_product(
    db: AsyncSession,
    product_id: uuid.UUID,
    deleted_by: uuid.UUID,
) -> None:
    from datetime import datetime, timezone
    product = await get_product(db, product_id)
    product.is_active = False
    product.deleted_at = datetime.now(timezone.utc)
    product.updated_by = deleted_by
    await db.commit()
    log.info("product.deactivated", product_id=str(product_id))
