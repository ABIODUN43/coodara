"""
Tests for the GitHub API client.
"""

from unittest.mock import AsyncMock

import httpx
import pytest
from app.services.github_service import (
    GitHubAPIError,
    GitHubAuthenticationError,
    GitHubClient,
    GitHubNotFoundError,
    GitHubRateLimitError,
)


def make_client(
    response: httpx.Response | None = None,
) -> tuple[GitHubClient, AsyncMock]:
    mock_http_client = AsyncMock()

    if response is not None:
        mock_http_client.request.return_value = response

    return (
        GitHubClient(mock_http_client),
        mock_http_client,
    )


def test_headers_requires_access_token() -> None:
    with pytest.raises(
        GitHubAuthenticationError,
        match="access token is required",
    ):
        GitHubClient._headers("")


def test_headers_contains_required_github_headers() -> None:
    headers = GitHubClient._headers("test-token")

    assert headers["Accept"] == "application/vnd.github+json"
    assert headers["Authorization"] == "Bearer test-token"
    assert headers["X-GitHub-Api-Version"] == "2022-11-28"
    assert headers["User-Agent"] == "Coodara/0.1"


@pytest.mark.asyncio
async def test_request_success() -> None:
    response = httpx.Response(
        200,
        json={"id": 123, "login": "test-user"},
    )

    client, mock_http_client = make_client(response)

    result = await client._request(
        "GET",
        "/user",
        "token",
    )

    assert result == {
        "id": 123,
        "login": "test-user",
    }

    mock_http_client.request.assert_awaited_once()


@pytest.mark.asyncio
async def test_request_401_raises_authentication_error() -> None:
    response = httpx.Response(401)

    client, _ = make_client(response)

    with pytest.raises(
        GitHubAuthenticationError,
        match="invalid or expired",
    ):
        await client._request(
            "GET",
            "/user",
            "token",
        )


@pytest.mark.asyncio
async def test_request_403_rate_limit_raises_rate_limit_error() -> None:
    response = httpx.Response(
        403,
        headers={
            "X-RateLimit-Remaining": "0",
        },
    )

    client, _ = make_client(response)

    with pytest.raises(
        GitHubRateLimitError,
        match="rate limit exceeded",
    ):
        await client._request(
            "GET",
            "/user",
            "token",
        )


@pytest.mark.asyncio
async def test_request_403_without_rate_limit_raises_authentication_error() -> None:
    response = httpx.Response(
        403,
        headers={
            "X-RateLimit-Remaining": "10",
        },
    )

    client, _ = make_client(response)

    with pytest.raises(
        GitHubAuthenticationError,
        match="forbidden",
    ):
        await client._request(
            "GET",
            "/user",
            "token",
        )


@pytest.mark.asyncio
async def test_request_404_raises_not_found_error() -> None:
    response = httpx.Response(404)

    client, _ = make_client(response)

    with pytest.raises(
        GitHubNotFoundError,
        match="not found",
    ):
        await client._request(
            "GET",
            "/repos/test/repo",
            "token",
        )


@pytest.mark.asyncio
async def test_request_429_raises_rate_limit_error() -> None:
    response = httpx.Response(429)

    client, _ = make_client(response)

    with pytest.raises(
        GitHubRateLimitError,
        match="rate limit exceeded",
    ):
        await client._request(
            "GET",
            "/user",
            "token",
        )


@pytest.mark.asyncio
async def test_request_timeout_raises_github_api_error() -> None:
    mock_http_client = AsyncMock()

    mock_http_client.request.side_effect = httpx.ReadTimeout(
        "timeout",
    )

    client = GitHubClient(mock_http_client)

    with pytest.raises(
        GitHubAPIError,
        match="timed out",
    ):
        await client._request(
            "GET",
            "/user",
            "token",
        )


@pytest.mark.asyncio
async def test_request_connection_error_raises_github_api_error() -> None:
    mock_http_client = AsyncMock()

    mock_http_client.request.side_effect = httpx.ConnectError(
        "connection failed",
    )

    client = GitHubClient(mock_http_client)

    with pytest.raises(
        GitHubAPIError,
        match="Unable to connect",
    ):
        await client._request(
            "GET",
            "/user",
            "token",
        )


@pytest.mark.asyncio
async def test_request_204_returns_none() -> None:
    response = httpx.Response(204)

    client, _ = make_client(response)

    result = await client._request(
        "DELETE",
        "/something",
        "token",
    )

    assert result is None


@pytest.mark.asyncio
async def test_get_authenticated_user() -> None:
    response = httpx.Response(
        200,
        json={
            "id": 123,
            "login": "octocat",
        },
    )

    client, _ = make_client(response)

    result = await client.get_authenticated_user(
        "token",
    )

    assert result["id"] == 123
    assert result["login"] == "octocat"


@pytest.mark.asyncio
async def test_get_authenticated_user_rejects_non_dict_response() -> None:
    response = httpx.Response(
        200,
        json=["unexpected"],
    )

    client, _ = make_client(response)

    with pytest.raises(
        GitHubAPIError,
        match="Unexpected GitHub authenticated-user response",
    ):
        await client.get_authenticated_user(
            "token",
        )


@pytest.mark.asyncio
async def test_list_repositories() -> None:
    response = httpx.Response(
        200,
        json=[
            {
                "id": 123,
                "name": "coodara",
            },
        ],
    )

    client, mock_http_client = make_client(response)

    result = await client.list_repositories(
        "token",
        page=2,
        per_page=50,
        visibility="private",
    )

    assert result == [
        {
            "id": 123,
            "name": "coodara",
        },
    ]

    call = mock_http_client.request.await_args

    assert call.kwargs["method"] == "GET"
    assert call.kwargs["url"].endswith("/user/repos")

    assert call.kwargs["params"]["page"] == 2
    assert call.kwargs["params"]["per_page"] == 50
    assert call.kwargs["params"]["visibility"] == "private"


@pytest.mark.asyncio
async def test_list_repositories_rejects_invalid_page() -> None:
    client, _ = make_client()

    with pytest.raises(
        ValueError,
        match="page must be greater than or equal to 1",
    ):
        await client.list_repositories(
            "token",
            page=0,
        )


@pytest.mark.asyncio
async def test_list_repositories_rejects_invalid_per_page() -> None:
    client, _ = make_client()

    with pytest.raises(
        ValueError,
        match="per_page must be between 1 and 100",
    ):
        await client.list_repositories(
            "token",
            per_page=101,
        )


@pytest.mark.asyncio
async def test_get_repository() -> None:
    response = httpx.Response(
        200,
        json={
            "id": 123,
            "name": "coodara",
        },
    )

    client, mock_http_client = make_client(response)

    result = await client.get_repository(
        "token",
        "codaraai",
        "coodara",
    )

    assert result["id"] == 123

    call = mock_http_client.request.await_args

    assert call.kwargs["url"].endswith(
        "/repos/codaraai/coodara",
    )


@pytest.mark.asyncio
async def test_get_repository_rejects_slash_in_owner() -> None:
    client, _ = make_client()

    with pytest.raises(
        ValueError,
        match="owner must not contain",
    ):
        await client.get_repository(
            "token",
            "owner/really",
            "repo",
        )


@pytest.mark.asyncio
async def test_get_repository_rejects_empty_repository() -> None:
    client, _ = make_client()

    with pytest.raises(
        ValueError,
        match="repository cannot be empty",
    ):
        await client.get_repository(
            "token",
            "owner",
            "   ",
        )


@pytest.mark.asyncio
async def test_get_branch_url_encodes_branch() -> None:
    response = httpx.Response(
        200,
        json={
            "name": "feature/test",
        },
    )

    client, mock_http_client = make_client(response)

    await client.get_branch(
        "token",
        "codaraai",
        "coodara",
        "feature/test",
    )

    call = mock_http_client.request.await_args

    assert "/branches/feature%2Ftest" in call.kwargs["url"]


@pytest.mark.asyncio
async def test_get_branch_rejects_empty_branch() -> None:
    client, _ = make_client()

    with pytest.raises(
        ValueError,
        match="branch cannot be empty",
    ):
        await client.get_branch(
            "token",
            "owner",
            "repo",
            "   ",
        )


@pytest.mark.asyncio
async def test_list_branches() -> None:
    response = httpx.Response(
        200,
        json=[
            {"name": "main"},
            {"name": "develop"},
        ],
    )

    client, _ = make_client(response)

    result = await client.list_branches(
        "token",
        "owner",
        "repo",
    )

    assert result == [
        {"name": "main"},
        {"name": "develop"},
    ]


@pytest.mark.asyncio
async def test_list_commits() -> None:
    response = httpx.Response(
        200,
        json=[
            {"sha": "abc123"},
        ],
    )

    client, mock_http_client = make_client(response)

    result = await client.list_commits(
        "token",
        "owner",
        "repo",
        branch="main",
    )

    assert result == [
        {"sha": "abc123"},
    ]

    call = mock_http_client.request.await_args

    assert call.kwargs["params"]["sha"] == "main"


@pytest.mark.asyncio
async def test_repository_is_accessible_returns_true() -> None:
    response = httpx.Response(
        200,
        json={"id": 123},
    )

    client, _ = make_client(response)

    assert (
        await client.repository_is_accessible(
            "token",
            "owner",
            "repo",
        )
        is True
    )


@pytest.mark.asyncio
async def test_repository_is_accessible_returns_false_for_not_found() -> None:
    response = httpx.Response(404)

    client, _ = make_client(response)

    assert (
        await client.repository_is_accessible(
            "token",
            "owner",
            "repo",
        )
        is False
    )


def test_validate_repository_identifier_rejects_empty_value() -> None:
    with pytest.raises(
        ValueError,
        match="owner cannot be empty",
    ):
        GitHubClient._validate_repository_identifier(
            "   ",
            "owner",
        )


def test_validate_repository_identifier_rejects_long_value() -> None:
    with pytest.raises(
        ValueError,
        match="owner is too long",
    ):
        GitHubClient._validate_repository_identifier(
            "a" * 256,
            "owner",
        )


def test_validate_repository_identifier_rejects_slash() -> None:
    with pytest.raises(
        ValueError,
        match="owner must not contain",
    ):
        GitHubClient._validate_repository_identifier(
            "owner/repo",
            "owner",
        )