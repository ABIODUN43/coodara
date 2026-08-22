"""
Tests for ArchitectureRepository.

The repository layer is tested with a mocked AsyncSession,
following the existing repository-test pattern used by the backend.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from app.models.architecture import (
    ArchitectureIssue,
    ArchitectureRecommendation,
    ArchitectureScore,
    ArchitectureSnapshot,
)
from app.repositories.architecture_repository import ArchitectureRepository


@pytest.fixture
def database() -> MagicMock:
    """
    Create a mocked asynchronous database session.
    """

    database = MagicMock()

    database.add = MagicMock()
    database.execute = AsyncMock()
    database.flush = AsyncMock()
    database.refresh = AsyncMock()

    return database


def _scalar_result(value: object) -> MagicMock:
    """
    Create a mocked SQLAlchemy result returning one scalar value.
    """

    result = MagicMock()
    result.scalar_one_or_none.return_value = value

    return result


def _scalars_result(
    values: list[ArchitectureSnapshot],
) -> MagicMock:
    """
    Create a mocked SQLAlchemy result returning multiple snapshots.
    """

    result = MagicMock()
    result.scalars.return_value.all.return_value = values

    return result


def _snapshot(
    *,
    snapshot_id: int = 1,
    repository_id: int = 1,
    analysis_result_id: int = 1,
    version: int = 1,
) -> ArchitectureSnapshot:
    """
    Create an architecture snapshot for repository tests.
    """

    return ArchitectureSnapshot(
        id=snapshot_id,
        repository_id=repository_id,
        analysis_result_id=analysis_result_id,
        snapshot_version=version,
        graph='{"nodes":[],"edges":[]}',
    )


@pytest.mark.asyncio
async def test_create_snapshot(
    database: MagicMock,
) -> None:
    """
    A snapshot is added, flushed, refreshed, and returned.
    """

    snapshot = _snapshot()

    repository = ArchitectureRepository(database)

    result = await repository.create_snapshot(snapshot)

    assert result is snapshot

    database.add.assert_called_once_with(snapshot)
    database.flush.assert_awaited_once()
    database.refresh.assert_awaited_once_with(snapshot)


@pytest.mark.asyncio
async def test_get_by_id(
    database: MagicMock,
) -> None:
    """
    A snapshot can be retrieved by primary key.
    """

    snapshot = _snapshot(snapshot_id=10)

    database.execute.return_value = _scalar_result(snapshot)

    repository = ArchitectureRepository(database)

    result = await repository.get_by_id(10)

    assert result is snapshot
    database.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_by_id_returns_none_when_missing(
    database: MagicMock,
) -> None:
    """
    Missing snapshots return None.
    """

    database.execute.return_value = _scalar_result(None)

    repository = ArchitectureRepository(database)

    result = await repository.get_by_id(999)

    assert result is None
    database.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_by_analysis_result(
    database: MagicMock,
) -> None:
    """
    A snapshot can be retrieved from its source analysis result.
    """

    snapshot = _snapshot(
        snapshot_id=10,
        analysis_result_id=50,
    )

    database.execute.return_value = _scalar_result(snapshot)

    repository = ArchitectureRepository(database)

    result = await repository.get_by_analysis_result(
        analysis_result_id=50,
    )

    assert result is snapshot
    database.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_latest_by_repository(
    database: MagicMock,
) -> None:
    """
    The latest architecture snapshot can be retrieved for a repository.
    """

    snapshot = _snapshot(
        snapshot_id=20,
        repository_id=5,
        version=3,
    )

    database.execute.return_value = _scalar_result(snapshot)

    repository = ArchitectureRepository(database)

    result = await repository.get_latest_by_repository(
        repository_id=5,
    )

    assert result is snapshot
    assert result.snapshot_version == 3

    database.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_by_repository(
    database: MagicMock,
) -> None:
    """
    Architecture snapshots can be listed for a repository.
    """

    first = _snapshot(
        snapshot_id=1,
        repository_id=5,
        version=1,
    )

    second = _snapshot(
        snapshot_id=2,
        repository_id=5,
        version=2,
    )

    database.execute.return_value = _scalars_result(
        [second, first],
    )

    repository = ArchitectureRepository(database)

    result = await repository.get_by_repository(
        repository_id=5,
    )

    assert list(result) == [second, first]
    database.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_count_by_repository(
    database: MagicMock,
) -> None:
    """
    Repository snapshot counts are returned correctly.
    """

    result = MagicMock()
    result.scalar_one.return_value = 3

    database.execute.return_value = result

    repository = ArchitectureRepository(database)

    count = await repository.count_by_repository(
        repository_id=5,
    )

    assert count == 3
    database.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_previous_snapshot(
    database: MagicMock,
) -> None:
    """
    The previous architecture snapshot can be retrieved.
    """

    previous = _snapshot(
        snapshot_id=10,
        repository_id=5,
        version=2,
    )

    database.execute.return_value = _scalar_result(previous)

    repository = ArchitectureRepository(database)

    result = await repository.get_previous_snapshot(
        repository_id=5,
        snapshot_id=20,
    )

    assert result is previous
    assert result.snapshot_version == 2

    database.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_previous_snapshot_returns_none(
    database: MagicMock,
) -> None:
    """
    None is returned when a snapshot has no previous snapshot.
    """

    database.execute.return_value = _scalar_result(None)

    repository = ArchitectureRepository(database)

    result = await repository.get_previous_snapshot(
        repository_id=5,
        snapshot_id=1,
    )

    assert result is None
    database.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_add_score(
    database: MagicMock,
) -> None:
    """
    An architecture score can be persisted.
    """

    score = ArchitectureScore(
        architecture_snapshot_id=1,
        score=82.5,
        maintainability=85.0,
        coupling=80.0,
        cohesion=84.0,
        complexity=81.0,
    )

    repository = ArchitectureRepository(database)

    result = await repository.add_score(score)

    assert result is score

    database.add.assert_called_once_with(score)
    database.flush.assert_awaited_once()
    database.refresh.assert_awaited_once_with(score)


@pytest.mark.asyncio
async def test_add_issue(
    database: MagicMock,
) -> None:
    """
    An architecture issue can be persisted.
    """

    issue = ArchitectureIssue(
        architecture_snapshot_id=1,
        severity="high",
        category="dependency_hotspot",
        description=(
            "Module has excessive outgoing dependencies."
        ),
    )

    repository = ArchitectureRepository(database)

    result = await repository.add_issue(issue)

    assert result is issue

    database.add.assert_called_once_with(issue)
    database.flush.assert_awaited_once()
    database.refresh.assert_awaited_once_with(issue)


@pytest.mark.asyncio
async def test_add_recommendation(
    database: MagicMock,
) -> None:
    """
    An architecture recommendation can be persisted.
    """

    recommendation = ArchitectureRecommendation(
        architecture_snapshot_id=1,
        recommendation=(
            "Reduce dependencies in the service module."
        ),
        priority="high",
    )

    repository = ArchitectureRepository(database)

    result = await repository.add_recommendation(
        recommendation,
    )

    assert result is recommendation

    database.add.assert_called_once_with(
        recommendation,
    )
    database.flush.assert_awaited_once()
    database.refresh.assert_awaited_once_with(
        recommendation,
    )