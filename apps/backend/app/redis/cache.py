"""
Redis cache utilities.

Owner:
    Founder / AI Lead
"""

from app.services.redis_service import (
    redis_service,
)


class CacheManager:

    async def get(
        self,
        key: str,
    ):

        return await (
            redis_service.client.get(
                key
            )
        )

    async def set(
        self,
        key: str,
        value: str,
        ttl: int | None = None,
    ):

        await redis_service.client.set(
            key,
            value,
            ex=ttl,
        )

    async def delete(
        self,
        key: str,
    ):

        await (
            redis_service.client.delete(
                key
            )
        )


cache_manager = CacheManager()