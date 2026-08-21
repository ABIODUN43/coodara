"""
Analysis API endpoints.

All analysis endpoints are organization-scoped through the repository.

Authorization:

    authenticated user
        ↓
    organization membership
        ↓
    AnalysisService

Business logic belongs to AnalysisService.
Database access belongs to AnalysisRepository.
"""

from __future__ import annotations

from math import ceil
from typing import Annotated

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
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/organizations/{organization_id}/repositories/{repository_id}/analyses",
    tags=["Analyses"],
)


def _create_analysis_service(
    db: AsyncSession,
) -> AnalysisService:
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
    db: AsyncSession = Depends(get_db),
) -> AnalysisResponse:
    """
    Create a new analysis for a repository.
    """

    service = _create_analysis_service(db)

    try:
        return await service.create_analysis(
            organization_id=organization_id,
            repository_id=repository_id,
        )

    except RepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc

    except AnalysisAlreadyActiveError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


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
        Path(gt=0),
    ],
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
