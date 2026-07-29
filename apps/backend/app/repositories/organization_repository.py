"""
Organization repository.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.organization_member import (
    OrganizationMember,
)

class OrganizationRepository:
    """
    Organization persistence layer.
    """

    def __init__(
        self,
        db: AsyncSession,
    ):
        self.db = db

    async def create(
        self,
        organization: Organization,
    ) -> Organization:

        self.db.add(
            organization
        )

        await self.db.commit()

        await self.db.refresh(
            organization
        )

        return organization

    async def get_by_id(
        self,
        organization_id: int,
    ) -> Organization | None:

        stmt = select(
            Organization
        ).where(
            Organization.id
            == organization_id
        )

        result = await self.db.execute(
            stmt
        )

        return (
            result.scalar_one_or_none()
        )

    async def get_by_slug(
        self,
        slug: str,
    ) -> Organization | None:

        stmt = select(
            Organization
        ).where(
            Organization.slug
            == slug
        )

        result = await self.db.execute(
            stmt
        )

        return (
            result.scalar_one_or_none()
        )

    async def get_user_organizations(
        self,
        user_id: int,
    ) -> list[Organization]:

        stmt = (
            select(Organization)
            .join(
                OrganizationMember,
                Organization.id
                == OrganizationMember.organization_id,
            )
            .where(
                OrganizationMember.user_id
                == user_id
            )
        )

        result = await self.db.execute(
            stmt
        )
        return list(
            result.scalars().all()
        )