from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DBDep
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse, UserOut
from app.services.auth import authenticate, issue_tokens, refresh_tokens

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: DBDep) -> TokenResponse:
    try:
        user = await authenticate(db, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    return issue_tokens(user.id)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: DBDep) -> TokenResponse:
    try:
        return await refresh_tokens(db, payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> None:
    # Stateless JWT — client discards the token.
    # To add token blacklisting, push the JTI to Redis here.
    pass


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser) -> UserOut:
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_verified=current_user.is_verified,
        roles=[role.name for role in current_user.roles],
    )
