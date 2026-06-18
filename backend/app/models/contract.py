from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
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
from app.models.enums import (
    ContractStatus,
    RiskProbability,
    RiskSeverity,
    RiskStatus,
)

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.project import Project


class Contract(BaseModel):
    __tablename__ = "contracts"
    __table_args__ = (
        UniqueConstraint("contract_number", name="uq_contracts_number"),
        Index("ix_contracts_client_id", "client_id"),
        Index("ix_contracts_project_id", "project_id"),
        Index("ix_contracts_status", "status"),
        Index("ix_contracts_end_date", "end_date"),
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
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    contract_number: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[ContractStatus] = mapped_column(
        Enum(ContractStatus, name="contract_status_enum"),
        default=ContractStatus.DRAFT,
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[Numeric] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    client: Mapped[Client] = relationship("Client", back_populates="contracts")
    project: Mapped[Optional[Project]] = relationship("Project", back_populates="contracts")
    risks: Mapped[List[ContractRisk]] = relationship(
        "ContractRisk", back_populates="contract"
    )


class ContractRisk(BaseModel):
    __tablename__ = "contract_risks"
    __table_args__ = (
        Index("ix_contract_risks_contract_id", "contract_id"),
        Index("ix_contract_risks_status", "status"),
        Index("ix_contract_risks_severity", "severity"),
    )

    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[RiskSeverity] = mapped_column(
        Enum(RiskSeverity, name="risk_severity_enum"), nullable=False
    )
    probability: Mapped[RiskProbability] = mapped_column(
        Enum(RiskProbability, name="risk_probability_enum"), nullable=False
    )
    mitigation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[RiskStatus] = mapped_column(
        Enum(RiskStatus, name="risk_status_enum"),
        default=RiskStatus.IDENTIFIED,
        nullable=False,
    )

    contract: Mapped[Contract] = relationship("Contract", back_populates="risks")
