"""
Authentication API endpoints.

Responsible for:

- GitHub OAuth login
- GitHub OAuth callback
- Access token refresh
- Logout
- Current user retrieval

Authentication Flow

Frontend
    ↓
GET /auth/github
    ↓
GitHub OAuth
    ↓
GET /auth/callback
    ↓
Backend creates session
    ↓
Redirect Frontend
    ↓
Frontend stores tokens
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
    Query,
)

from fastapi.responses import (
    RedirectResponse,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.db.session import (
    get_db,
)

from app.schemas.auth import (
    AuthenticatedUserResponse,
    LogoutRequest,
    LogoutResponse,
    RefreshRequest,
    RefreshResponse,
)

from app.services.auth_service import (
    auth_service,
)

from app.services.github_oauth_service import (
    github_oauth_service,
)

from app.api.dependencies import (
    get_current_active_user,
)

from app.models.user import User

from app.core.config import settings

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.get(
    "/github",
)
async def github_login():
    """
    Generate GitHub OAuth URL.
    """

    authorization_url = (
        await github_oauth_service
        .get_authorization_url()
    )

    return RedirectResponse(
        url=authorization_url
    )


@router.get(
    "/callback",
)
async def github_callback(
    code: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    GitHub OAuth callback.
    """

    github_access_token = (
        await github_oauth_service
        .exchange_code_for_token(
            code
        )
    )

    github_user = (
        await github_oauth_service
        .get_github_user(
            github_access_token
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
            user
        )
    )

    frontend_url = (
        f"{settings.FRONTEND_URL}/auth/callback"
    )

    return RedirectResponse(
        url=(
            f"{frontend_url}"
            f"?access_token="
            f"{tokens['access_token']}"
            f"&refresh_token="
            f"{tokens['refresh_token']}"
        )
    )


@router.post(
    "/refresh",
    response_model=RefreshResponse,
)
async def refresh_token(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh access token.
    """

    access_token = (
        await auth_service
        .refresh_access_token(
            db,
            payload.refresh_token,
        )
    )

    return RefreshResponse(
        access_token=access_token
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
)
async def logout(
    payload: LogoutRequest,
):
    """
    Logout user.
    """

    await auth_service.logout_user(
        payload.refresh_token
    )

    return LogoutResponse()


@router.get(
    "/me",
    response_model=
    AuthenticatedUserResponse,
)
async def get_current_user_profile(
    current_user: User = Depends(
        get_current_active_user
    ),
):
    """
    Retrieve authenticated user.
    """

    return AuthenticatedUserResponse(
        user=current_user
    )