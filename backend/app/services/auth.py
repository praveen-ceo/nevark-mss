import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    verify_password,
)
from app.models.auth import Role, User
from app.schemas.auth import TokenResponse

log = structlog.get_logger(__name__)


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(
        select(User)
        .where(User.email == email, User.is_active.is_(True))
        .options(selectinload(User.roles).selectinload(Role.permissions))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise ValueError("Invalid credentials")
    log.info("user.login", user_id=str(user.id))
    return user


def issue_tokens(user_id: uuid.UUID) -> TokenResponse:
    uid = str(user_id)
    return TokenResponse(
        access_token=create_access_token(uid),
        refresh_token=create_refresh_token(uid),
    )


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> TokenResponse:
    from jose import JWTError

    try:
        user_id = decode_refresh_token(refresh_token)
    except JWTError as exc:
        raise ValueError("Invalid refresh token") from exc

    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id), User.is_active.is_(True))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found or inactive")
    return issue_tokens(user.id)


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(
        select(User)
        .where(User.id == user_id, User.is_active.is_(True))
        .options(selectinload(User.roles).selectinload(Role.permissions))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found")
    return user
