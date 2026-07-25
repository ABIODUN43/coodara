"""
Authentication API routes.

Responsible for:

- GitHub OAuth login
- OAuth callback processing
- Token refresh
- Logout

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.db.session import get_db

from app.schemas.auth import (
    AuthResponse,
    LogoutRequest,
    LogoutResponse,
    RefreshRequest,
    RefreshResponse,
    AuthenticatedUserResponse,
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

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.get(
    "/github",
)
async def github_login():
    """
    Redirect user to GitHub OAuth.
    """

    url = (
        await github_oauth_service
        .get_authorization_url()
    )

    return {
        "authorization_url": url
    }


@router.get(
    "/callback",
    response_model=AuthResponse,
)
async def github_callback(
    code: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    GitHub OAuth callback.
    """

    try:

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

        tokens = await auth_service.create_session(
            user
        )

        return AuthResponse(
            user=user,
            access_token=tokens[
                "access_token"
            ],
            refresh_token=tokens[
                "refresh_token"
            ],
        )

    except Exception as exc:

        raise HTTPException(
            status_code=
            status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
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
        payload.refresh_token,
    )

    return LogoutResponse()


@router.get(
    "/me",
    response_model=AuthenticatedUserResponse,
)
async def get_current_user_profile(
    current_user: User = Depends(
        get_current_active_user
    ),
):
    """
    Retrieve the currently
    authenticated user.

    Requires a valid access token.

    Returns:
        Current user profile.
    """

    return AuthenticatedUserResponse(
        user=current_user
    )