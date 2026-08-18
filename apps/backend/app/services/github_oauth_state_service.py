"""
GitHub OAuth state management.

OAuth state values are:

- cryptographically random
- short-lived
- single-use
- stored server-side in Redis
"""

from __future__ import annotations

import secrets

from app.redis.cache import cache_manager


class GitHubOAuthStateService:
    """
    Redis-backed OAuth state management.
    """

    STATE_PREFIX = "github:oauth:state"
    STATE_TTL = 600

    @classmethod
    def _build_key(
        cls,
        state: str,
    ) -> str:
        return f"{cls.STATE_PREFIX}:{state}"

    @classmethod
    async def create_state(
        cls,
    ) -> str:
        """
        Create and store a cryptographically random state.
        """

        state = secrets.token_urlsafe(32)

        await cache_manager.set(
            cls._build_key(state),
            "1",
            ttl=cls.STATE_TTL,
        )

        return state

    @classmethod
    async def consume_state(
        cls,
        state: str,
    ) -> bool:
        """
        Validate and consume an OAuth state.

        State is single-use.
        """

        if not state:
            return False

        key = cls._build_key(state)

        value = await cache_manager.get(key)

        if value is None:
            return False

        await cache_manager.delete(key)

        return True


github_oauth_state_service = GitHubOAuthStateService()
