"""
Organization API endpoints.

Responsible for:

- Creating organizations
- Listing user organizations
- Retrieving organization details

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.api.dependencies import (
    get_current_active_user,
)

from app.db.session import (
    get_db,
)

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
    OrganizationService,
)

router = APIRouter(
    prefix="/organizations",
    tags=["Organizations"],
)


def get_organization_service(
    db: AsyncSession,
) -> OrganizationService:
    """
    Build organization service.
    """

    organization_repository = (
        OrganizationRepository(db)
    )

    organization_member_repository = (
        OrganizationMemberRepository(db)
    )

    return OrganizationService(
        organization_repository,
        organization_member_repository,
    )


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=201,
)
async def create_organization(
    payload: CreateOrganizationRequest,
    current_user: User = Depends(
        get_current_active_user
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    """
    Create organization.

    Automatically creates an OWNER
    membership for the creator.
    """

    service = get_organization_service(
        db
    )

    organization = (
        await service.create_organization(
            user_id=current_user.id,
            payload=payload,
        )
    )

    return organization


@router.get(
    "",
    response_model=list[
        OrganizationResponse
    ],
)
async def list_organizations(
    current_user: User = Depends(
        get_current_active_user
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    """
    List organizations
    belonging to current user.
    """

    service = get_organization_service(
        db
    )

    return (
        await service
        .get_user_organizations(
            current_user.id
        )
    )


@router.get(
    "/{organization_id}",
    response_model=OrganizationResponse,
)
async def get_organization(
    organization_id: int,
    current_user: User = Depends(
        get_current_active_user
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    """
    Retrieve organization details.
    """

    service = get_organization_service(
        db
    )

    return (
        await service
        .get_organization(
            organization_id
        )
    )