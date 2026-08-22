"""
Database session management.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from app.db.engine import engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide an asynchronous database session.

    The request/application layer owns commit and rollback
    decisions.
    """

    async with SessionLocal() as session:
        yield session
