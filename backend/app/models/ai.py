from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UUID,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import AIMessageRole

if TYPE_CHECKING:
    from app.models.auth import User


class AIChatSession(BaseModel):
    __tablename__ = "ai_chat_sessions"
    __table_args__ = (
        Index("ix_ai_chat_sessions_user_id", "user_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # Freeform context bag: {"module": "finance", "entity_id": "...", ...}
    context: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped[User] = relationship("User")
    messages: Mapped[List[AIChatMessage]] = relationship(
        "AIChatMessage",
        back_populates="session",
        order_by="AIChatMessage.created_at",
    )


class AIChatMessage(BaseModel):
    __tablename__ = "ai_chat_messages"
    __table_args__ = (
        Index("ix_ai_chat_messages_session_id", "session_id"),
    )

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[AIMessageRole] = mapped_column(
        Enum(AIMessageRole, name="ai_message_role_enum"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Store tool calls / function results for LangGraph
    metadata_: Mapped[Optional[dict]] = mapped_column(
        "metadata", JSONB, nullable=True
    )

    session: Mapped[AIChatSession] = relationship(
        "AIChatSession", back_populates="messages"
    )
