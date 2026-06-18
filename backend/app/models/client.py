from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, UUID, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.contract import Contract
    from app.models.finance import Invoice
    from app.models.project import Project


class Client(BaseModel):
    __tablename__ = "clients"
    __table_args__ = (
        Index("ix_clients_name", "name"),
        Index("ix_clients_is_active", "is_active"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    contacts: Mapped[List[ClientContact]] = relationship(
        "ClientContact", back_populates="client"
    )
    projects: Mapped[List[Project]] = relationship("Project", back_populates="client")
    invoices: Mapped[List[Invoice]] = relationship("Invoice", back_populates="client")
    contracts: Mapped[List[Contract]] = relationship("Contract", back_populates="client")


class ClientContact(BaseModel):
    __tablename__ = "client_contacts"
    __table_args__ = (
        Index("ix_client_contacts_client_id", "client_id"),
        Index("ix_client_contacts_is_primary", "is_primary"),
    )

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    designation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    client: Mapped[Client] = relationship("Client", back_populates="contacts")
