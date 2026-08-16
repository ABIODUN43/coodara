"""
Authentication API schemas.

Responsible for:

- Authenticated-user responses
- Refresh responses
- Logout responses

Refresh tokens are intentionally never exposed
through API response schemas.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    """
    Public representation of an authenticated user.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    github_id: int
    username: str
    email: str | None
    avatar_url: str | None


class AuthenticatedUserResponse(BaseModel):
    """
    Response returned by GET /auth/me.
    """

    user: UserResponse


class RefreshResponse(BaseModel):
    """
    Response returned after refresh-token rotation.

    The refresh token remains inside an HttpOnly cookie.
    """

    access_token: str


class LogoutResponse(BaseModel):
    """
    Response returned after logout.
    """

    success: bool = True
