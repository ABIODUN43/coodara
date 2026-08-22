"""
Session repository.

Responsible for:

- Session creation
- Session retrieval
- Session deletion

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from app.models.session import Session
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class SessionRepository:
    def __init__(
        self,
        db: AsyncSession,
    ):
        self.db = db

    async def create(
        self,
        *,
        user_id: int,
        refresh_token: str,
    ) -> Session:

        session = Session(
            user_id=user_id,
            refresh_token=refresh_token,
        )

        self.db.add(session)

        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def get_by_refresh_token(
        self,
        refresh_token: str,
    ) -> Session | None:

        stmt = select(Session).where(Session.refresh_token == refresh_token)

        result = await self.db.execute(stmt)

        return result.scalar_one_or_none()

    async def delete(
        self,
        session_id: int,
    ) -> None:

        stmt = select(Session).where(Session.id == session_id)

        result = await self.db.execute(stmt)

        session = result.scalar_one_or_none()

        if session:
            await self.db.delete(session)

            await self.db.commit()
