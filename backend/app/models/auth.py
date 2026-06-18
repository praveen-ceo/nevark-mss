from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Table,
    UUID,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseModel

if TYPE_CHECKING:
    from app.models.employee import Employee

# ---------------------------------------------------------------------------
# Association tables
# ---------------------------------------------------------------------------

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column(
        "role_id",
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "permission_id",
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column(
        "user_id",
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "role_id",
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class User(BaseModel):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        Index("ix_users_email", "email"),
        Index("ix_users_is_active", "is_active"),
    )

    email: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    roles: Mapped[List[Role]] = relationship(
        "Role", secondary=user_roles, back_populates="users"
    )
    employee: Mapped[Optional[Employee]] = relationship(
        "Employee", back_populates="user", uselist=False
    )


class Role(BaseModel):
    __tablename__ = "roles"
    __table_args__ = (UniqueConstraint("name", name="uq_roles_name"),)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    users: Mapped[List[User]] = relationship(
        "User", secondary=user_roles, back_populates="roles"
    )
    permissions: Mapped[List[Permission]] = relationship(
        "Permission", secondary=role_permissions, back_populates="roles"
    )


class Permission(BaseModel):
    __tablename__ = "permissions"
    __table_args__ = (
        UniqueConstraint("codename", name="uq_permissions_codename"),
        Index("ix_permissions_module", "module"),
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    codename: Mapped[str] = mapped_column(String(100), nullable=False)
    module: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    roles: Mapped[List[Role]] = relationship(
        "Role", secondary=role_permissions, back_populates="permissions"
    )
