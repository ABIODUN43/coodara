"""
Tests for authentication dependencies and endpoints.

Verifies:
- get_current_user extracts token from Authorization: Bearer <token>
- get_current_user extracts token from coodara_access_token cookie
- Bearer token takes priority over cookie when both are present
- Missing authentication raises HTTP 401
- Invalid or expired tokens raise HTTP 401
- /auth/me returns current user
- /auth/refresh rotates session and returns access_token
- /auth/logout revokes session and clears cookies
- /auth/demo-login returns authenticated user with access_token
- /auth/github initiates OAuth and sets state cookie
- /auth/callback sets cookies and redirects to frontend with token fragment
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.api.dependencies import ACCESS_TOKEN_COOKIE, get_current_user
from app.api.v1.auth import (
    demo_login,
    get_current_user_profile,
    github_callback,
    github_login,
    logout,
    refresh_token,
)
from app.models.user import User
from app.services.jwt_service import JWTService
from fastapi import HTTPException, Response
from starlette.requests import Request


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _make_mock_request(
    cookies: dict[str, str] | None = None,
    headers: dict[str, str] | None = None,
) -> MagicMock:
    request = MagicMock(spec=Request)
    request.cookies = cookies or {}
    request.headers = headers or {}
    return request


def _create_valid_token(user_id: int = 1, username: str = "testuser") -> str:
    return JWTService.create_access_token(
        user_id=user_id,
        username=username,
    )


@pytest.mark.anyio
async def test_get_current_user_with_cookie():
    token = _create_valid_token(user_id=42, username="cookieuser")
    request = _make_mock_request(cookies={ACCESS_TOKEN_COOKIE: token})

    mock_user = MagicMock(spec=User)
    mock_user.id = 42
    mock_user.username = "cookieuser"

    db = AsyncMock()
    with patch("app.api.dependencies.UserRepository") as mock_repo_cls:
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=mock_user)
        mock_repo_cls.return_value = mock_repo

        user = await get_current_user(request=request, db=db)
        assert user.id == 42
        assert user.username == "cookieuser"
        mock_repo.get_by_id.assert_awaited_once_with(42)


@pytest.mark.anyio
async def test_get_current_user_with_bearer_token():
    token = _create_valid_token(user_id=84, username="beareruser")
    request = _make_mock_request(headers={"Authorization": f"Bearer {token}"})

    mock_user = MagicMock(spec=User)
    mock_user.id = 84
    mock_user.username = "beareruser"

    db = AsyncMock()
    with patch("app.api.dependencies.UserRepository") as mock_repo_cls:
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=mock_user)
        mock_repo_cls.return_value = mock_repo

        user = await get_current_user(request=request, db=db)
        assert user.id == 84
        assert user.username == "beareruser"
        mock_repo.get_by_id.assert_awaited_once_with(84)


@pytest.mark.anyio
async def test_bearer_token_takes_priority_over_cookie():
    bearer_token = _create_valid_token(user_id=101, username="bearer_priority")
    cookie_token = _create_valid_token(user_id=202, username="cookie_fallback")

    request = _make_mock_request(
        headers={"Authorization": f"Bearer {bearer_token}"},
        cookies={ACCESS_TOKEN_COOKIE: cookie_token},
    )

    mock_user = MagicMock(spec=User)
    mock_user.id = 101

    db = AsyncMock()
    with patch("app.api.dependencies.UserRepository") as mock_repo_cls:
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=mock_user)
        mock_repo_cls.return_value = mock_repo

        user = await get_current_user(request=request, db=db)
        assert user.id == 101
        mock_repo.get_by_id.assert_awaited_once_with(101)


@pytest.mark.anyio
async def test_get_current_user_missing_credentials_raises_401():
    request = _make_mock_request()
    db = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request=request, db=db)

    assert exc_info.value.status_code == 401
    assert "Authentication is required" in exc_info.value.detail


@pytest.mark.anyio
async def test_get_current_user_invalid_token_raises_401():
    request = _make_mock_request(headers={"Authorization": "Bearer invalid.jwt.string"})
    db = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request=request, db=db)

    assert exc_info.value.status_code == 401
    assert "Invalid authentication credentials" in exc_info.value.detail


@pytest.mark.anyio
async def test_get_current_user_profile_endpoint():
    mock_user = MagicMock(spec=User)
    mock_user.id = 1
    mock_user.github_id = 12345
    mock_user.username = "testprofile"
    mock_user.email = "test@example.com"
    mock_user.avatar_url = "https://example.com/avatar.png"

    response = await get_current_user_profile(current_user=mock_user)
    assert response.user.username == "testprofile"
    assert response.user.id == 1


@pytest.mark.anyio
async def test_demo_login_endpoint_returns_access_token():
    mock_user = MagicMock(spec=User)
    mock_user.id = 2
    mock_user.github_id = 999
    mock_user.username = "DemoUser"
    mock_user.email = "demo@example.com"
    mock_user.avatar_url = None

    response = Response()
    db = AsyncMock()

    tokens = {"access_token": "demo_access_jwt", "refresh_token": "demo_refresh_val"}

    with patch("app.api.v1.auth.auth_service.authenticate_demo_user", AsyncMock(return_value=mock_user)), \
         patch("app.api.v1.auth.auth_service.create_session", AsyncMock(return_value=tokens)), \
         patch("app.api.v1.auth._set_auth_cookies") as mock_set_cookies:

        result = await demo_login(response=response, db=db)
        assert result.user.username == "DemoUser"
        assert result.access_token == "demo_access_jwt"
        mock_set_cookies.assert_called_once_with(
            response,
            access_token="demo_access_jwt",
            refresh_token="demo_refresh_val",
        )


@pytest.mark.anyio
async def test_refresh_token_endpoint():
    request = _make_mock_request(cookies={"coodara_refresh_token": "valid_refresh_token"})
    response = Response()
    db = AsyncMock()

    new_tokens = {"access_token": "new_access_token", "refresh_token": "new_refresh_token"}

    with patch("app.api.v1.auth.auth_service.refresh_session", AsyncMock(return_value=new_tokens)), \
         patch("app.api.v1.auth._set_auth_cookies") as mock_set_cookies:

        result = await refresh_token(request=request, response=response, db=db)
        assert result.access_token == "new_access_token"
        mock_set_cookies.assert_called_once_with(
            response,
            access_token="new_access_token",
            refresh_token="new_refresh_token",
        )


@pytest.mark.anyio
async def test_refresh_token_missing_raises_401():
    request = _make_mock_request(cookies={})
    response = Response()
    db = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await refresh_token(request=request, response=response, db=db)

    assert exc_info.value.status_code == 401
    assert "Refresh session is required" in exc_info.value.detail


@pytest.mark.anyio
async def test_logout_endpoint():
    request = _make_mock_request(cookies={"coodara_refresh_token": "to_revoke"})
    response = Response()

    with patch("app.api.v1.auth.auth_service.logout_user", AsyncMock()) as mock_logout_user, \
         patch("app.api.v1.auth._clear_auth_cookies") as mock_clear_cookies:

        result = await logout(request=request, response=response)
        assert result.success is True
        mock_logout_user.assert_awaited_once_with("to_revoke")
        mock_clear_cookies.assert_called_once_with(response)


@pytest.mark.anyio
async def test_github_login_initiates_oauth():
    with patch("app.api.v1.auth.github_oauth_state_service.create_state", AsyncMock(return_value="state123")), \
         patch("app.api.v1.auth.github_oauth_service.get_authorization_url", AsyncMock(return_value="https://github.com/login/oauth/authorize?state=state123")), \
         patch("app.api.v1.auth._set_oauth_state_cookie") as mock_set_state:

        redirect_response = await github_login()
        assert redirect_response.status_code == 302
        assert redirect_response.headers["location"] == "https://github.com/login/oauth/authorize?state=state123"
        mock_set_state.assert_called_once()


@pytest.mark.anyio
async def test_github_callback_redirects_with_token_fragment():
    request = _make_mock_request(cookies={"coodara_github_oauth_state": "state123"})
    db = AsyncMock()

    mock_user = MagicMock(spec=User)
    tokens = {"access_token": "cb_access_token", "refresh_token": "cb_refresh_token"}

    with patch("app.api.v1.auth.github_oauth_state_service.consume_state", AsyncMock(return_value=True)), \
         patch("app.api.v1.auth.github_oauth_service.exchange_code_for_token", AsyncMock(return_value="gho_token")), \
         patch("app.api.v1.auth.github_oauth_service.get_github_user", AsyncMock(return_value={"id": 1, "login": "test"})), \
         patch("app.api.v1.auth.auth_service.authenticate_github_user", AsyncMock(return_value=mock_user)), \
         patch("app.api.v1.auth.github_credential_service.store_access_token"), \
         patch("app.api.v1.auth.auth_service.create_session", AsyncMock(return_value=tokens)), \
         patch("app.api.v1.auth._set_auth_cookies") as mock_set_cookies:

        redirect_res = await github_callback(code="code123", state="state123", request=request, db=db)
        assert redirect_res.status_code == 302
        location = redirect_res.headers["location"]
        assert "/auth/callback#token=cb_access_token" in location
        mock_set_cookies.assert_called_once()
