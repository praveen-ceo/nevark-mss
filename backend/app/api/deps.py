import uuid
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db
from app.models.auth import User
from app.services.auth import get_user_by_id

_bearer = HTTPBearer()

DBDep = Annotated[AsyncSession, Depends(get_db)]
TokenDep = Annotated[HTTPAuthorizationCredentials, Depends(_bearer)]


async def get_current_user(db: DBDep, creds: TokenDep) -> User:
    try:
        user_id = decode_token(creds.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )
    try:
        return await get_user_by_id(db, uuid.UUID(user_id))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found"
        )


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_permission(codename: str) -> Any:
    """
    Usage:
        @router.get("/...", dependencies=[require_permission("projects.create")])
    or:
        async def route(user: User = require_permission("projects.create")):
    """
    async def _guard(current_user: CurrentUser) -> User:
        perms = {
            p.codename
            for role in current_user.roles
            for p in role.permissions
        }
        if codename not in perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {codename}",
            )
        return current_user

    return Depends(_guard)
