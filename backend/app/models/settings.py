from __future__ import annotations

from typing import Optional

from sqlalchemy import Numeric, String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class FinanceSettings(BaseModel):
    """Single-row company finance configuration. Enforced at service layer."""

    __tablename__ = "finance_settings"

    # Company details
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    company_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    pan: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    # GST settings
    company_gstin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    state_code: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    cgst_rate: Mapped[Numeric] = mapped_column(Numeric(5, 2), default=9, nullable=False)
    sgst_rate: Mapped[Numeric] = mapped_column(Numeric(5, 2), default=9, nullable=False)
    igst_rate: Mapped[Numeric] = mapped_column(Numeric(5, 2), default=18, nullable=False)

    # Bank details
    bank_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bank_account: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_ifsc: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bank_branch: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Invoice settings
    invoice_prefix: Mapped[str] = mapped_column(String(10), default="NVK", nullable=False)
    default_sac: Mapped[str] = mapped_column(String(20), default="998314", nullable=False)
    payment_terms: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    default_currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
