"""
Organization service.
"""

from fastapi import HTTPException
from fastapi import status

from app.models.organization import (
    Organization,
)

from app.models.organization_member import (
    OrganizationMember,
)

from app.models.enums.organization_role import (
    OrganizationRole,
)

from app.repositories.organization_repository import (
    OrganizationRepository,
)

from app.repositories.organization_member_repository import (
    OrganizationMemberRepository,
)

from app.schemas.organization import (
    CreateOrganizationRequest,
)


class OrganizationService:

    def __init__(
        self,
        organization_repository: OrganizationRepository,
        organization_member_repository: OrganizationMemberRepository,
    ):
        self.organization_repository = (
            organization_repository
        )

        self.organization_member_repository = (
            organization_member_repository
        )

    async def create_organization(
        self,
        *,
        user_id: int,
        payload: CreateOrganizationRequest,
    ) -> Organization:
        # Future:
        # - slug normalization
        # - reserved slug protection
        # - organization limits
        # - audit logging

        existing = (
            await self.organization_repository
            .get_by_slug(
                payload.slug
            )
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Organization slug "
                    "already exists."
                ),
            )

        organization = Organization(
            name=payload.name,
            slug=payload.slug,
            description=payload.description,
            owner_id=user_id,
        )

        organization = (
            await self.organization_repository
            .create(
                organization
            )
        )

        owner_membership = (
            OrganizationMember(
                organization_id=organization.id,
                user_id=user_id,
                role=OrganizationRole.OWNER,
            )
        )

        await (
            self.organization_member_repository
            .create(
                owner_membership
            )
        )

        return organization

    async def get_organization(
        self,
        organization_id: int,
    ) -> Organization:

        organization = (
            await self.organization_repository
            .get_by_id(
                organization_id
            )
        )

        if not organization:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found.",
            )

        return organization

    async def get_user_organizations(
        self,
        user_id: int,
    ) -> list[Organization]:
        return (
            await self.organization_repository
            .get_user_organizations(
                user_id
            )
        )