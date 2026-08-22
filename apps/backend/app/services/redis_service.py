"""
Redis service.

Responsible for:

- Redis connection management
- Cache access
- Session storage
- Token storage

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from app.core.config import settings
from redis.asyncio import Redis


class RedisService:
    """
    Central Redis connection service.
    """

    def __init__(self) -> None:

        self.client = Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )

    async def ping(self) -> bool:

        return await self.client.ping()


redis_service = RedisService()
