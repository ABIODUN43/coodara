"""
Redis session service.

Responsible for:

- Refresh token storage
- Refresh token validation
- Session revocation
- Session expiration

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from app.redis.cache import (
    cache_manager,
)

from app.core.config import settings


class RedisSessionService:
    """
    Redis-backed session management.

    Stores refresh tokens with
    automatic expiration.
    """

    SESSION_PREFIX = "session"

    async def create_session(
        self,
        *,
        user_id: int,
        refresh_token: str,
    ) -> None:
        """
        Store refresh token.

        Key:
            session:{refresh_token}

        Value:
            user_id
        """

        key = (
            f"{self.SESSION_PREFIX}:"
            f"{refresh_token}"
        )

        ttl = (
            settings.REFRESH_TOKEN_EXPIRE_DAYS
            * 24
            * 60
            * 60
        )

        await cache_manager.set(
            key,
            str(user_id),
            ex=ttl,
        )

    async def get_user_id(
        self,
        refresh_token: str,
    ) -> int | None:
        """
        Get user id from token.
        """

        key = (
            f"{self.SESSION_PREFIX}:"
            f"{refresh_token}"
        )

        value = await cache_manager.get(
            key
        )

        if value is None:
            return None

        return int(value)

    async def revoke_session(
        self,
        refresh_token: str,
    ) -> None:
        """
        Delete session.
        """

        key = (
            f"{self.SESSION_PREFIX}:"
            f"{refresh_token}"
        )

        await cache_manager.delete(
            key
        )


redis_session_service = (
    RedisSessionService()
)