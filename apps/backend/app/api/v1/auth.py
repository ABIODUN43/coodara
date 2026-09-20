"""
Authentication API endpoints.

Responsible for:

- GitHub OAuth login
- GitHub OAuth callback
- Access-token refresh
- Logout
- Current-user retrieval

Authentication cookies are HttpOnly.
Coodara refresh sessions are stored in Redis.
GitHub OAuth credentials are encrypted server-side.
"""

from __future__ import annotations

import logging
from typing import Annotated, Literal
from urllib.parse import quote_plus

from app.api.dependencies import get_current_active_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthenticatedUserResponse,
    LogoutResponse,
    RefreshResponse,
)
from app.services.auth_service import auth_service
from app.services.github_credential_service import (
    github_credential_service,
)
from app.services.github_oauth_service import (
    GitHubOAuthError,
    github_oauth_service,
)
from app.services.github_oauth_state_service import (
    github_oauth_state_service,
)
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    status,
)
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

ACCESS_TOKEN_COOKIE = "coodara_access_token"
REFRESH_TOKEN_COOKIE = "coodara_refresh_token"
OAUTH_STATE_COOKIE = "coodara_github_oauth_state"

AUTH_COOKIE_PATH = "/"
REFRESH_COOKIE_PATH = "/api/v1/auth"
OAUTH_STATE_COOKIE_PATH = "/api/v1/auth"


def _is_secure_cookie() -> bool:
    """
    Authentication cookies require HTTPS in production.
    """

    return settings.ENVIRONMENT == "production"


def _cookie_samesite() -> Literal["none", "lax"]:
    """
    Cross-site cookies between frontend and backend on Render subdomains
    (e.g., coodara-frontend.onrender.com -> coodara-backend.onrender.com)
    require SameSite=None and Secure=True in production.
    In local development without HTTPS, SameSite=Lax is used.
    """

    return "none" if _is_secure_cookie() else "lax"


def _set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str,
) -> None:
    """
    Set Coodara authentication cookies.
    """

    secure = _is_secure_cookie()
    samesite = _cookie_samesite()

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path=AUTH_COOKIE_PATH,
    )

    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )


def _set_oauth_state_cookie(
    response: Response,
    state: str,
) -> None:
    """
    Store OAuth state in a short-lived browser cookie.

    The state is also stored server-side in Redis.
    """

    response.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=state,
        httponly=True,
        secure=_is_secure_cookie(),
        samesite=_cookie_samesite(),
        max_age=600,
        path=OAUTH_STATE_COOKIE_PATH,
    )


def _clear_auth_cookies(
    response: Response,
) -> None:
    """
    Remove authentication and OAuth-state cookies.

    Cookie paths and samesite/secure settings must match
    the parameters used when the cookies were originally created.
    """

    secure = _is_secure_cookie()
    samesite = _cookie_samesite()

    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE,
        path=AUTH_COOKIE_PATH,
        secure=secure,
        httponly=True,
        samesite=samesite,
    )

    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        path=REFRESH_COOKIE_PATH,
        secure=secure,
        httponly=True,
        samesite=samesite,
    )

    response.delete_cookie(
        key=OAUTH_STATE_COOKIE,
        path=OAUTH_STATE_COOKIE_PATH,
        secure=secure,
        httponly=True,
        samesite=samesite,
    )


@router.get("/github")
async def github_login() -> RedirectResponse:
    """
    Start GitHub OAuth authentication.
    """

    state = await github_oauth_state_service.create_state()

    authorization_url = (
        await github_oauth_service.get_authorization_url(
            state=state,
        )
    )

    response = RedirectResponse(
        url=authorization_url,
        status_code=status.HTTP_302_FOUND,
    )

    _set_oauth_state_cookie(
        response,
        state,
    )

    return response


@router.get("/callback")
async def github_callback(
    code: str = Query(..., min_length=1),
    state: str = Query(..., min_length=1),
    request: Request = None,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ] = None,
) -> RedirectResponse:
    """
    Handle the GitHub OAuth callback.

    The OAuth state must exist both:

    - in the browser cookie
    - in the server-side Redis state store

    Tokens are never included in the redirect URL.
    """

    cookie_state = request.cookies.get(
        OAUTH_STATE_COOKIE,
    )

    if not cookie_state or cookie_state != state:
        logger.warning(
            "OAuth state mismatch or missing cookie: cookie=%s, query=%s",
            cookie_state,
            state,
        )
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={quote_plus('OAuth session expired or invalid. Please try logging in again.')}",
            status_code=status.HTTP_302_FOUND,
        )

    if not await github_oauth_state_service.consume_state(
        state,
    ):
        logger.warning(
            "OAuth state in Redis expired or invalid: %s",
            state,
        )
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={quote_plus('OAuth session expired. Please try logging in again.')}",
            status_code=status.HTTP_302_FOUND,
        )

    try:
        github_access_token = (
            await github_oauth_service.exchange_code_for_token(
                code,
            )
        )

        github_user = (
            await github_oauth_service.get_github_user(
                github_access_token,
            )
        )

        user = await auth_service.authenticate_github_user(
            db,
            github_user,
        )

        github_credential_service.store_access_token(
            user,
            github_access_token,
        )

        await db.commit()

        tokens = await auth_service.create_session(
            user,
        )

    except GitHubOAuthError as exc:
        await db.rollback()
        logger.error("GitHub OAuth callback failed: %s", exc, exc_info=True)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={quote_plus(str(exc))}",
            status_code=status.HTTP_302_FOUND,
        )

    except Exception as exc:
        await db.rollback()
        logger.error("Unexpected error during OAuth callback: %s", exc, exc_info=True)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={quote_plus(f'Authentication error: {exc}')}",
            status_code=status.HTTP_302_FOUND,
        )

    response = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth/callback",
        status_code=status.HTTP_302_FOUND,
    )

    _set_auth_cookies(
        response,
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
    )

    response.delete_cookie(
        key=OAUTH_STATE_COOKIE,
        path=OAUTH_STATE_COOKIE_PATH,
    )

    return response


@router.post(
    "/refresh",
    response_model=RefreshResponse,
)
async def refresh_token(
    request: Request,
    response: Response,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> RefreshResponse:
    """
    Rotate the current Coodara refresh session.
    """

    refresh_token_value = request.cookies.get(
        REFRESH_TOKEN_COOKIE,
    )

    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session is required.",
        )

    try:
        tokens = await auth_service.refresh_session(
            db,
            refresh_token_value,
        )

        await db.commit()

    except HTTPException:
        await db.rollback()
        raise

    _set_auth_cookies(
        response,
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
    )

    return RefreshResponse(
        access_token=tokens["access_token"],
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
)
async def logout(
    request: Request,
    response: Response,
) -> LogoutResponse:
    """
    Revoke the current Coodara refresh session.

    Logout is idempotent.
    """

    refresh_token_value = request.cookies.get(
        REFRESH_TOKEN_COOKIE,
    )

    if refresh_token_value:
        await auth_service.logout_user(
            refresh_token_value,
        )

    _clear_auth_cookies(response)

    return LogoutResponse()


@router.post(
    "/demo-login",
    response_model=AuthenticatedUserResponse,
)
async def demo_login(
    response: Response,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> AuthenticatedUserResponse:
    """
    Log in with demo user for instant testing without GitHub OAuth.
    """

    user = await auth_service.authenticate_demo_user(
        db,
    )

    await db.commit()

    tokens = await auth_service.create_session(
        user,
    )

    _set_auth_cookies(
        response,
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
    )

    return AuthenticatedUserResponse(
        user=user,
    )


@router.get(
    "/me",
    response_model=AuthenticatedUserResponse,
)
async def get_current_user_profile(
    current_user: Annotated[
        User,
        Depends(get_current_active_user),
    ],
) -> AuthenticatedUserResponse:
    """
    Retrieve the currently authenticated user.
    """

    return AuthenticatedUserResponse(
        user=current_user,
    )