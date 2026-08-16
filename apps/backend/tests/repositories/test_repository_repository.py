"""
Tests for repository persistence operations.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from app.models.repository import Repository
from app.repositories.repository_repository import RepositoryRepository


@pytest.fixture
def db() -> MagicMock:
    """Create a mock async database session."""
    database = MagicMock()

    # SQLAlchemy AsyncSession methods:
    # - add() is synchronous.
    # - execute(), flush(), refresh(), and delete() are async.
    database.add = MagicMock()
    database.execute = AsyncMock()
    database.flush = AsyncMock()
    database.refresh = AsyncMock()
    database.delete = AsyncMock()

    return database


@pytest.fixture
def repository_repository(
    db: MagicMock,
) -> RepositoryRepository:
    return RepositoryRepository(db)


@pytest.mark.asyncio
async def test_create_adds_repository_and_flushes(
    repository_repository: RepositoryRepository,
    db: MagicMock,
) -> None:
    repository = MagicMock(spec=Repository)

    result = await repository_repository.create(repository)

    db.add.assert_called_once_with(repository)
    db.flush.assert_awaited_once()
    db.refresh.assert_awaited_once_with(repository)

    assert result is repository


@pytest.mark.asyncio
async def test_get_by_id(
    repository_repository: RepositoryRepository,
    db: MagicMock,
) -> None:
    repository = MagicMock(spec=Repository)

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = repository

    db.execute.return_value = scalar_result

    result = await repository_repository.get_by_id(123)

    assert result is repository
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_by_id_returns_none(
    repository_repository: RepositoryRepository,
    db: MagicMock,
) -> None:
    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = None

    db.execute.return_value = scalar_result

    result = await repository_repository.get_by_id(999)

    assert result is None
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_by_organization_and_id(
    repository_repository: RepositoryRepository,
    db: MagicMock,
) -> None:
    repository = MagicMock(spec=Repository)

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = repository

    db.execute.return_value = scalar_result

    result = await repository_repository.get_by_organization_and_id(
        organization_id=10,
        repository_id=20,
    )

    assert result is repository
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_by_organization_and_github_id(
    repository_repository: RepositoryRepository,
    db: MagicMock,
) -> None:
    repository = MagicMock(spec=Repository)

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = repository

    db.execute.return_value = scalar_result

    result = await repository_repository.get_by_organization_and_github_id(
        organization_id=10,
        github_id=9876543210,
    )

    assert result is repository
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_by_organization(
    repository_repository: RepositoryRepository,
    db: MagicMock,
) -> None:
    repositories = [
        MagicMock(spec=Repository),
        MagicMock(spec=Repository),
    ]

    scalar_result = MagicMock()
    scalar_result.scalars.return_value.all.return_value = repositories

    db.execute.return_value = scalar_result

    result = await repository_repository.list_by_organization(
        organization_id=10,
        offset=0,
        limit=20,
    )

    assert result == repositories
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_count_by_organization(
    repository_repository: RepositoryRepository,
    db: MagicMock,
) -> None:
    scalar_result = MagicMock()
    scalar_result.scalar_one.return_value = 5

    db.execute.return_value = scalar_result

    result = await repository_repository.count_by_organization(
        organization_id=10,
    )

    assert result == 5
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_flushes_and_refreshes(
    repository_repository: RepositoryRepository,
    db: MagicMock,
) -> None:
    repository = MagicMock(spec=Repository)

    result = await repository_repository.update(repository)

    db.flush.assert_awaited_once()
    db.refresh.assert_awaited_once_with(repository)

    assert result is repository


@pytest.mark.asyncio
async def test_delete_removes_repository(
    repository_repository: RepositoryRepository,
    db: MagicMock,
) -> None:
    repository = MagicMock(spec=Repository)

    result = await repository_repository.delete(repository)

    assert result is None

    db.delete.assert_awaited_once_with(repository)
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_by_organization_and_id_returns_true(
    repository_repository: RepositoryRepository,
    db: MagicMock,
) -> None:
    result = MagicMock()
    result.rowcount = 1

    db.execute.return_value = result

    deleted = await repository_repository.delete_by_organization_and_id(
        organization_id=10,
        repository_id=20,
    )

    assert deleted is True
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_by_organization_and_id_returns_false(
    repository_repository: RepositoryRepository,
    db: MagicMock,
) -> None:
    result = MagicMock()
    result.rowcount = 0

    db.execute.return_value = result

    deleted = await repository_repository.delete_by_organization_and_id(
        organization_id=10,
        repository_id=20,
    )

    assert deleted is False
    db.execute.assert_awaited_once()