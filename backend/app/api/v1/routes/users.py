from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DBDep
from app.schemas.user import (
    PasswordChangeRequest,
    PasswordChangeResponse,
    ProfileResponse,
    ProfileUpdate,
)
from app.services import user as svc

router = APIRouter()


@router.get(
    "/me",
    response_model=ProfileResponse,
    summary="Get my profile",
)
async def get_my_profile(db: DBDep, current_user: CurrentUser) -> ProfileResponse:
    """Return the authenticated user's profile, including linked employee details."""
    return await svc.get_my_profile(db, current_user)


@router.put(
    "/me",
    response_model=ProfileResponse,
    summary="Update my profile",
)
async def update_my_profile(
    data: ProfileUpdate,
    db: DBDep,
    current_user: CurrentUser,
) -> ProfileResponse:
    """
    Update name, email, phone, address, job title, or department.
    Only provided (non-null) fields are written.
    """
    try:
        return await svc.update_my_profile(db, current_user, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@router.put(
    "/change-password",
    response_model=PasswordChangeResponse,
    summary="Change my password",
)
async def change_my_password(
    data: PasswordChangeRequest,
    db: DBDep,
    current_user: CurrentUser,
) -> PasswordChangeResponse:
    """
    Change the authenticated user's password.
    Requires the current password for verification.
    """
    try:
        return await svc.change_my_password(db, current_user, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")
