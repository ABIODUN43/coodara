"""
User persistence layer.

Responsible only for database operations involving users.

Transaction ownership belongs to the application/service layer.
"""

from __future__ import annotations

from app.models.user import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class UserRepository:
    """
    Data-access object for User entities.
    """

    def __init__(
        self,
        db: AsyncSession,
    ) -> None:
        self.db = db

    async def get_by_id(
        self,
        user_id: int,
    ) -> User | None:
        """
        Retrieve a user by database ID.
        """

        statement = select(User).where(
            User.id == user_id,
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def get_by_github_id(
        self,
        github_id: int,
    ) -> User | None:
        """
        Retrieve a user by GitHub ID.
        """

        statement = select(User).where(
            User.github_id == github_id,
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        github_id: int,
        username: str,
        email: str | None,
        avatar_url: str | None,
    ) -> User:
        """
        Create a user.

        The transaction is flushed but not committed.
        """

        user = User(
            github_id=github_id,
            username=username,
            email=email,
            avatar_url=avatar_url,
        )

        self.db.add(user)

        await self.db.flush()
        await self.db.refresh(user)

        return user

    async def update(
        self,
        user: User,
        *,
        username: str,
        email: str | None,
        avatar_url: str | None,
    ) -> User:
        """
        Update mutable user profile fields.

        The transaction is flushed but not committed.
        """

        user.username = username
        user.email = email
        user.avatar_url = avatar_url

        await self.db.flush()
        await self.db.refresh(user)

        return user
