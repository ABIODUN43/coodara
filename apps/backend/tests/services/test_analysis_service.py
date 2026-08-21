"""
Tests for repository analysis application service.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from app.models.analysis import AnalysisJob, AnalysisResult
from app.models.repository import Repository
from app.services.analysis_service import (
    AnalysisAlreadyActiveError,
    AnalysisNotFoundError,
    AnalysisResultNotFoundError,
    AnalysisService,
)
from app.services.repository_service import RepositoryNotFoundError


def make_service() -> AnalysisService:
    db = MagicMock()
    return AnalysisService(db)


def make_repository(
    *,
    repository_id: int = 1,
    organization_id: int = 10,
) -> Repository:
    return Repository(
        id=repository_id,
        organization_id=organization_id,
        github_id=123456789,
        name="example",
        full_name="owner/example",
        description="Example repository",
        visibility="public",
        default_branch="main",
        primary_language="Python",
        clone_url="https://github.com/owner/example.git",
        html_url="https://github.com/owner/example",
    )


def make_analysis(
    *,
    analysis_id: int = 1,
    repository_id: int = 1,
) -> AnalysisJob:
    return AnalysisJob(
        id=analysis_id,
        repository_id=repository_id,
    )


def make_result(
    *,
    result_id: int = 1,
    analysis_job_id: int = 1,
) -> AnalysisResult:
    return AnalysisResult(
        id=result_id,
        analysis_job_id=analysis_job_id,
        summary="Analysis completed.",
    )


@pytest.mark.asyncio
async def test_create_analysis_creates_job_for_owned_repository() -> None:
    service = make_service()

    repository = make_repository()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=repository,
    )
    service.analysis_repository.get_active = AsyncMock(
        return_value=None,
    )
    service.analysis_repository.create = AsyncMock(
        side_effect=lambda job: job,
    )

    result = await service.create_analysis(
        organization_id=10,
        repository_id=1,
    )

    assert result.repository_id == 1

    service.repository_repository.get_by_organization_and_id.assert_awaited_once_with(
        organization_id=10,
        repository_id=1,
    )

    service.analysis_repository.get_active.assert_awaited_once_with(
        repository_id=1,
    )

    service.analysis_repository.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_analysis_rejects_missing_repository() -> None:
    service = make_service()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=None,
    )

    with pytest.raises(RepositoryNotFoundError):
        await service.create_analysis(
            organization_id=10,
            repository_id=999,
        )

    service.analysis_repository.get_active = AsyncMock()

    service.analysis_repository.get_active.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_analysis_rejects_active_analysis() -> None:
    service = make_service()

    repository = make_repository()
    active_analysis = make_analysis()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=repository,
    )
    service.analysis_repository.get_active = AsyncMock(
        return_value=active_analysis,
    )
    service.analysis_repository.create = AsyncMock()

    with pytest.raises(AnalysisAlreadyActiveError):
        await service.create_analysis(
            organization_id=10,
            repository_id=1,
        )

    service.analysis_repository.create.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_analysis_returns_analysis_for_owned_repository() -> None:
    service = make_service()

    repository = make_repository()
    analysis = make_analysis()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=repository,
    )
    service.analysis_repository.get_by_id = AsyncMock(
        return_value=analysis,
    )

    result = await service.get_analysis(
        organization_id=10,
        repository_id=1,
        analysis_id=1,
    )

    assert result is analysis


@pytest.mark.asyncio
async def test_get_analysis_rejects_missing_repository() -> None:
    service = make_service()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=None,
    )

    with pytest.raises(RepositoryNotFoundError):
        await service.get_analysis(
            organization_id=10,
            repository_id=999,
            analysis_id=1,
        )


@pytest.mark.asyncio
async def test_get_analysis_rejects_missing_analysis() -> None:
    service = make_service()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=make_repository(),
    )
    service.analysis_repository.get_by_id = AsyncMock(
        return_value=None,
    )

    with pytest.raises(AnalysisNotFoundError):
        await service.get_analysis(
            organization_id=10,
            repository_id=1,
            analysis_id=999,
        )


@pytest.mark.asyncio
async def test_get_analysis_rejects_analysis_from_another_repository() -> None:
    service = make_service()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=make_repository(repository_id=1),
    )

    analysis = make_analysis(
        analysis_id=100,
        repository_id=2,
    )

    service.analysis_repository.get_by_id = AsyncMock(
        return_value=analysis,
    )

    with pytest.raises(AnalysisNotFoundError):
        await service.get_analysis(
            organization_id=10,
            repository_id=1,
            analysis_id=100,
        )


@pytest.mark.asyncio
async def test_list_analyses_returns_items_and_total() -> None:
    service = make_service()

    repository = make_repository()

    analyses = [
        make_analysis(analysis_id=1),
        make_analysis(analysis_id=2),
    ]

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=repository,
    )
    service.analysis_repository.get_by_repository = AsyncMock(
        return_value=analyses,
    )
    service.analysis_repository.count_by_repository = AsyncMock(
        return_value=2,
    )

    result, total = await service.list_analyses(
        organization_id=10,
        repository_id=1,
        page=2,
        per_page=20,
    )

    assert result == analyses
    assert total == 2

    service.analysis_repository.get_by_repository.assert_awaited_once_with(
        repository_id=1,
        offset=20,
        limit=20,
    )

    service.analysis_repository.count_by_repository.assert_awaited_once_with(
        repository_id=1,
    )


@pytest.mark.asyncio
async def test_list_analyses_rejects_missing_repository() -> None:
    service = make_service()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=None,
    )

    with pytest.raises(RepositoryNotFoundError):
        await service.list_analyses(
            organization_id=10,
            repository_id=999,
        )


@pytest.mark.parametrize(
    ("page", "per_page"),
    [
        (0, 20),
        (-1, 20),
        (1, 0),
        (1, -1),
        (1, 101),
    ],
)
@pytest.mark.asyncio
async def test_list_analyses_rejects_invalid_pagination(
    page: int,
    per_page: int,
) -> None:
    service = make_service()

    with pytest.raises(ValueError):
        await service.list_analyses(
            organization_id=10,
            repository_id=1,
            page=page,
            per_page=per_page,
        )


@pytest.mark.asyncio
async def test_get_analysis_result_returns_result() -> None:
    service = make_service()

    repository = make_repository()
    analysis = make_analysis()
    result = make_result()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=repository,
    )
    service.analysis_repository.get_by_id = AsyncMock(
        return_value=analysis,
    )
    service.analysis_repository.get_result_by_job = AsyncMock(
        return_value=result,
    )

    returned = await service.get_analysis_result(
        organization_id=10,
        repository_id=1,
        analysis_id=1,
    )

    assert returned is result

    service.analysis_repository.get_result_by_job.assert_awaited_once_with(
        analysis_job_id=1,
    )


@pytest.mark.asyncio
async def test_get_analysis_result_rejects_missing_analysis() -> None:
    service = make_service()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=make_repository(),
    )
    service.analysis_repository.get_by_id = AsyncMock(
        return_value=None,
    )
    service.analysis_repository.get_result_by_job = AsyncMock()

    with pytest.raises(AnalysisNotFoundError):
        await service.get_analysis_result(
            organization_id=10,
            repository_id=1,
            analysis_id=999,
        )

    service.analysis_repository.get_result_by_job.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_analysis_result_rejects_missing_result() -> None:
    service = make_service()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=make_repository(),
    )
    service.analysis_repository.get_by_id = AsyncMock(
        return_value=make_analysis(),
    )
    service.analysis_repository.get_result_by_job = AsyncMock(
        return_value=None,
    )

    with pytest.raises(AnalysisResultNotFoundError):
        await service.get_analysis_result(
            organization_id=10,
            repository_id=1,
            analysis_id=1,
        )