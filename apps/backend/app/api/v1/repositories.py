"""
Repository API endpoints.

All repository endpoints are organization-scoped.

Authorization flow:

    authenticated user
        ↓
    organization membership
        ↓
    GitHub credential when required
        ↓
    RepositoryService

Responsibilities of this API layer:

- HTTP request/response handling.
- Dependency injection.
- Transaction boundaries.
- Domain exception → HTTP exception translation.

Business logic belongs to RepositoryService.
Database access belongs to RepositoryRepository.
GitHub HTTP communication belongs to GitHubClient.
"""

from __future__ import annotations

import logging
from math import ceil
from typing import Annotated
from app.analysis.factory import create_analysis_dispatcher
from app.api.dependencies import (
    GitHubAccessTokenDependency,
    OrganizationMemberDependency,
    get_github_client,
)
from app.db.session import get_db
from app.schemas.repository import (
    GitHubRepositoryListResponse,
    RepositoryImportRequest,
    RepositoryListResponse,
    RepositoryResponse,
    RepositoryUpdateRequest,
)
from app.services.analysis_service import AnalysisService
from app.services.github_service import GitHubClient
from app.services.repository_service import (
    GitHubRepositoryAccessError,
    GitHubRepositoryNotFoundError,
    InvalidRepositoryBranchError,
    RepositoryAlreadyExistsError,
    RepositoryNotFoundError,
    RepositoryService,
)
from app.workers.analysis_tasks import _run_analysis_async
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Path,
    Query,
    Response,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/organizations/{organization_id}/repositories",
    tags=["Repositories"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_repository_service(
    *,
    db: AsyncSession,
    github_client: GitHubClient | None = None,
    github_access_token: str | None = None,
) -> RepositoryService:
    """
    Construct the repository application service.

    Dependency construction remains in the API layer while the
    service itself remains independent of FastAPI.
    """

    return RepositoryService(
        db=db,
        github_client=github_client,
        github_access_token=github_access_token,
    )


def _repository_not_found() -> HTTPException:
    """
    Return the standard repository-not-found HTTP response.
    """

    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Repository not found.",
    )


def _github_repository_not_found(
    exc: GitHubRepositoryNotFoundError,
) -> HTTPException:
    """
    Translate a GitHub repository lookup failure into HTTP.
    """

    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=str(exc),
    )


def _github_access_denied(
    exc: GitHubRepositoryAccessError,
) -> HTTPException:
    """
    Translate a GitHub authorization failure into HTTP.
    """

    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=str(exc),
    )


def _invalid_branch(
    exc: InvalidRepositoryBranchError,
) -> HTTPException:
    """
    Translate an invalid repository branch into HTTP.
    """

    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=str(exc),
    )


async def _rollback(
    db: AsyncSession,
) -> None:
    """
    Roll back the current database transaction.

    This helper keeps exception paths consistent across endpoints.
    """

    await db.rollback()


# ---------------------------------------------------------------------------
# GitHub repository picker
# ---------------------------------------------------------------------------


@router.get(
    "/github-available",
    response_model=GitHubRepositoryListResponse,
)
async def list_github_repositories(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    member: OrganizationMemberDependency,
    github_access_token: GitHubAccessTokenDependency,
    github_client: Annotated[
        GitHubClient,
        Depends(get_github_client),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    page: Annotated[
        int,
        Query(ge=1),
    ] = 1,
    per_page: Annotated[
        int,
        Query(ge=1, le=100),
    ] = 50,
) -> GitHubRepositoryListResponse:
    """
    List repositories accessible to the authenticated GitHub user.

    This endpoint is used by the repository picker.

    It does not import or persist repositories into Coodara.

    The GitHub access token is resolved server-side and is never
    exposed to the frontend.
    """

    service = _create_repository_service(
        db=db,
        github_client=github_client,
        github_access_token=github_access_token,
    )

    try:
        repositories = await service.list_github_repositories(
            page=page,
            per_page=per_page,
        )

    except GitHubRepositoryAccessError as exc:
        raise _github_access_denied(exc) from exc

    return GitHubRepositoryListResponse(
        items=repositories,
        page=page,
        per_page=per_page,
        has_next_page=len(repositories) == per_page,
    )


# ---------------------------------------------------------------------------
# Repository CRUD
# ---------------------------------------------------------------------------


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
    github_client: Annotated[
        GitHubClient,
        Depends(get_github_client),
    ],
    background_tasks: BackgroundTasks = None,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ] = None,
) -> RepositoryResponse:
    """
    Import an accessible GitHub repository into an organization.

    Organization membership and GitHub authorization are enforced
    through dependencies.

    Repository business rules are delegated to RepositoryService.
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

        await db.commit()

        # Auto-trigger initial analysis immediately in background
        try:
            analysis_service = AnalysisService(db)
            analysis = await analysis_service.create_analysis(
                organization_id=organization_id,
                repository_id=repository.id,
            )
            await db.commit()

            dispatcher = create_analysis_dispatcher(db)
            task_id = dispatcher.enqueue(analysis_id=analysis.id)

            if not task_id and background_tasks is not None:
                background_tasks.add_task(_run_analysis_async, analysis.id)
        except Exception as analysis_exc:  # noqa: BLE001
            logger.warning(
                "Initial analysis scheduling skipped for repo %d: %s",
                repository.id,
                analysis_exc,
            )

        return repository

    except RepositoryAlreadyExistsError as exc:
        await _rollback(db)

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except GitHubRepositoryNotFoundError as exc:
        await _rollback(db)

        raise _github_repository_not_found(exc) from exc

    except GitHubRepositoryAccessError as exc:
        await _rollback(db)

        raise _github_access_denied(exc) from exc

    except InvalidRepositoryBranchError as exc:
        await _rollback(db)

        raise _invalid_branch(exc) from exc

    except Exception:
        await _rollback(db)
        raise


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
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    page: Annotated[
        int,
        Query(ge=1),
    ] = 1,
    per_page: Annotated[
        int,
        Query(ge=1, le=100),
    ] = 20,
    github_client: Annotated[
        GitHubClient | None,
        Depends(lambda: None),
    ] = None,
) -> RepositoryListResponse:
    """
    List repositories belonging to an organization.

    Organization membership is enforced by the dependency layer.
    Repository filtering is enforced by RepositoryService and
    RepositoryRepository.
    """

    service = _create_repository_service(
        db=db,
    )

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
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    github_client: Annotated[
        GitHubClient | None,
        Depends(lambda: None),
    ] = None,
) -> RepositoryResponse:
    """
    Retrieve a repository belonging to an organization.

    Organization scoping is enforced by RepositoryService and
    RepositoryRepository.
    """

    service = _create_repository_service(
        db=db,
    )

    try:
        return await service.get_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )

    except RepositoryNotFoundError as exc:
        raise _repository_not_found() from exc


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
    github_client: Annotated[
        GitHubClient,
        Depends(get_github_client),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> RepositoryResponse:
    """
    Update repository settings.

    RepositoryService owns business validation, including GitHub
    branch validation.

    Transaction ownership remains at the API/application boundary.
    """

    service = _create_repository_service(
        db=db,
        github_client=github_client,
        github_access_token=github_access_token,
    )

    try:
        repository = await service.update_repository(
            organization_id=organization_id,
            repository_id=repository_id,
            payload=payload,
        )

        await db.commit()

        return repository

    except RepositoryNotFoundError as exc:
        await _rollback(db)

        raise _repository_not_found() from exc

    except GitHubRepositoryNotFoundError as exc:
        await _rollback(db)

        raise _github_repository_not_found(exc) from exc

    except GitHubRepositoryAccessError as exc:
        await _rollback(db)

        raise _github_access_denied(exc) from exc

    except InvalidRepositoryBranchError as exc:
        await _rollback(db)

        raise _invalid_branch(exc) from exc

    except Exception:
        await _rollback(db)
        raise


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
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    github_client: Annotated[
        GitHubClient | None,
        Depends(lambda: None),
    ] = None,
) -> Response:
    """
    Remove a repository from an organization.

    This deletes only the Coodara repository record.
    It does not delete anything from GitHub.

    Transaction ownership remains at the API/application boundary.
    """

    service = _create_repository_service(
        db=db,
    )

    try:
        await service.delete_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        await db.commit()

        return Response(
            status_code=status.HTTP_204_NO_CONTENT,
        )

    except RepositoryNotFoundError as exc:
        await _rollback(db)

        raise _repository_not_found() from exc

    except Exception:
        await _rollback(db)
        raise