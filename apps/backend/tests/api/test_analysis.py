"""
Analysis API endpoint tests.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.models.analysis import AnalysisJob, AnalysisResult
from app.services.analysis_service import (
    AnalysisAlreadyActiveError,
    AnalysisNotFoundError,
    AnalysisResultNotFoundError,
)

"""
Tests for analysis API endpoints.
"""

from datetime import datetime, timezone

from app.api.v1.analysis import (
    create_analysis,
    get_analysis,
    get_analysis_result,
    list_analyses,
)
from app.models.analysis import (
    AnalysisStatus,
)
from app.services.repository_service import RepositoryNotFoundError
from fastapi import HTTPException

TEST_DATETIME = datetime(
    2026,
    1,
    1,
    tzinfo=timezone.utc,
)


def make_member() -> MagicMock:
    """Create a mock organization member."""
    return MagicMock()


def make_db() -> MagicMock:
    """Create a mock database session."""
    return MagicMock()


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
    """Patch analysis service creation."""
    return patch(
        "app.api.v1.analysis._create_analysis_service",
        return_value=service,
    )


@pytest.mark.asyncio
async def test_create_analysis_returns_created_analysis() -> None:
    analysis = make_analysis()

    service = make_service()
    service.create_analysis = AsyncMock(
        return_value=analysis,
    )

    with patch_analysis_service(service):
        result = await create_analysis(
            organization_id=10,
            repository_id=100,
            member=make_member(),
            db=make_db(),
        )

    assert result is analysis

    service.create_analysis.assert_awaited_once_with(
        organization_id=10,
        repository_id=100,
    )


@pytest.mark.asyncio
async def test_create_analysis_maps_repository_not_found_to_404() -> None:
    service = make_service()
    service.create_analysis = AsyncMock(
        side_effect=RepositoryNotFoundError(
            "Repository not found.",
        ),
    )

    with (
        patch_analysis_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await create_analysis(
            organization_id=10,
            repository_id=999,
            member=make_member(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."


@pytest.mark.asyncio
async def test_create_analysis_maps_active_analysis_to_409() -> None:
    service = make_service()
    service.create_analysis = AsyncMock(
        side_effect=AnalysisAlreadyActiveError(
            "Repository already has an active analysis.",
        ),
    )

    with (
        patch_analysis_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await create_analysis(
            organization_id=10,
            repository_id=100,
            member=make_member(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 409
    assert (
        exc_info.value.detail
        == "Repository already has an active analysis."
    )


@pytest.mark.asyncio
async def test_list_analyses_returns_paginated_response() -> None:
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


@pytest.mark.asyncio
async def test_get_analysis_returns_analysis() -> None:
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


@pytest.mark.asyncio
async def test_get_analysis_result_returns_result() -> None:
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