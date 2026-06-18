from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Date,
    DateTime,
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
from app.models.enums import (
    ExpenseCategory,
    ExpenseStatus,
    InvoiceStatus,
    PaymentMethod,
    PaymentStatus,
)

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.employee import Employee
    from app.models.prediction import PaymentRiskPrediction
    from app.models.project import Project


class Invoice(BaseModel):
    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("invoice_number", name="uq_invoices_number"),
        Index("ix_invoices_client_id", "client_id"),
        Index("ix_invoices_project_id", "project_id"),
        Index("ix_invoices_status", "status"),
        Index("ix_invoices_due_date", "due_date"),
    )

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status_enum"),
        default=InvoiceStatus.DRAFT,
        nullable=False,
    )
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    subtotal: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    tax_rate: Mapped[Numeric] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    tax_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    discount_amount: Mapped[Numeric] = mapped_column(
        Numeric(15, 2), default=0, nullable=False
    )
    total_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    paid_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    client: Mapped[Client] = relationship("Client", back_populates="invoices")
    project: Mapped[Optional[Project]] = relationship("Project", back_populates="invoices")
    items: Mapped[List[InvoiceItem]] = relationship(
        "InvoiceItem", back_populates="invoice"
    )
    payments: Mapped[List[Payment]] = relationship("Payment", back_populates="invoice")
    risk_prediction: Mapped[Optional[PaymentRiskPrediction]] = relationship(
        "PaymentRiskPrediction", back_populates="invoice", uselist=False
    )


class InvoiceItem(BaseModel):
    __tablename__ = "invoice_items"
    __table_args__ = (Index("ix_invoice_items_invoice_id", "invoice_id"),)

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    invoice: Mapped[Invoice] = relationship("Invoice", back_populates="items")


class Payment(BaseModel):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_invoice_id", "invoice_id"),
        Index("ix_payments_status", "status"),
        Index("ix_payments_payment_date", "payment_date"),
    )

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method_enum"), nullable=False
    )
    reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status_enum"),
        default=PaymentStatus.PENDING,
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    invoice: Mapped[Invoice] = relationship("Invoice", back_populates="payments")


class Expense(BaseModel):
    __tablename__ = "expenses"
    __table_args__ = (
        Index("ix_expenses_project_id", "project_id"),
        Index("ix_expenses_employee_id", "employee_id"),
        Index("ix_expenses_status", "status"),
        Index("ix_expenses_date", "date"),
    )

    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
    )
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    category: Mapped[ExpenseCategory] = mapped_column(
        Enum(ExpenseCategory, name="expense_category_enum"), nullable=False
    )
    amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[ExpenseStatus] = mapped_column(
        Enum(ExpenseStatus, name="expense_status_enum"),
        default=ExpenseStatus.PENDING,
        nullable=False,
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    project: Mapped[Optional[Project]] = relationship("Project", back_populates="expenses")
    employee: Mapped[Employee] = relationship(
        "Employee", foreign_keys=[employee_id], back_populates="expenses"
    )
    approver: Mapped[Optional[Employee]] = relationship(
        "Employee", foreign_keys=[approved_by]
    )
