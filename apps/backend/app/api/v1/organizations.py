"""
Organization API endpoints.

Responsible for exposing organization HTTP endpoints.

Business logic belongs to OrganizationService.
Database access belongs to OrganizationRepository and
OrganizationMemberRepository.

Transaction ownership belongs to this application/API layer.
"""

from __future__ import annotations

from typing import Annotated

from app.api.dependencies import (
    OrganizationMemberDependency,
    get_current_active_user,
)
from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User
from app.repositories.organization_member_repository import (
    OrganizationMemberRepository,
)
from app.repositories.organization_repository import (
    OrganizationRepository,
)
from app.schemas.organization import (
    CreateOrganizationRequest,
    OrganizationResponse,
)
from app.services.organization_service import (
    OrganizationAlreadyExistsError,
    OrganizationNotFoundError,
    OrganizationService,
)
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/organizations",
    tags=["Organizations"],
)


def _create_organization_service(
    db: AsyncSession,
) -> OrganizationService:
    """
    Construct OrganizationService with its repositories.
    """

    organization_repository = OrganizationRepository(
        db,
    )

    organization_member_repository = OrganizationMemberRepository(
        db,
    )

    return OrganizationService(
        organization_repository=organization_repository,
        organization_member_repository=organization_member_repository,
    )


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_organization(
    payload: CreateOrganizationRequest,
    current_user: Annotated[
        User,
        Depends(get_current_active_user),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> Organization:
    """
    Create an organization.

    The authenticated user automatically becomes
    the organization owner.
    """

    service = _create_organization_service(
        db,
    )

    try:
        organization = await service.create_organization(
            user_id=current_user.id,
            payload=payload,
        )

        await db.commit()

        return organization

    except OrganizationAlreadyExistsError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except Exception:
        await db.rollback()
        raise


@router.get(
    "",
    response_model=list[OrganizationResponse],
)
async def list_my_organizations(
    current_user: Annotated[
        User,
        Depends(get_current_active_user),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> list[Organization]:
    """
    List organizations where the authenticated user is a member.
    """

    service = _create_organization_service(
        db,
    )

    return await service.get_user_organizations(
        current_user.id,
    )


@router.get(
    "/{organization_id}",
    response_model=OrganizationResponse,
)
async def get_organization(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    member: OrganizationMemberDependency,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> Organization:
    """
    Retrieve an organization.

    Access requires membership in the organization.
    """

    service = _create_organization_service(
        db,
    )

    try:
        return await service.get_organization(
            organization_id,
        )

    except OrganizationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        ) from exc