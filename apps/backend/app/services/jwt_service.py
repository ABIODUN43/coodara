"""
JWT service.

Responsible for:

- Access token generation
- Refresh token generation
- JWT decoding
- JWT validation
- Token type verification

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from datetime import (
    datetime,
    timedelta,
    timezone,
)

import jwt

from app.core.config import settings


class JWTService:
    """
    Central JWT service.

    All JWT operations must pass
    through this service.
    """

    @staticmethod
    def create_access_token(
        user_id: int,
        username: str,
    ) -> str:
        """
        Generate an access token.
        """

        expire = (
            datetime.now(
                timezone.utc
            )
            + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )

        payload = {
            "sub": str(user_id),
            "username": username,
            "type": "access",
            "exp": expire,
        }

        return jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def create_refresh_token(
        user_id: int,
    ) -> str:
        """
        Generate a refresh token.
        """

        expire = (
            datetime.now(
                timezone.utc
            )
            + timedelta(
                days=settings.REFRESH_TOKEN_EXPIRE_DAYS
            )
        )

        payload = {
            "sub": str(user_id),
            "type": "refresh",
            "exp": expire,
        }

        return jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def decode_token(
        token: str,
    ) -> dict:
        """
        Decode and validate a JWT.
        """

        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[
                settings.JWT_ALGORITHM
            ],
        )

    @staticmethod
    def verify_token(
        token: str,
        token_type: str,
    ) -> dict:
        """
        Verify token type.
        """

        payload = (
            JWTService.decode_token(
                token
            )
        )

        if (
            payload.get("type")
            != token_type
        ):
            raise ValueError(
                f"Expected {token_type} token."
            )

        return payload