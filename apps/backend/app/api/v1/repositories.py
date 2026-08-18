"""
Repository API endpoints.

All repository endpoints are organization-scoped.

Authorization:

    authenticated user
        ↓
    organization membership
        ↓
    GitHub credential when GitHub access is required
        ↓
    RepositoryService

Business logic belongs to RepositoryService.
Database access belongs to RepositoryRepository.
"""

from __future__ import annotations

from math import ceil
from typing import Annotated

from app.api.dependencies import (
    GitHubAccessTokenDependency,
    OrganizationMemberDependency,
    get_github_client,
)
from app.db.session import get_db
from app.schemas.repository import (
    RepositoryImportRequest,
    RepositoryListResponse,
    RepositoryResponse,
    RepositoryUpdateRequest,
)
from app.services.github_service import GitHubClient
from app.services.repository_service import (
    GitHubRepositoryAccessError,
    GitHubRepositoryNotFoundError,
    InvalidRepositoryBranchError,
    RepositoryAlreadyExistsError,
    RepositoryNotFoundError,
    RepositoryService,
)
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    Response,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/organizations/{organization_id}/repositories",
    tags=["Repositories"],
)


def _create_repository_service(
    db: AsyncSession,
    github_client: GitHubClient,
    github_access_token: str | None = None,
) -> RepositoryService:
    return RepositoryService(
        db=db,
        github_client=github_client,
        github_access_token=github_access_token,
    )


@router.post(
    "",
    response_model=RepositoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def import_repository(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    payload: RepositoryImportRequest,
    member: OrganizationMemberDependency,
    github_access_token: GitHubAccessTokenDependency,
    github_client: GitHubClient = Depends(get_github_client),
    db: AsyncSession = Depends(get_db),
) -> RepositoryResponse:
    """
    Import a GitHub repository into an organization.
    """

    service = _create_repository_service(
        db=db,
        github_client=github_client,
        github_access_token=github_access_token,
    )

    try:
        repository = await service.import_repository(
            organization_id=organization_id,
            payload=payload,
        )

    except RepositoryAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except GitHubRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except GitHubRepositoryAccessError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    except InvalidRepositoryBranchError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc

    return repository


@router.get(
    "",
    response_model=RepositoryListResponse,
)
async def list_repositories(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    member: OrganizationMemberDependency,
    page: Annotated[
        int,
        Query(ge=1),
    ] = 1,
    per_page: Annotated[
        int,
        Query(ge=1, le=100),
    ] = 20,
    db: AsyncSession = Depends(get_db),
) -> RepositoryListResponse:
    """
    List repositories belonging to an organization.
    """

    service = _create_repository_service(db)

    repositories, total = await service.list_repositories(
        organization_id=organization_id,
        page=page,
        per_page=per_page,
    )

    pages = ceil(total / per_page) if total else 0

    return RepositoryListResponse(
        items=repositories,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get(
    "/{repository_id}",
    response_model=RepositoryResponse,
)
async def get_repository(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
        int,
        Path(gt=0),
    ],
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> RepositoryResponse:
    """
    Retrieve a repository belonging to an organization.
    """

    service = _create_repository_service(db)

    try:
        return await service.get_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )

    except RepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc


@router.patch(
    "/{repository_id}",
    response_model=RepositoryResponse,
)
async def update_repository(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
        int,
        Path(gt=0),
    ],
    payload: RepositoryUpdateRequest,
    member: OrganizationMemberDependency,
    github_access_token: GitHubAccessTokenDependency,
    github_client: GitHubClient = Depends(get_github_client),
    db: AsyncSession = Depends(get_db),
) -> RepositoryResponse:
    """
    Update repository settings.
    """

    service = _create_repository_service(
        db=db,
        github_client=github_client,
        github_access_token=github_access_token,
    )

    try:
        return await service.update_repository(
            organization_id=organization_id,
            repository_id=repository_id,
            payload=payload,
        )

    except RepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc

    except InvalidRepositoryBranchError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc

    except GitHubRepositoryAccessError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc


@router.delete(
    "/{repository_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_repository(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
        int,
        Path(gt=0),
    ],
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Delete a repository from Coodara.

    This does not delete anything from GitHub.
    """

    service = _create_repository_service(db)

    try:
        await service.delete_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )

    except RepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )