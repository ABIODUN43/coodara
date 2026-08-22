"""
JWT service.

Responsible for:

- Access-token generation
- JWT decoding
- JWT validation
- Token-type verification
- User-ID extraction

Refresh tokens are intentionally NOT JWTs.

Access tokens:
    Short-lived JWTs.

Refresh tokens:
    Opaque random secrets managed by RedisSessionService.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from app.core.config import settings


class JWTService:
    """
    Central service for access-token JWT operations.

    Refresh-token generation does not belong here.
    """

    ACCESS_TOKEN_TYPE = "access"

    @staticmethod
    def create_access_token(
        *,
        user_id: int,
        username: str,
    ) -> str:
        """
        Generate a short-lived access token.
        """

        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        )

        payload: dict[str, Any] = {
            "sub": str(user_id),
            "username": username,
            "type": JWTService.ACCESS_TOKEN_TYPE,
            "exp": expires_at,
        }

        return jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def decode_token(
        token: str,
    ) -> dict[str, Any]:
        """
        Decode and cryptographically validate a JWT.

        Raises:
            jwt.InvalidTokenError:
                If the token is malformed, expired,
                incorrectly signed, or otherwise invalid.
        """

        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        if not isinstance(payload, dict):
            raise jwt.InvalidTokenError(
                "JWT payload must be an object.",
            )

        return payload

    @classmethod
    def verify_access_token(
        cls,
        token: str,
    ) -> dict[str, Any]:
        """
        Verify that a JWT is a valid access token.
        """

        payload = cls.decode_token(token)

        if payload.get("type") != cls.ACCESS_TOKEN_TYPE:
            raise ValueError(
                "Expected access token.",
            )

        return payload

    @staticmethod
    def get_user_id(
        payload: dict[str, Any],
    ) -> int:
        """
        Extract and validate the user ID from a JWT payload.
        """

        subject = payload.get("sub")

        if subject is None:
            raise ValueError(
                "JWT subject is missing.",
            )

        try:
            user_id = int(subject)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                "JWT subject is invalid.",
            ) from exc

        if user_id <= 0:
            raise ValueError(
                "JWT subject is invalid.",
            )

        return user_id
