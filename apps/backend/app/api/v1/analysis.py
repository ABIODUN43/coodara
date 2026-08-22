"""
Analysis API endpoints.

All analysis endpoints are organization-scoped through the repository.

Authorization:

    authenticated user
        ↓
    organization membership
        ↓
    AnalysisService

Responsibilities:

    API layer
        - HTTP request/response handling
        - authorization dependency integration
        - transaction boundary for analysis creation
        - background execution scheduling

    AnalysisService
        - analysis business rules
        - repository ownership validation
        - active-analysis validation
        - analysis retrieval

    AnalysisExecutionService
        - actual repository analysis execution
        - analysis lifecycle transitions
        - result persistence
"""

from __future__ import annotations

from math import ceil
from typing import Annotated

from app.analysis.factory import execute_analysis_in_background
from app.api.dependencies import OrganizationMemberDependency
from app.db.session import get_db
from app.schemas.analysis import (
    AnalysisListResponse,
    AnalysisResponse,
    AnalysisResultResponse,
)
from app.services.analysis_service import (
    AnalysisAlreadyActiveError,
    AnalysisNotFoundError,
    AnalysisResultNotFoundError,
    AnalysisService,
)
from app.services.repository_service import RepositoryNotFoundError
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Path,
    Query,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix=(
        "/organizations/{organization_id}"
        "/repositories/{repository_id}"
        "/analyses"
    ),
    tags=["Analyses"],
)


def _create_analysis_service(
    db: AsyncSession,
) -> AnalysisService:
    """
    Create the analysis application service.
    """

    return AnalysisService(db)


@router.post(
    "",
    response_model=AnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_analysis(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
        int,
        Path(gt=0),
    ],
    member: OrganizationMemberDependency,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> AnalysisResponse:
    """
    Create and schedule a repository analysis.

    The analysis job is committed before the background task
    is scheduled.

    The background task creates and owns its own database session.
    """

    service = _create_analysis_service(db)

    try:
        analysis = await service.create_analysis(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        # The job must be durable before execution begins.
        await db.commit()

    except RepositoryNotFoundError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc

    except AnalysisAlreadyActiveError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except Exception:
        await db.rollback()
        raise

    # Only schedule execution after the transaction succeeds.
    background_tasks.add_task(
        execute_analysis_in_background,
        analysis_id=analysis.id,
    )

    return analysis


@router.get(
    "",
    response_model=AnalysisListResponse,
)
async def list_analyses(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
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
) -> AnalysisListResponse:
    """
    List analysis jobs for a repository.
    """

    service = _create_analysis_service(db)

    try:
        analyses, total = await service.list_analyses(
            organization_id=organization_id,
            repository_id=repository_id,
            page=page,
            per_page=per_page,
        )

    except RepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc

    pages = ceil(total / per_page) if total else 0

    return AnalysisListResponse(
        items=analyses,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get(
    "/{analysis_id}",
    response_model=AnalysisResponse,
)
async def get_analysis(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
        int,
        Path(gt=0),
    ],
    analysis_id: Annotated[
        int,
        Path(gt=0),
    ],
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> AnalysisResponse:
    """
    Retrieve one analysis job.
    """

    service = _create_analysis_service(db)

    try:
        return await service.get_analysis(
            organization_id=organization_id,
            repository_id=repository_id,
            analysis_id=analysis_id,
        )

    except RepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc

    except AnalysisNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found.",
        ) from exc


@router.get(
    "/{analysis_id}/result",
    response_model=AnalysisResultResponse,
)
async def get_analysis_result(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
        int,
        Path(gt=0,
    )],
    analysis_id: Annotated[
        int,
        Path(gt=0),
    ],
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> AnalysisResultResponse:
    """
    Retrieve the result of a completed analysis.
    """

    service = _create_analysis_service(db)

    try:
        return await service.get_analysis_result(
            organization_id=organization_id,
            repository_id=repository_id,
            analysis_id=analysis_id,
        )

    except RepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc

    except AnalysisNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found.",
        ) from exc

    except AnalysisResultNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis result not found.",
        ) from exc