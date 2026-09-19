"""
Architecture Memory API router for Coodara V2.

Provides endpoints for inspecting repository architectural memory, historical evolution
events, knowledge entries, and semantic/keyword memory search.
"""

from __future__ import annotations

import logging
from typing import Any

from app.api.dependencies import (
    OrganizationMemberDependency,
)
from app.db.session import get_db
from app.models.analysis import AnalysisStatus
from app.models.memory import ArchitectureEventType, ComponentStatus, MemoryType
from app.repositories.analysis_repository import AnalysisRepository
from app.schemas.memory import (
    ArchitectureComponentResponse,
    ArchitectureEventResponse,
    ArchitectureHistoryResponse,
    ArchitectureMemoryEntryResponse,
    ArchitectureMemoryOverviewResponse,
    ArchitectureTechnologyMemoryResponse,
    MemorySearchResponse,
    ScoredMemoryEntryResponse,
)
from app.services.architecture_memory_service import (
    ArchitectureMemoryService,
    MemoryAnalysisNotFoundError,
    MemoryEntryNotFoundError,
    MemoryRepositoryNotFoundError,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/organizations/{organization_id}/repositories/{repository_id}",
    tags=["Architecture Memory"],
)


def _create_memory_service(
    db: AsyncSession,
) -> ArchitectureMemoryService:
    return ArchitectureMemoryService(db)


@router.get(
    "/memory",
    response_model=ArchitectureMemoryOverviewResponse,
    summary="Get repository architectural memory overview",
)
async def get_repository_memory(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> ArchitectureMemoryOverviewResponse:
    """
    Retrieve the full accumulated architectural memory for a repository.
    """
    service = _create_memory_service(db)
    try:
        memory = await service.get_memory(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        if memory is None:
            return ArchitectureMemoryOverviewResponse(
                repository_id=repository_id,
                organization_id=organization_id,
                latest_analysis_id=None,
                components_count=0,
                active_components_count=0,
                technologies_count=0,
                entries_count=0,
                events_count=0,
                components=[],
                technologies=[],
                entries=[],
                recent_events=[],
            )

        active_comps = [c for c in memory.components if c.status == ComponentStatus.ACTIVE]
        events, total_events = await service.list_events(
            organization_id=organization_id,
            repository_id=repository_id,
            offset=0,
            limit=10,
        )

        return ArchitectureMemoryOverviewResponse(
            repository_id=repository_id,
            organization_id=organization_id,
            latest_analysis_id=memory.latest_analysis_id,
            components_count=len(memory.components),
            active_components_count=len(active_comps),
            technologies_count=len(memory.technologies),
            entries_count=len(memory.entries),
            events_count=total_events,
            components=[
                ArchitectureComponentResponse.model_validate(c)
                for c in memory.components
            ],
            technologies=[
                ArchitectureTechnologyMemoryResponse.model_validate(t)
                for t in memory.technologies
            ],
            entries=[
                ArchitectureMemoryEntryResponse.model_validate(e)
                for e in memory.entries
            ],
            recent_events=[
                ArchitectureEventResponse.model_validate(ev)
                for ev in events
            ],
        )
    except MemoryRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/memory/search",
    response_model=MemorySearchResponse,
    summary="Search architecture memory",
)
async def search_memory(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    q: str = Query(..., min_length=1, description="Search query string"),
    memory_type: MemoryType | None = Query(None, description="Optional memory type filter"),
    limit: int = Query(15, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> MemorySearchResponse:
    """
    Perform hybrid semantic and keyword search across architectural memory entries.
    """
    service = _create_memory_service(db)
    try:
        scored_entries = await service.search_memory(
            organization_id=organization_id,
            repository_id=repository_id,
            query=q,
            memory_type=memory_type,
            limit=limit,
        )

        results = [
            ScoredMemoryEntryResponse(
                entry=ArchitectureMemoryEntryResponse.model_validate(item.entry),
                score=item.score,
                matched_terms=item.matched_terms,
            )
            for item in scored_entries
        ]

        return MemorySearchResponse(
            query=q,
            total_matches=len(results),
            results=results,
        )
    except MemoryRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/memory/events",
    response_model=list[ArchitectureEventResponse],
    summary="List architectural evolution events",
)
async def list_memory_events(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    event_type: ArchitectureEventType | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[ArchitectureEventResponse]:
    """
    List historical architectural change events for a repository.
    """
    service = _create_memory_service(db)
    try:
        events, _ = await service.list_events(
            organization_id=organization_id,
            repository_id=repository_id,
            offset=offset,
            limit=limit,
            event_type=event_type,
        )
        return [
            ArchitectureEventResponse.model_validate(e)
            for e in events
        ]
    except MemoryRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/memory/entries",
    response_model=list[ArchitectureMemoryEntryResponse],
    summary="List architectural knowledge entries",
)
async def list_memory_entries(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    memory_type: MemoryType | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[ArchitectureMemoryEntryResponse]:
    """
    List discrete architectural knowledge entries.
    """
    service = _create_memory_service(db)
    try:
        entries = await service.list_entries(
            organization_id=organization_id,
            repository_id=repository_id,
            offset=offset,
            limit=limit,
            memory_type=memory_type,
        )
        return [
            ArchitectureMemoryEntryResponse.model_validate(e)
            for e in entries
        ]
    except MemoryRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/memory/entries/{entry_id}",
    response_model=ArchitectureMemoryEntryResponse,
    summary="Get single architectural knowledge entry",
)
async def get_memory_entry(
    organization_id: int,
    repository_id: int,
    entry_id: int,
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> ArchitectureMemoryEntryResponse:
    """
    Retrieve one specific knowledge entry with provenance details.
    """
    service = _create_memory_service(db)
    try:
        entry = await service.get_entry(
            organization_id=organization_id,
            repository_id=repository_id,
            entry_id=entry_id,
        )
        return ArchitectureMemoryEntryResponse.model_validate(entry)
    except (MemoryRepositoryNotFoundError, MemoryEntryNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/architecture/history",
    response_model=ArchitectureHistoryResponse,
    summary="Get architecture evolution timeline",
)
async def get_architecture_history(
    organization_id: int,
    repository_id: int,
    member: OrganizationMemberDependency,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> ArchitectureHistoryResponse:
    """
    Retrieve the chronological architectural evolution history for timeline views.
    """
    service = _create_memory_service(db)
    try:
        events, total = await service.list_events(
            organization_id=organization_id,
            repository_id=repository_id,
            offset=offset,
            limit=limit,
        )

        # Auto-reconcile completed analysis jobs if events are empty
        if total == 0:
            try:
                analysis_repo = AnalysisRepository(db)
                jobs = await analysis_repo.get_by_repository(repository_id=repository_id)
                completed_jobs = [
                    j for j in jobs
                    if j.status == AnalysisStatus.COMPLETED or getattr(j.status, "value", str(j.status)) == "completed"
                ]
                completed_jobs.sort(key=lambda j: j.id)
                for job in completed_jobs:
                    try:
                        await service.reconcile_memory(
                            organization_id=organization_id,
                            repository_id=repository_id,
                            analysis_id=job.id,
                        )
                    except Exception as rec_err:
                        logger.warning(
                            "Auto-reconcile on history retrieval failed for job %d: %s",
                            job.id,
                            rec_err,
                        )

                events, total = await service.list_events(
                    organization_id=organization_id,
                    repository_id=repository_id,
                    offset=offset,
                    limit=limit,
                )
            except Exception as e:
                logger.warning("Auto-reconcile check failed: %s", e)

        event_items = [
            ArchitectureEventResponse.model_validate(e)
            for e in events
        ]

        return ArchitectureHistoryResponse(
            repository_id=repository_id,
            organization_id=organization_id,
            total_events=total,
            events=event_items,
            items=event_items,
        )
    except MemoryRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

