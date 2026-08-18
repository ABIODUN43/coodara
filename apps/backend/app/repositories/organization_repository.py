"""
Organization persistence layer.

Responsible only for organization database operations.

Transaction ownership belongs to the service/application layer.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class OrganizationRepository:
    """
    Data-access object for Organization entities.
    """

    def __init__(
        self,
        db: AsyncSession,
    ) -> None:
        self.db = db

    async def create(
        self,
        organization: Organization,
    ) -> Organization:
        """
        Persist an organization without committing.
        """

        self.db.add(organization)

        await self.db.flush()
        await self.db.refresh(organization)

        return organization

    async def get_by_id(
        self,
        organization_id: int,
    ) -> Organization | None:
        """
        Retrieve an organization by ID.
        """

        statement = select(Organization).where(
            Organization.id == organization_id,
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def get_by_slug(
        self,
        slug: str,
    ) -> Organization | None:
        """
        Retrieve an organization by slug.
        """

        statement = select(Organization).where(
            Organization.slug == slug,
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def get_user_organizations(
        self,
        user_id: int,
    ) -> Sequence[Organization]:
        """
        Retrieve organizations where the user is a member.
        """

        statement = (
            select(Organization)
            .join(
                OrganizationMember,
                Organization.id == OrganizationMember.organization_id,
            )
            .where(
                OrganizationMember.user_id == user_id,
            )
            .order_by(
                Organization.created_at.desc(),
            )
        )

        result = await self.db.execute(statement)

        return result.scalars().all()
