"""
Organization membership persistence layer.

Responsible only for database operations involving
organization memberships.

Transaction ownership belongs to the service/application layer.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.models.organization_member import OrganizationMember
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class OrganizationMemberRepository:
    """
    Data-access object for organization memberships.
    """

    def __init__(
        self,
        db: AsyncSession,
    ) -> None:
        self.db = db

    async def create(
        self,
        member: OrganizationMember,
    ) -> OrganizationMember:
        """
        Persist a membership without committing.
        """

        self.db.add(member)

        await self.db.flush()
        await self.db.refresh(member)

        return member

    async def get_member(
        self,
        organization_id: int,
        user_id: int,
    ) -> OrganizationMember | None:
        """
        Retrieve a user's membership in an organization.
        """

        statement = select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def list_members(
        self,
        organization_id: int,
    ) -> Sequence[OrganizationMember]:
        """
        Retrieve all members of an organization.
        """

        statement = (
            select(OrganizationMember)
            .where(
                OrganizationMember.organization_id == organization_id,
            )
            .order_by(
                OrganizationMember.joined_at.asc(),
            )
        )

        result = await self.db.execute(statement)

        return result.scalars().all()

    async def delete_member(
        self,
        member: OrganizationMember,
    ) -> None:
        """
        Delete a membership without committing.
        """

        await self.db.delete(member)
        await self.db.flush()
