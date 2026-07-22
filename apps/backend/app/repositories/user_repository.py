"""
User repository.

Responsible for:

- User persistence
- User retrieval
- User updates

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:

    def __init__(
        self,
        db: AsyncSession,
    ):
        self.db = db

    async def get_by_id(
        self,
        user_id: int,
    ) -> User | None:

        stmt = select(User).where(
            User.id == user_id
        )

        result = await self.db.execute(
            stmt
        )

        return (
            result.scalar_one_or_none()
        )

    async def get_by_github_id(
        self,
        github_id: int,
    ) -> User | None:

        stmt = select(User).where(
            User.github_id == github_id
        )

        result = await self.db.execute(
            stmt
        )

        return (
            result.scalar_one_or_none()
        )

    async def create(
        self,
        *,
        github_id: int,
        username: str,
        email: str | None,
        avatar_url: str | None,
    ) -> User:

        user = User(
            github_id=github_id,
            username=username,
            email=email,
            avatar_url=avatar_url,
        )

        self.db.add(user)

        await self.db.commit()
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

        user.username = username
        user.email = email
        user.avatar_url = avatar_url

        await self.db.commit()
        await self.db.refresh(user)

        return user