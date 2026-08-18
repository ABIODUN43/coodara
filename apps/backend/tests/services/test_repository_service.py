"""
Tests for repository application service.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from app.models.repository import Repository, RepositoryVisibility
from app.schemas.repository import (
    RepositoryImportRequest,
    RepositoryUpdateRequest,
)
from app.services.github_service import (
    GitHubAuthenticationError,
    GitHubNotFoundError,
)
from app.services.repository_service import (
    GitHubRepositoryAccessError,
    GitHubRepositoryNotFoundError,
    RepositoryNotFoundError,
    RepositoryService,
    RepositoryServiceError,
)


def make_service(
    *,
    github_access_token: str | None = "github-token",
) -> RepositoryService:
    db = MagicMock()
    github_client = MagicMock()

    return RepositoryService(
        db=db,
        github_client=github_client,
        github_access_token=github_access_token,
    )


def make_repository(
    *,
    repository_id: int = 1,
    organization_id: int = 10,
    github_id: int = 123456789,
    full_name: str = "owner/example",
) -> Repository:
    return Repository(
        id=repository_id,
        organization_id=organization_id,
        github_id=github_id,
        name="example",
        full_name=full_name,
        description="Example repository",
        visibility=RepositoryVisibility.PUBLIC,
        default_branch="main",
        primary_language="Python",
        clone_url="https://github.com/owner/example.git",
        html_url="https://github.com/owner/example",
    )


def make_import_payload(
    *,
    owner: str = "owner",
    name: str = "example",
    default_branch: str | None = None,
) -> RepositoryImportRequest:
    return RepositoryImportRequest(
        owner=owner,
        name=name,
        default_branch=default_branch,
    )


def make_update_payload(
    *,
    default_branch: str | None = "develop",
) -> RepositoryUpdateRequest:
    return RepositoryUpdateRequest(
        default_branch=default_branch,
    )


@pytest.mark.asyncio
async def test_require_github_access_token_rejects_missing_token() -> None:
    service = make_service(github_access_token=None)

    with pytest.raises(GitHubRepositoryAccessError):
        service._require_github_access_token()


@pytest.mark.asyncio
async def test_require_github_access_token_returns_token() -> None:
    service = make_service(github_access_token="secret-token")

    assert service._require_github_access_token() == "secret-token"


@pytest.mark.asyncio
async def test_get_github_repository_success() -> None:
    service = make_service()

    response = {
        "id": 123,
        "name": "example",
        "full_name": "owner/example",
    }

    service.github_client.get_repository = AsyncMock(
        return_value=response,
    )

    result = await service._get_github_repository(
        owner="owner",
        repository_name="example",
    )

    assert result == response

    service.github_client.get_repository.assert_awaited_once_with(
        access_token="github-token",
        owner="owner",
        repository="example",
    )


@pytest.mark.asyncio
async def test_get_github_repository_translates_not_found() -> None:
    service = make_service()

    service.github_client.get_repository = AsyncMock(
        side_effect=GitHubNotFoundError(),
    )

    with pytest.raises(GitHubRepositoryNotFoundError):
        await service._get_github_repository(
            owner="owner",
            repository_name="missing",
        )


@pytest.mark.asyncio
async def test_get_github_repository_translates_authentication_error() -> None:
    service = make_service()

    service.github_client.get_repository = AsyncMock(
        side_effect=GitHubAuthenticationError(),
    )

    with pytest.raises(GitHubRepositoryAccessError):
        await service._get_github_repository(
            owner="owner",
            repository_name="example",
        )


@pytest.mark.asyncio
async def test_get_github_repository_rejects_missing_token() -> None:
    service = make_service(github_access_token=None)

    with pytest.raises(GitHubRepositoryAccessError):
        await service._get_github_repository(
            owner="owner",
            repository_name="example",
        )


@pytest.mark.asyncio
async def test_get_github_repository_rejects_invalid_response() -> None:
    service = make_service()

    service.github_client.get_repository = AsyncMock(
        return_value=["invalid"],
    )

    with pytest.raises(RepositoryServiceError):
        await service._get_github_repository(
            owner="owner",
            repository_name="example",
        )


@pytest.mark.asyncio
async def test_get_repository_returns_organization_scoped_repository() -> None:
    service = make_service()

    repository = make_repository()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=repository,
    )

    result = await service.get_repository(
        organization_id=10,
        repository_id=1,
    )

    assert result is repository

    service.repository_repository.get_by_organization_and_id.assert_awaited_once_with(
        organization_id=10,
        repository_id=1,
    )


@pytest.mark.asyncio
async def test_get_repository_raises_when_not_found() -> None:
    service = make_service()

    service.repository_repository.get_by_organization_and_id = AsyncMock(
        return_value=None,
    )

    with pytest.raises(RepositoryNotFoundError):
        await service.get_repository(
            organization_id=10,
            repository_id=999,
        )


@pytest.mark.asyncio
async def test_list_repositories_returns_items_and_total() -> None:
    service = make_service()

    repositories = [
        make_repository(repository_id=1),
        make_repository(repository_id=2),
    ]

    service.repository_repository.list_by_organization = AsyncMock(
        return_value=repositories,
    )
    service.repository_repository.count_by_organization = AsyncMock(
        return_value=2,
    )

    result, total = await service.list_repositories(
        organization_id=10,
        page=2,
        per_page=20,
    )

    assert result == repositories
    assert total == 2

    service.repository_repository.list_by_organization.assert_awaited_once_with(
        organization_id=10,
        offset=20,
        limit=20,
    )

    service.repository_repository.count_by_organization.assert_awaited_once_with(
        organization_id=10,
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
async def test_list_repositories_rejects_invalid_pagination(
    page: int,
    per_page: int,
) -> None:
    service = make_service()

    with pytest.raises(ValueError):
        await service.list_repositories(
            organization_id=10,
            page=page,
            per_page=per_page,
        )


@pytest.mark.asyncio
async def test_import_repository_success() -> None:
    service = make_service()

    github_repository = {
        "id": 123456789,
        "name": "example",
        "full_name": "owner/example",
        "description": "Example repository",
        "visibility": "public",
        "default_branch": "main",
        "language": "Python",
        "clone_url": "https://github.com/owner/example.git",
        "html_url": "https://github.com/owner/example",
    }

    service.github_client.get_repository = AsyncMock(
        return_value=github_repository,
    )

    service.repository_repository.get_by_organization_and_github_id = (
        AsyncMock(return_value=None)
    )

    service.github_client.get_branch = AsyncMock()

    service.repository_repository.create = AsyncMock(
        side_effect=lambda repository: repository,
    )

    payload = make_import_payload()

    result = await service.import_repository(
        organization_id=10,
        payload=payload,
    )

    assert result.organization_id == 10
    assert result.github_id == 123456789
    assert result.name == "example"
    assert result.full_name == "owner/example"
    assert result.default_branch == "main"

    service.repository_repository.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_import_repository_rejects_duplicate() -> None:
    service = make_service()

    github_repository = {
        "id": 123456789,
        "name": "example",
        "full_name": "owner/example",
        "visibility": "public",
        "default_branch": "main",
        "clone_url": "https://github.com/owner/example.git",
        "html_url": "https://github.com/owner/example",
    }

    service.github_client.get_repository = AsyncMock(
        return_value=github_repository,
    )

    service.repository_repository.get_by_organization_and_github_id = (
        AsyncMock(return_value=make_repository())
    )

   