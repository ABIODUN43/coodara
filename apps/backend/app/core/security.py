"""
Security utilities for Coodara.

This module is responsible for:

- Access token generation
- Refresh token generation
- JWT validation
- Token decoding
- Authentication helpers

The authentication system uses JWT with separate
access and refresh tokens.

Access Tokens:
- Lifetime: 30 minutes

Refresh Tokens:
- Lifetime: 7 days

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(data: dict[str, Any]) -> str:
    """
    Generate a signed JWT access token.

    Args:
        data: User payload to embed in token.

    Returns:
        Encoded JWT access token.
    """
    payload = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload.update(
        {
            "exp": expire,
            "type": "access",
        }
    )

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(data: dict[str, Any]) -> str:
    """
    Generate a signed JWT refresh token.

    Args:
        data: User payload.

    Returns:
        Encoded JWT refresh token.
    """
    payload = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    payload.update(
        {
            "exp": expire,
            "type": "refresh",
        }
    )

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT.

    Args:
        token: JWT string.

    Returns:
        Decoded payload.

    Raises:
        ValueError: If token is invalid or expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload

    except JWTError:
        raise ValueError("Invalid or expired token")


def verify_token(
        token: str,
        token_type: str = "access"
) -> dict:
    """
    Verify token type and validity.

    Args:
        token:
            JWT token.

        token_type:
            Expected token type.

    Returns:
        Decoded payload.
    """
    payload = decode_token(token)

    if payload.get("type") != token_type:
        raise ValueError(
            f"Expected {token_type} token."
        )

    return payload