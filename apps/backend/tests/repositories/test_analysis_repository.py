"""
Tests for analysis persistence operations.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from app.models.analysis import AnalysisJob, AnalysisResult
from app.repositories.analysis_repository import AnalysisRepository


@pytest.fixture
def db() -> MagicMock:
    """Create a mock async database session."""
    database = MagicMock()

    database.add = MagicMock()
    database.execute = AsyncMock()
    database.flush = AsyncMock()
    database.refresh = AsyncMock()

    return database


@pytest.fixture
def analysis_repository(
    db: MagicMock,
) -> AnalysisRepository:
    return AnalysisRepository(db)


@pytest.mark.asyncio
async def test_create_adds_analysis_job_and_flushes(
    analysis_repository: AnalysisRepository,
    db: MagicMock,
) -> None:
    job = MagicMock(spec=AnalysisJob)

    result = await analysis_repository.create(job)

    db.add.assert_called_once_with(job)
    db.flush.assert_awaited_once()
    db.refresh.assert_awaited_once_with(job)

    assert result is job


@pytest.mark.asyncio
async def test_get_by_id(
    analysis_repository: AnalysisRepository,
    db: MagicMock,
) -> None:
    job = MagicMock(spec=AnalysisJob)

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = job

    db.execute.return_value = scalar_result

    result = await analysis_repository.get_by_id(123)

    assert result is job
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_by_id_returns_none(
    analysis_repository: AnalysisRepository,
    db: MagicMock,
) -> None:
    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = None

    db.execute.return_value = scalar_result

    result = await analysis_repository.get_by_id(999)

    assert result is None
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_by_repository(
    analysis_repository: AnalysisRepository,
    db: MagicMock,
) -> None:
    jobs = [
        MagicMock(spec=AnalysisJob),
        MagicMock(spec=AnalysisJob),
    ]

    scalar_result = MagicMock()
    scalar_result.scalars.return_value.all.return_value = jobs

    db.execute.return_value = scalar_result

    result = await analysis_repository.get_by_repository(
        repository_id=10,
        offset=0,
        limit=20,
    )

    assert result == jobs
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_running_returns_running_job(
    analysis_repository: AnalysisRepository,
    db: MagicMock,
) -> None:
    job = MagicMock(spec=AnalysisJob)

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = job

    db.execute.return_value = scalar_result

    result = await analysis_repository.get_running(
        repository_id=10,
    )

    assert result is job
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_running_returns_none(
    analysis_repository: AnalysisRepository,
    db: MagicMock,
) -> None:
    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = None

    db.execute.return_value = scalar_result

    result = await analysis_repository.get_running(
        repository_id=10,
    )

    assert result is None
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_flushes_and_refreshes(
    analysis_repository: AnalysisRepository,
    db: MagicMock,
) -> None:
    job = MagicMock(spec=AnalysisJob)

    result = await analysis_repository.update(job)

    db.flush.assert_awaited_once()
    db.refresh.assert_awaited_once_with(job)

    assert result is job


@pytest.mark.asyncio
async def test_create_result_adds_result_and_flushes(
    analysis_repository: AnalysisRepository,
    db: MagicMock,
) -> None:
    analysis_result = MagicMock(spec=AnalysisResult)

    result = await analysis_repository.create_result(
        analysis_result,
    )

    db.add.assert_called_once_with(analysis_result)
    db.flush.assert_awaited_once()
    db.refresh.assert_awaited_once_with(analysis_result)

    assert result is analysis_result


@pytest.mark.asyncio
async def test_get_result_by_job(
    analysis_repository: AnalysisRepository,
    db: MagicMock,
) -> None:
    analysis_result = MagicMock(spec=AnalysisResult)

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = analysis_result

    db.execute.return_value = scalar_result

    result = await analysis_repository.get_result_by_job(
        analysis_job_id=123,
    )

    assert result is analysis_result
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_result_by_job_returns_none(
    analysis_repository: AnalysisRepository,
    db: MagicMock,
) -> None:
    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = None

    db.execute.return_value = scalar_result

    result = await analysis_repository.get_result_by_job(
        analysis_job_id=999,
    )

    assert result is None
    db.execute.assert_awaited_once()