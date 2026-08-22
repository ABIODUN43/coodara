"""
Organization application service.

Responsible for organization business workflows.

Transaction ownership belongs to the caller/application layer.
"""

from __future__ import annotations

from app.models.enums.organization_role import OrganizationRole
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.repositories.organization_member_repository import (
    OrganizationMemberRepository,
)
from app.repositories.organization_repository import (
    OrganizationRepository,
)
from app.schemas.organization import CreateOrganizationRequest
from sqlalchemy.exc import IntegrityError


class OrganizationServiceError(Exception):
    """Base organization service error."""


class OrganizationAlreadyExistsError(
    OrganizationServiceError,
):
    """Organization slug already exists."""


class OrganizationNotFoundError(
    OrganizationServiceError,
):
    """Organization does not exist."""


class OrganizationService:
    """
    Application service for organization workflows.
    """

    def __init__(
        self,
        organization_repository: OrganizationRepository,
        organization_member_repository: OrganizationMemberRepository,
    ) -> None:
        self.organization_repository = organization_repository
        self.organization_member_repository = organization_member_repository

    async def create_organization(
        self,
        *,
        user_id: int,
        payload: CreateOrganizationRequest,
    ) -> Organization:
        """
        Create an organization and its owner membership.

        No commit occurs here.

        The organization and membership are flushed so they
        can be committed atomically by the caller.
        """

        existing = await self.organization_repository.get_by_slug(
            payload.slug,
        )

        if existing is not None:
            raise OrganizationAlreadyExistsError(
                "Organization slug already exists.",
            )

        organization = Organization(
            name=payload.name,
            slug=payload.slug,
            description=payload.description,
            owner_id=user_id,
        )

        try:
            await self.organization_repository.create(
                organization,
            )

            owner_membership = OrganizationMember(
                organization_id=organization.id,
                user_id=user_id,
                role=OrganizationRole.OWNER,
            )

            await self.organization_member_repository.create(
                owner_membership,
            )

        except IntegrityError as exc:
            raise OrganizationAlreadyExistsError(
                "Organization could not be created because "
                "the organization slug already exists.",
            ) from exc

        return organization

    async def get_organization(
        self,
        organization_id: int,
    ) -> Organization:
        """
        Retrieve an organization.
        """

        organization = await self.organization_repository.get_by_id(
            organization_id,
        )

        if organization is None:
            raise OrganizationNotFoundError(
                "Organization not found.",
            )

        return organization

    async def get_user_organizations(
        self,
        user_id: int,
    ) -> list[Organization]:
        """
        Retrieve organizations where the user is a member.
        """

        organizations = await self.organization_repository.get_user_organizations(
            user_id
        )

        return list(organizations)
