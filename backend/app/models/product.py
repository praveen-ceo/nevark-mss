from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    BigInteger,
    Date,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UUID,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import ProductCategory, ProductStatus, ProductStream

if TYPE_CHECKING:
    from app.models.employee import Employee


class Product(BaseModel):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("product_code", name="uq_products_code"),
        Index("ix_products_category", "category"),
        Index("ix_products_status", "status"),
        Index("ix_products_owner_id", "product_owner_id"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_code: Mapped[str] = mapped_column(String(100), nullable=False)

    category: Mapped[ProductCategory] = mapped_column(
        Enum(
            ProductCategory,
            name="product_category_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
    )
    stream: Mapped[ProductStream] = mapped_column(
        Enum(
            ProductStream,
            name="product_stream_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
    )
    status: Mapped[ProductStatus] = mapped_column(
        Enum(
            ProductStatus,
            name="product_status_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=ProductStatus.ACTIVE,
        nullable=False,
    )

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    launch_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Business metrics
    revenue_generated: Mapped[Optional[Numeric]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    units_sold: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    active_units: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    total_customers: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    # Owner — nullable FK to employees
    product_owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )

    product_owner: Mapped[Optional[Employee]] = relationship(
        "Employee", foreign_keys=[product_owner_id]
    )
