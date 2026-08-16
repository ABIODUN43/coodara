"""
Redis-backed authenticated-session management.

Responsible for:

- Refresh-token storage
- Refresh-token lookup
- Session validation
- Session revocation
- Session expiration

Security:

- Refresh tokens are opaque random secrets.
- Raw refresh tokens are never persisted.
- SHA-256 hashes are used as Redis identifiers.
"""

from __future__ import annotations

import hashlib

from app.core.config import settings
from app.redis.cache import cache_manager


class RedisSessionService:
    """
    Redis-backed authenticated-session manager.

    Redis stores:

        session:{sha256(refresh_token)}

    Value:

        authenticated user ID
    """

    SESSION_PREFIX = "session"

    @classmethod
    def _hash_refresh_token(
        cls,
        refresh_token: str,
    ) -> str:
        """
        Hash a refresh token before using it as a Redis key.
        """

        return hashlib.sha256(
            refresh_token.encode("utf-8"),
        ).hexdigest()

    @classmethod
    def _build_key(
        cls,
        refresh_token: str,
    ) -> str:
        """
        Build the Redis session key.
        """

        token_hash = cls._hash_refresh_token(
            refresh_token,
        )

        return f"{cls.SESSION_PREFIX}:{token_hash}"

    @staticmethod
    def _session_ttl() -> int:
        """
        Return the refresh-session lifetime in seconds.
        """

        return settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

    async def create_session(
        self,
        *,
        user_id: int,
        refresh_token: str,
    ) -> None:
        """
        Store a refresh-token session.
        """

        key = self._build_key(refresh_token)

        await cache_manager.set(
            key,
            str(user_id),
            ttl=self._session_ttl(),
        )

    async def get_user_id(
        self,
        refresh_token: str,
    ) -> int | None:
        """
        Retrieve the user associated with a refresh token.
        """

        key = self._build_key(refresh_token)

        value = await cache_manager.get(key)

        if value is None:
            return None

        try:
            user_id = int(value)
        except (TypeError, ValueError):
            return None

        if user_id <= 0:
            return None

        return user_id

    async def validate_session(
        self,
        refresh_token: str,
    ) -> bool:
        """
        Determine whether a refresh session exists.
        """

        return (await self.get_user_id(refresh_token)) is not None

    async def revoke_session(
        self,
        refresh_token: str,
    ) -> None:
        """
        Revoke a refresh-token session.
        """

        key = self._build_key(refresh_token)

        await cache_manager.delete(key)


redis_session_service = RedisSessionService()
