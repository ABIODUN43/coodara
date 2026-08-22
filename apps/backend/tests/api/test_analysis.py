"""
Analysis API endpoint tests.

These tests verify:

- analysis creation;
- transaction commit/rollback behavior;
- background execution scheduling;
- repository-not-found mapping;
- active-analysis conflict mapping;
- analysis listing and pagination;
- analysis retrieval;
- analysis result retrieval;
- HTTP-layer exception mapping.
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.api.v1.analysis import (
    create_analysis,
    get_analysis,
    get_analysis_result,
    list_analyses,
)
from app.models.analysis import (
    AnalysisJob,
    AnalysisResult,
    AnalysisStatus,
)
from app.services.analysis_service import (
    AnalysisAlreadyActiveError,
    AnalysisNotFoundError,
    AnalysisResultNotFoundError,
)
from app.services.repository_service import RepositoryNotFoundError
from fastapi import BackgroundTasks, HTTPException

TEST_DATETIME = datetime(
    2026,
    1,
    1,
    tzinfo=timezone.utc,
)


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------


def make_background_tasks() -> BackgroundTasks:
    """Create background-task storage for endpoint unit tests."""

    return BackgroundTasks()


def make_member() -> MagicMock:
    """Create a mock organization member."""

    return MagicMock()


def make_db() -> MagicMock:
    """
    Create a mocked asynchronous database session.

    commit() and rollback() are asynchronous SQLAlchemy operations,
    so they must be represented by AsyncMock instances.
    """

    db = MagicMock()

    db.commit = AsyncMock()
    db.rollback = AsyncMock()

    return db


def make_analysis(
    *,
    analysis_id: int = 1,
    repository_id: int = 100,
    status: AnalysisStatus = AnalysisStatus.PENDING,
) -> AnalysisJob:
    """Create an analysis job for testing."""

    return AnalysisJob(
        id=analysis_id,
        repository_id=repository_id,
        status=status,
        progress=0,
        created_at=TEST_DATETIME,
        updated_at=TEST_DATETIME,
    )


def make_analysis_result(
    *,
    result_id: int = 1,
    analysis_job_id: int = 1,
) -> AnalysisResult:
    """Create an analysis result for testing."""

    return AnalysisResult(
        id=result_id,
        analysis_job_id=analysis_job_id,
        summary="Analysis completed successfully.",
        created_at=TEST_DATETIME,
    )


def make_service() -> MagicMock:
    """Create a mocked analysis service."""

    return MagicMock()


def patch_analysis_service(
    service: MagicMock,
):
    """Patch analysis service construction."""

    return patch(
        "app.api.v1.analysis._create_analysis_service",
        return_value=service,
    )


# ---------------------------------------------------------------------------
# Create analysis
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_analysis_returns_created_analysis() -> None:
    """
    Create analysis should return the newly created analysis and
    schedule background execution.
    """

    analysis = make_analysis()

    service = make_service()
    service.create_analysis = AsyncMock(
        return_value=analysis,
    )

    db = make_db()
    background_tasks = make_background_tasks()

    with patch_analysis_service(service):
        result = await create_analysis(
            organization_id=10,
            repository_id=100,
            member=make_member(),
            background_tasks=background_tasks,
            db=db,
        )

    assert result is analysis

    service.create_analysis.assert_awaited_once_with(
        organization_id=10,
        repository_id=100,
    )

    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()

    assert len(background_tasks.tasks) == 1

    task = background_tasks.tasks[0]

    assert task.func.__name__ == "execute_analysis_in_background"
    assert task.kwargs == {
        "analysis_id": analysis.id,
    }


@pytest.mark.asyncio
async def test_create_analysis_maps_repository_not_found_to_404() -> None:
    """
    Missing repository should produce HTTP 404.

    Failed analysis creation must not schedule background execution.
    """

    service = make_service()
    service.create_analysis = AsyncMock(
        side_effect=RepositoryNotFoundError(
            "Repository not found.",
        ),
    )

    db = make_db()
    background_tasks = make_background_tasks()

    with (
        patch_analysis_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await create_analysis(
            organization_id=10,
            repository_id=999,
            member=make_member(),
            background_tasks=background_tasks,
            db=db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."

    db.commit.assert_not_awaited()
    db.rollback.assert_awaited_once()

    assert background_tasks.tasks == []


@pytest.mark.asyncio
async def test_create_analysis_maps_active_analysis_to_409() -> None:
    """
    An active analysis should produce HTTP 409.

    Failed analysis creation must not schedule background execution.
    """

    service = make_service()
    service.create_analysis = AsyncMock(
        side_effect=AnalysisAlreadyActiveError(
            "Repository already has an active analysis.",
        ),
    )

    db = make_db()
    background_tasks = make_background_tasks()

    with (
        patch_analysis_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await create_analysis(
            organization_id=10,
            repository_id=100,
            member=make_member(),
            background_tasks=background_tasks,
            db=db,
        )

    assert exc_info.value.status_code == 409
    assert (
        exc_info.value.detail
        == "Repository already has an active analysis."
    )

    db.commit.assert_not_awaited()
    db.rollback.assert_awaited_once()

    assert background_tasks.tasks == []


@pytest.mark.asyncio
async def test_create_analysis_commits_transaction() -> None:
    """
    Successful analysis creation should commit before scheduling
    background execution.
    """

    analysis = make_analysis()

    service = make_service()
    service.create_analysis = AsyncMock(
        return_value=analysis,
    )

    db = make_db()
    background_tasks = make_background_tasks()

    with patch_analysis_service(service):
        result = await create_analysis(
            organization_id=10,
            repository_id=100,
            member=make_member(),
            background_tasks=background_tasks,
            db=db,
        )

    assert result is analysis

    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()

    assert len(background_tasks.tasks) == 1


@pytest.mark.asyncio
async def test_create_analysis_rolls_back_on_service_error() -> None:
    """
    Service failure should roll back and never schedule execution.
    """

    service = make_service()
    service.create_analysis = AsyncMock(
        side_effect=RepositoryNotFoundError(
            "Repository not found.",
        ),
    )

    db = make_db()
    background_tasks = make_background_tasks()

    with (
        patch_analysis_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await create_analysis(
            organization_id=10,
            repository_id=999,
            member=make_member(),
            background_tasks=background_tasks,
            db=db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."

    db.commit.assert_not_awaited()
    db.rollback.assert_awaited_once()

    assert background_tasks.tasks == []


# ---------------------------------------------------------------------------
# List analyses
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_analyses_returns_paginated_response() -> None:
    """
    List endpoint should return correctly calculated pagination.
    """

    analyses = [
        make_analysis(
            analysis_id=1,
            repository_id=100,
        ),
        make_analysis(
            analysis_id=2,
            repository_id=100,
        ),
    ]

    service = make_service()
    service.list_analyses = AsyncMock(
        return_value=(analyses, 45),
    )

    with patch_analysis_service(service):
        result = await list_analyses(
            organization_id=10,
            repository_id=100,
            member=make_member(),
            page=2,
            per_page=20,
            db=make_db(),
        )

    assert len(result.items) == len(analyses)

    for actual, expected in zip(
        result.items,
        analyses,
        strict=True,
    ):
        assert actual.id == expected.id
        assert actual.repository_id == expected.repository_id
        assert actual.status == expected.status
        assert actual.progress == expected.progress
        assert actual.started_at == expected.started_at
        assert actual.completed_at == expected.completed_at
        assert actual.error_message == expected.error_message
        assert actual.created_at == expected.created_at
        assert actual.updated_at == expected.updated_at

    assert result.total == 45
    assert result.page == 2
    assert result.per_page == 20
    assert result.pages == 3

    service.list_analyses.assert_awaited_once_with(
        organization_id=10,
        repository_id=100,
        page=2,
        per_page=20,
    )


@pytest.mark.asyncio
async def test_list_analyses_returns_zero_pages_for_empty_result() -> None:
    """An empty analysis list should report zero pages."""

    service = make_service()
    service.list_analyses = AsyncMock(
        return_value=([], 0),
    )

    with patch_analysis_service(service):
        result = await list_analyses(
            organization_id=10,
            repository_id=100,
            member=make_member(),
            page=1,
            per_page=20,
            db=make_db(),
        )

    assert result.items == []
    assert result.total == 0
    assert result.page == 1
    assert result.per_page == 20
    assert result.pages == 0


@pytest.mark.asyncio
async def test_list_analyses_maps_repository_not_found_to_404() -> None:
    """Missing repository should produce HTTP 404."""

    service = make_service()
    service.list_analyses = AsyncMock(
        side_effect=RepositoryNotFoundError(
            "Repository not found.",
        ),
    )

    with (
        patch_analysis_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await list_analyses(
            organization_id=10,
            repository_id=999,
            member=make_member(),
            page=1,
            per_page=20,
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."


# ---------------------------------------------------------------------------
# Get analysis
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_analysis_returns_analysis() -> None:
    """Get endpoint should return the requested analysis."""

    analysis = make_analysis()

    service = make_service()
    service.get_analysis = AsyncMock(
        return_value=analysis,
    )

    with patch_analysis_service(service):
        result = await get_analysis(
            organization_id=10,
            repository_id=100,
            analysis_id=1,
            member=make_member(),
            db=make_db(),
        )

    assert result is analysis

    service.get_analysis.assert_awaited_once_with(
        organization_id=10,
        repository_id=100,
        analysis_id=1,
    )


@pytest.mark.asyncio
async def test_get_analysis_maps_repository_not_found_to_404() -> None:
    """Missing repository should produce HTTP 404."""

    service = make_service()
    service.get_analysis = AsyncMock(
        side_effect=RepositoryNotFoundError(
            "Repository not found.",
        ),
    )

    with (
        patch_analysis_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_analysis(
            organization_id=10,
            repository_id=999,
            analysis_id=1,
            member=make_member(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."


@pytest.mark.asyncio
async def test_get_analysis_maps_analysis_not_found_to_404() -> None:
    """Missing analysis should produce HTTP 404."""

    service = make_service()
    service.get_analysis = AsyncMock(
        side_effect=AnalysisNotFoundError(
            "Analysis not found.",
        ),
    )

    with (
        patch_analysis_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_analysis(
            organization_id=10,
            repository_id=100,
            analysis_id=999,
            member=make_member(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Analysis not found."


# ---------------------------------------------------------------------------
# Get analysis result
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_analysis_result_returns_result() -> None:
    """Get-result endpoint should return the analysis result."""

    result = make_analysis_result()

    service = make_service()
    service.get_analysis_result = AsyncMock(
        return_value=result,
    )

    with patch_analysis_service(service):
        response = await get_analysis_result(
            organization_id=10,
            repository_id=100,
            analysis_id=1,
            member=make_member(),
            db=make_db(),
        )

    assert response is result

    service.get_analysis_result.assert_awaited_once_with(
        organization_id=10,
        repository_id=100,
        analysis_id=1,
    )


@pytest.mark.asyncio
async def test_get_analysis_result_maps_repository_not_found_to_404() -> None:
    """Missing repository should produce HTTP 404."""

    service = make_service()
    service.get_analysis_result = AsyncMock(
        side_effect=RepositoryNotFoundError(
            "Repository not found.",
        ),
    )

    with (
        patch_analysis_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_analysis_result(
            organization_id=10,
            repository_id=999,
            analysis_id=1,
            member=make_member(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."


@pytest.mark.asyncio
async def test_get_analysis_result_maps_analysis_not_found_to_404() -> None:
    """Missing analysis should produce HTTP 404."""

    service = make_service()
    service.get_analysis_result = AsyncMock(
        side_effect=AnalysisNotFoundError(
            "Analysis not found.",
        ),
    )

    with (
        patch_analysis_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_analysis_result(
            organization_id=10,
            repository_id=100,
            analysis_id=999,
            member=make_member(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Analysis not found."


@pytest.mark.asyncio
async def test_get_analysis_result_maps_result_not_found_to_404() -> None:
    """Missing analysis result should produce HTTP 404."""

    service = make_service()
    service.get_analysis_result = AsyncMock(
        side_effect=AnalysisResultNotFoundError(
            "Analysis result not found.",
        ),
    )

    with (
        patch_analysis_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_analysis_result(
            organization_id=10,
            repository_id=100,
            analysis_id=1,
            member=make_member(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Analysis result not found."