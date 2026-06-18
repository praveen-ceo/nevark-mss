from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Date,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UUID,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import RiskLevel

if TYPE_CHECKING:
    from app.models.finance import Invoice
    from app.models.project import Project


class RevenuePrediction(BaseModel):
    __tablename__ = "revenue_predictions"
    __table_args__ = (
        Index("ix_revenue_predictions_period", "period_start", "period_end"),
    )

    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    predicted_amount: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    actual_amount: Mapped[Optional[Numeric]] = mapped_column(Numeric(15, 2), nullable=True)
    confidence_score: Mapped[Optional[Numeric]] = mapped_column(
        Numeric(5, 4), nullable=True
    )  # 0.0000–1.0000
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    features: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class PaymentRiskPrediction(BaseModel):
    __tablename__ = "payment_risk_predictions"
    __table_args__ = (
        Index("ix_payment_risk_invoice_id", "invoice_id"),
        Index("ix_payment_risk_level", "risk_level"),
    )

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
    )
    risk_score: Mapped[Numeric] = mapped_column(Numeric(5, 4), nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, name="risk_level_enum"), nullable=False
    )
    predicted_delay_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    factors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)

    invoice: Mapped[Invoice] = relationship("Invoice", back_populates="risk_prediction")


class ProjectDelayPrediction(BaseModel):
    __tablename__ = "project_delay_predictions"
    __table_args__ = (
        Index("ix_project_delay_project_id", "project_id"),
        Index("ix_project_delay_risk_level", "risk_level"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    risk_score: Mapped[Numeric] = mapped_column(Numeric(5, 4), nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, name="risk_level_enum"), nullable=False
    )
    predicted_delay_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    factors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)

    project: Mapped[Project] = relationship("Project")
