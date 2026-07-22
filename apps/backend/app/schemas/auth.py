"""
Authentication schemas.

Responsible for:

- Token responses
- Refresh token requests
- Authenticated user responses
- Standard authentication payloads

These schemas define the API contract between
the Coodara backend and frontend applications.

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from pydantic import BaseModel, ConfigDict

from app.schemas.user import (
    UserResponse,
)


class TokenResponse(BaseModel):
    """
    Response returned after successful
    authentication.
    """

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """
    Request payload for refreshing
    an access token.
    """

    refresh_token: str


class RefreshResponse(BaseModel):
    """
    Response returned when a new
    access token is generated.
    """

    access_token: str
    token_type: str = "bearer"


class LogoutRequest(BaseModel):
    refresh_token: str


class LogoutResponse(BaseModel):
    """
    Response returned after logout.
    """

    success: bool = True
    message: str = (
        "Successfully logged out."
    )


class ErrorResponse(BaseModel):
    """
    Standardized error response for
    authentication APIs.
    """

    success: bool = False
    message: str
    error_code: str | None = None


class AuthenticatedUserResponse(
    BaseModel
):
    """
    Response for GET /auth/me.
    """

    user: UserResponse

    model_config = ConfigDict(
        from_attributes=True
    )
    

class AuthResponse(
    BaseModel
):
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"