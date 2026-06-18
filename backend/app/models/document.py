from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    Index,
    String,
    Text,
    UUID,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class DocumentCategory(BaseModel):
    __tablename__ = "document_categories"
    __table_args__ = (
        UniqueConstraint("name", "parent_id", name="uq_doc_categories_name_parent"),
        Index("ix_document_categories_parent_id", "parent_id"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_categories.id", ondelete="SET NULL"),
        nullable=True,
    )

    parent: Mapped[Optional[DocumentCategory]] = relationship(
        "DocumentCategory",
        back_populates="children",
        remote_side="DocumentCategory.id",
        foreign_keys=[parent_id],
    )
    children: Mapped[List[DocumentCategory]] = relationship(
        "DocumentCategory", back_populates="parent", foreign_keys=[parent_id]
    )
    documents: Mapped[List[Document]] = relationship(
        "Document", back_populates="category"
    )


class Document(BaseModel):
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_category_id", "category_id"),
        Index("ix_documents_related", "related_type", "related_id"),
        Index("ix_documents_uploaded_by", "uploaded_by"),
    )

    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Polymorphic reference: related_type = 'project' | 'client' | 'contract' | 'employee' | 'invoice'
    related_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    related_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    version: Mapped[int] = mapped_column(BigInteger, default=1, nullable=False)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    category: Mapped[Optional[DocumentCategory]] = relationship(
        "DocumentCategory", back_populates="documents"
    )
