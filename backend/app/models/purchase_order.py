from __future__ import annotations

import uuid
from datetime import date
from typing import List, Optional

from sqlalchemy import (
    Date,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UUID,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import POStatus


class PurchaseOrder(BaseModel):
    __tablename__ = "purchase_orders"
    __table_args__ = (
        UniqueConstraint("po_number", name="uq_purchase_orders_number"),
        Index("ix_purchase_orders_status", "status"),
        Index("ix_purchase_orders_order_date", "order_date"),
    )

    po_number: Mapped[str] = mapped_column(String(50), nullable=False)
    vendor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    vendor_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vendor_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    status: Mapped[POStatus] = mapped_column(
        Enum(POStatus, name="po_status_enum"),
        default=POStatus.DRAFT,
        nullable=False,
    )
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_delivery: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_delivery: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    subtotal: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    tax_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    total_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    items: Mapped[List[POItem]] = relationship("POItem", back_populates="purchase_order")


class POItem(BaseModel):
    __tablename__ = "po_items"
    __table_args__ = (Index("ix_po_items_po_id", "po_id"),)

    po_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    purchase_order: Mapped[PurchaseOrder] = relationship(
        "PurchaseOrder", back_populates="items"
    )
