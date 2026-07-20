"""
Authentication API endpoints.

Responsible for:

- GitHub OAuth login
- OAuth callback handling
- Access token refresh
- User logout
- Current user retrieval

Authentication Flow:

Frontend
    ↓
GET /auth/github
    ↓
GitHub OAuth
    ↓
GET /auth/github/callback
    ↓
JWT + Refresh Token
    ↓
Dashboard
    ↓
GET /auth/me

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Header,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import (
    TokenResponse,
    RefreshRequest,
    RefreshResponse,
    LogoutResponse,
    AuthenticatedUserResponse,
)
from app.services.auth_service import (
    auth_service,
)
from app.services.github_service import (
    github_service,
)
from app.core.security import (
    verify_token,
    decode_token,
)
from app.models.user import User
from sqlalchemy import select

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> User:

    if not authorization.startswith(
        "Bearer "
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header.",
        )

    token = authorization.replace(
        "Bearer ", ""
    )

    payload = verify_token(token)

    user_id = payload["sub"]

    stmt = select(User).where(
        User.id == int(user_id)
    )

    result = await db.execute(stmt)

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return user

@router.get("/github")
async def github_login():

    return {
        "url":
        github_service.get_github_authorization_url()
    }

@router.get(
    "/github/callback",
    response_model=TokenResponse,
)
async def github_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
):

    try:

        github_token = (
            await github_service
            .exchange_code_for_token(
                code
            )
        )

        github_user = (
            await github_service
            .get_github_user(
                github_token
            )
        )

        user = (
            await auth_service
            .authenticate_github_user(
                db,
                github_user,
            )
        )

        tokens = (
            await auth_service
            .create_session(
                db,
                user,
            )
        )

        return TokenResponse(
            access_token=tokens[
                "access_token"
            ],
            refresh_token=tokens[
                "refresh_token"
            ],
        )

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

@router.post(
    "/refresh",
    response_model=RefreshResponse,
)
async def refresh_token(
    payload: RefreshRequest,
):

    try:

        access_token = (
            await auth_service
            .refresh_access_token(
                payload.refresh_token
            )
        )

        return RefreshResponse(
            access_token=access_token
        )

    except Exception:

        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token.",
        )

@router.get(
    "/me",
    response_model=AuthenticatedUserResponse,
)
async def get_me(
    current_user: User = Depends(
        get_current_user
    ),
):

    return AuthenticatedUserResponse(
        user=current_user
    )