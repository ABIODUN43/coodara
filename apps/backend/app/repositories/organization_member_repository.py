"""
Organization member repository.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization_member import (
    OrganizationMember,
)

from sqlalchemy import select

from app.models.organization_member import (
    OrganizationMember,
)


class OrganizationMemberRepository:

    def __init__(
        self,
        db: AsyncSession,
    ):
        self.db = db

    async def create(
        self,
        member: OrganizationMember,
    ) -> OrganizationMember:

        self.db.add(member)

        await self.db.commit()

        await self.db.refresh(member)

        return member


class OrganizationMemberRepository:

    def __init__(self, db):
        self.db = db

    async def create(
        self,
        member: OrganizationMember,
    ) -> OrganizationMember:

        self.db.add(member)

        await self.db.commit()

        await self.db.refresh(member)

        return member

    async def get_member(
        self,
        organization_id: int,
        user_id: int,
    ) -> OrganizationMember | None:

        stmt = select(
            OrganizationMember
        ).where(
            OrganizationMember.organization_id
            == organization_id,
            OrganizationMember.user_id
            == user_id,
        )

        result = await self.db.execute(stmt)

        return result.scalar_one_or_none()

    async def list_members(
        self,
        organization_id: int,
    ) -> list[OrganizationMember]:

        stmt = select(
            OrganizationMember
        ).where(
            OrganizationMember.organization_id
            == organization_id
        )

        result = await self.db.execute(stmt)

        return list(
            result.scalars().all()
        )

    async def delete_member(
        self,
        member: OrganizationMember,
    ) -> None:

        await self.db.delete(member)

        await self.db.commit()