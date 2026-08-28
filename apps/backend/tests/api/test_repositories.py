"""
Tests for repository API endpoints.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.api.v1.repositories import (
    delete_repository,
    get_repository,
    import_repository,
    list_repositories,
    update_repository,
)
from app.models.repository import Repository, RepositoryVisibility
from app.schemas.repository import (
    RepositoryImportRequest,
    RepositoryUpdateRequest,
)
from app.services.github_service import GitHubClient
from app.services.repository_service import (
    GitHubRepositoryAccessError,
    GitHubRepositoryNotFoundError,
    InvalidRepositoryBranchError,
    RepositoryAlreadyExistsError,
    RepositoryNotFoundError,
)
from fastapi import HTTPException

TEST_DATETIME = datetime(2026, 1, 1, tzinfo=timezone.utc)


def make_repository(
    *,
    repository_id: int = 1,
    organization_id: int = 10,
) -> Repository:
    """Create a repository model for testing."""

    return Repository(
        id=repository_id,
        organization_id=organization_id,
        github_id=123456789,
        name="example",
        full_name="owner/example",
        description="Example repository",
        visibility=RepositoryVisibility.PUBLIC,
        default_branch="main",
        primary_language="Python",
        clone_url="https://github.com/owner/example.git",
        html_url="https://github.com/owner/example",
        created_at=TEST_DATETIME,
        updated_at=TEST_DATETIME,
    )


def make_member() -> MagicMock:
    """Create a mock organization member."""

    return MagicMock()


def make_db() -> MagicMock:
    """Create a mock database session."""
    db = MagicMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


def make_github_client() -> MagicMock:
    """
    Create a mocked GitHub client.

    Endpoint tests do not exercise GitHub communication directly.
    The client is supplied only because it is part of the endpoint's
    dependency contract.
    """

    return MagicMock(spec=GitHubClient)


def make_import_payload() -> RepositoryImportRequest:
    """Create a repository import payload."""

    return RepositoryImportRequest(
        owner="owner",
        name="example",
        default_branch=None,
    )


def make_update_payload() -> RepositoryUpdateRequest:
    """Create a repository update payload."""

    return RepositoryUpdateRequest(
        default_branch="develop",
    )


def make_service() -> MagicMock:
    """Create a mocked repository service."""

    return MagicMock()


def patch_repository_service(
    service: MagicMock,
):
    """Patch repository service creation."""

    return patch(
        "app.api.v1.repositories._create_repository_service",
        return_value=service,
    )


@pytest.mark.asyncio
async def test_import_repository_returns_created_repository() -> None:
    repository = make_repository()

    service = make_service()
    service.import_repository = AsyncMock(
        return_value=repository,
    )

    payload = make_import_payload()
    db = make_db()
    github_client = make_github_client()

    with patch_repository_service(service):
        result = await import_repository(
            organization_id=10,
            payload=payload,
            member=make_member(),
            github_access_token="github-token",
            github_client=github_client,
            db=db,
        )

    assert result is repository

    service.import_repository.assert_awaited_once_with(
        organization_id=10,
        payload=payload,
    )

    db.commit.assert_called_once_with()


@pytest.mark.asyncio
async def test_import_repository_maps_duplicate_to_409() -> None:
    service = make_service()
    service.import_repository = AsyncMock(
        side_effect=RepositoryAlreadyExistsError(
            "Repository already exists.",
        ),
    )

    db = make_db()

    with (
        patch_repository_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await import_repository(
            organization_id=10,
            payload=make_import_payload(),
            member=make_member(),
            github_access_token="github-token",
            github_client=make_github_client(),
            db=db,
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Repository already exists."

    db.rollback.assert_called_once_with()


@pytest.mark.asyncio
async def test_import_repository_maps_github_not_found_to_404() -> None:
    service = make_service()
    service.import_repository = AsyncMock(
        side_effect=GitHubRepositoryNotFoundError(
            "GitHub repository was not found.",
        ),
    )

    db = make_db()

    with (
        patch_repository_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await import_repository(
            organization_id=10,
            payload=make_import_payload(),
            member=make_member(),
            github_access_token="github-token",
            github_client=make_github_client(),
            db=db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "GitHub repository was not found."

    db.rollback.assert_called_once_with()


@pytest.mark.asyncio
async def test_import_repository_maps_github_access_error_to_403() -> None:
    service = make_service()
    service.import_repository = AsyncMock(
        side_effect=GitHubRepositoryAccessError(
            "GitHub authorization is invalid.",
        ),
    )

    db = make_db()

    with (
        patch_repository_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await import_repository(
            organization_id=10,
            payload=make_import_payload(),
            member=make_member(),
            github_access_token="github-token",
            github_client=make_github_client(),
            db=db,
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "GitHub authorization is invalid."

    db.rollback.assert_called_once_with()


@pytest.mark.asyncio
async def test_import_repository_maps_invalid_branch_to_422() -> None:
    service = make_service()
    service.import_repository = AsyncMock(
        side_effect=InvalidRepositoryBranchError(
            "Branch does not exist.",
        ),
    )

    db = make_db()

    with (
        patch_repository_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await import_repository(
            organization_id=10,
            payload=make_import_payload(),
            member=make_member(),
            github_access_token="github-token",
            github_client=make_github_client(),
            db=db,
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Branch does not exist."

    db.rollback.assert_called_once_with()


@pytest.mark.asyncio
async def test_list_repositories_returns_paginated_response() -> None:
    repositories = [
        make_repository(repository_id=1),
        make_repository(repository_id=2),
    ]

    service = make_service()
    service.list_repositories = AsyncMock(
        return_value=(repositories, 45),
    )

    with patch_repository_service(service):
        result = await list_repositories(
            organization_id=10,
            member=make_member(),
            github_client=make_github_client(),
            page=2,
            per_page=20,
            db=make_db(),
        )

    assert len(result.items) == len(repositories)

    for actual, expected in zip(
        result.items,
        repositories,
        strict=True,
    ):
        assert actual.id == expected.id
        assert actual.organization_id == expected.organization_id
        assert actual.github_id == expected.github_id
        assert actual.name == expected.name
        assert actual.full_name == expected.full_name
        assert actual.description == expected.description
        assert actual.visibility == expected.visibility
        assert actual.default_branch == expected.default_branch
        assert actual.primary_language == expected.primary_language
        assert actual.clone_url == expected.clone_url
        assert actual.html_url == expected.html_url
        assert actual.created_at == expected.created_at
        assert actual.updated_at == expected.updated_at

    assert result.total == 45
    assert result.page == 2
    assert result.per_page == 20
    assert result.pages == 3

    service.list_repositories.assert_awaited_once_with(
        organization_id=10,
        page=2,
        per_page=20,
    )


@pytest.mark.asyncio
async def test_list_repositories_returns_zero_pages_for_empty_result() -> None:
    service = make_service()
    service.list_repositories = AsyncMock(
        return_value=([], 0),
    )

    with patch_repository_service(service):
        result = await list_repositories(
            organization_id=10,
            member=make_member(),
            github_client=make_github_client(),
            page=1,
            per_page=20,
            db=make_db(),
        )

    assert result.items == []
    assert result.total == 0
    assert result.page == 1
    assert result.per_page == 20
    assert result.pages == 0

    service.list_repositories.assert_awaited_once_with(
        organization_id=10,
        page=1,
        per_page=20,
    )


@pytest.mark.asyncio
async def test_get_repository_returns_repository() -> None:
    repository = make_repository()

    service = make_service()
    service.get_repository = AsyncMock(
        return_value=repository,
    )

    with patch_repository_service(service):
        result = await get_repository(
            organization_id=10,
            repository_id=1,
            member=make_member(),
            github_client=make_github_client(),
            db=make_db(),
        )

    assert result is repository

    service.get_repository.assert_awaited_once_with(
        organization_id=10,
        repository_id=1,
    )


@pytest.mark.asyncio
async def test_get_repository_maps_not_found_to_404() -> None:
    service = make_service()
    service.get_repository = AsyncMock(
        side_effect=RepositoryNotFoundError(),
    )

    with (
        patch_repository_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_repository(
            organization_id=10,
            repository_id=999,
            member=make_member(),
            github_client=make_github_client(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."


@pytest.mark.asyncio
async def test_update_repository_returns_updated_repository() -> None:
    repository = make_repository()
    payload = make_update_payload()

    service = make_service()
    service.update_repository = AsyncMock(
        return_value=repository,
    )

    db = make_db()

    with patch_repository_service(service):
        result = await update_repository(
            organization_id=10,
            repository_id=1,
            payload=payload,
            member=make_member(),
            github_access_token="github-token",
            github_client=make_github_client(),
            db=db,
        )

    assert result is repository

    service.update_repository.assert_awaited_once_with(
        organization_id=10,
        repository_id=1,
        payload=payload,
    )

    db.commit.assert_called_once_with()


@pytest.mark.asyncio
async def test_update_repository_maps_not_found_to_404() -> None:
    service = make_service()
    service.update_repository = AsyncMock(
        side_effect=RepositoryNotFoundError(),
    )

    db = make_db()

    with (
        patch_repository_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await update_repository(
            organization_id=10,
            repository_id=1,
            payload=make_update_payload(),
            member=make_member(),
            github_access_token="github-token",
            github_client=make_github_client(),
            db=db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."

    db.rollback.assert_called_once_with()


@pytest.mark.asyncio
async def test_update_repository_maps_invalid_branch_to_422() -> None:
    service = make_service()
    service.update_repository = AsyncMock(
        side_effect=InvalidRepositoryBranchError(
            "Branch does not exist.",
        ),
    )

    db = make_db()

    with (
        patch_repository_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await update_repository(
            organization_id=10,
            repository_id=1,
            payload=make_update_payload(),
            member=make_member(),
            github_access_token="github-token",
            github_client=make_github_client(),
            db=db,
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Branch does not exist."

    db.rollback.assert_called_once_with()


@pytest.mark.asyncio
async def test_update_repository_maps_github_access_error_to_403() -> None:
    service = make_service()
    service.update_repository = AsyncMock(
        side_effect=GitHubRepositoryAccessError(
            "GitHub authorization is invalid.",
        ),
    )

    db = make_db()

    with (
        patch_repository_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await update_repository(
            organization_id=10,
            repository_id=1,
            payload=make_update_payload(),
            member=make_member(),
            github_access_token="github-token",
            github_client=make_github_client(),
            db=db,
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "GitHub authorization is invalid."

    db.rollback.assert_called_once_with()


@pytest.mark.asyncio
async def test_delete_repository_returns_204_response() -> None:
    service = make_service()
    service.delete_repository = AsyncMock()

    db = make_db()

    with patch_repository_service(service):
        result = await delete_repository(
            organization_id=10,
            repository_id=1,
            member=make_member(),
            github_client=make_github_client(),
            db=db,
        )

    assert result.status_code == 204

    service.delete_repository.assert_awaited_once_with(
        organization_id=10,
        repository_id=1,
    )

    db.commit.assert_called_once_with()


@pytest.mark.asyncio
async def test_delete_repository_maps_not_found_to_404() -> None:
    service = make_service()
    service.delete_repository = AsyncMock(
        side_effect=RepositoryNotFoundError(),
    )

    db = make_db()

    with (
        patch_repository_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await delete_repository(
            organization_id=10,
            repository_id=1,
            member=make_member(),
            github_client=make_github_client(),
            db=db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."

    db.rollback.assert_called_once_with()