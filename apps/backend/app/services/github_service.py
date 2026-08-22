"""
GitHub API client.

Responsible only for communicating with the GitHub REST API.

This client does not:
    - perform OAuth
    - access the database
    - contain repository business logic
    - manage Coodara transactions
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx


class GitHubAPIError(Exception):
    """Base exception for GitHub API failures."""


class GitHubAuthenticationError(GitHubAPIError):
    """GitHub access token is invalid or unauthorized."""


class GitHubNotFoundError(GitHubAPIError):
    """GitHub resource does not exist or is inaccessible."""


class GitHubRateLimitError(GitHubAPIError):
    """GitHub API rate limit has been exceeded."""


class GitHubClient:
    """
    Stateless GitHub REST API client.

    The access token is supplied per operation and is never
    stored on the client instance.
    """

    BASE_URL = "https://api.github.com"
    API_VERSION = "2022-11-28"
    USER_AGENT = "Coodara/0.1"

    DEFAULT_TIMEOUT = httpx.Timeout(
        connect=5.0,
        read=30.0,
        write=30.0,
        pool=5.0,
    )

    def __init__(
        self,
        client: httpx.AsyncClient,
    ) -> None:
        self.client = client

    @classmethod
    def _headers(
        cls,
        access_token: str,
    ) -> dict[str, str]:
        if not access_token:
            raise GitHubAuthenticationError(
                "GitHub access token is required.",
            )

        return {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {access_token}",
            "X-GitHub-Api-Version": cls.API_VERSION,
            "User-Agent": cls.USER_AGENT,
        }

    async def _request(
        self,
        method: str,
        endpoint: str,
        access_token: str,
        *,
        params: dict[str, Any] | None = None,
    ) -> Any:
        """
        Execute an authenticated GitHub request.
        """

        url = f"{self.BASE_URL}{endpoint}"

        try:
            response = await self.client.request(
                method=method,
                url=url,
                headers=self._headers(access_token),
                params=params,
            )

        except httpx.TimeoutException as exc:
            raise GitHubAPIError(
                "GitHub API request timed out.",
            ) from exc

        except httpx.RequestError as exc:
            raise GitHubAPIError(
                "Unable to connect to GitHub API.",
            ) from exc

        if response.status_code == 401:
            raise GitHubAuthenticationError(
                "GitHub access token is invalid or expired.",
            )

        if response.status_code == 403:
            remaining = response.headers.get(
                "X-RateLimit-Remaining",
            )

            if remaining == "0":
                raise GitHubRateLimitError(
                    "GitHub API rate limit exceeded.",
                )

            raise GitHubAuthenticationError(
                "GitHub access is forbidden.",
            )

        if response.status_code == 404:
            raise GitHubNotFoundError(
                "GitHub resource was not found or is not accessible.",
            )

        if response.status_code == 429:
            raise GitHubRateLimitError(
                "GitHub API rate limit exceeded.",
            )

        if response.is_error:
            message = "GitHub API request failed."

            try:
                payload = response.json()

                if isinstance(payload, dict):
                    github_message = payload.get("message")

                    if isinstance(github_message, str):
                        message = github_message

            except ValueError:
                pass

            raise GitHubAPIError(
                f"GitHub API error: {message}",
            )

        if response.status_code == 204:
            return None

        try:
            return response.json()

        except ValueError as exc:
            raise GitHubAPIError(
                "GitHub returned invalid JSON.",
            ) from exc

    async def get_authenticated_user(
        self,
        access_token: str,
    ) -> dict[str, Any]:
        response = await self._request(
            "GET",
            "/user",
            access_token,
        )

        if not isinstance(response, dict):
            raise GitHubAPIError(
                "Unexpected GitHub authenticated-user response.",
            )

        return response

    async def list_repositories(
        self,
        access_token: str,
        *,
        page: int = 1,
        per_page: int = 30,
        visibility: str | None = None,
        affiliation: str = (
            "owner,collaborator,organization_member"
        ),
        sort: str = "updated",
        direction: str = "desc",
    ) -> list[dict[str, Any]]:
        if page < 1:
            raise ValueError(
                "page must be greater than or equal to 1.",
            )

        if not 1 <= per_page <= 100:
            raise ValueError(
                "per_page must be between 1 and 100.",
            )

        params: dict[str, Any] = {
            "page": page,
            "per_page": per_page,
            "affiliation": affiliation,
            "sort": sort,
            "direction": direction,
        }

        if visibility is not None:
            params["visibility"] = visibility

        response = await self._request(
            "GET",
            "/user/repos",
            access_token,
            params=params,
        )

        if not isinstance(response, list):
            raise GitHubAPIError(
                "Unexpected GitHub repository response.",
            )

        return response

    async def get_repository(
        self,
        access_token: str,
        owner: str,
        repository: str,
    ) -> dict[str, Any]:
        self._validate_repository_identifier(
            owner,
            "owner",
        )

        self._validate_repository_identifier(
            repository,
            "repository",
        )

        response = await self._request(
            "GET",
            f"/repos/{owner}/{repository}",
            access_token,
        )

        if not isinstance(response, dict):
            raise GitHubAPIError(
                "Unexpected GitHub repository response.",
            )

        return response

    async def get_branch(
        self,
        access_token: str,
        owner: str,
        repository: str,
        branch: str,
    ) -> dict[str, Any]:
        self._validate_repository_identifier(
            owner,
            "owner",
        )

        self._validate_repository_identifier(
            repository,
            "repository",
        )

        branch = branch.strip()

        if not branch:
            raise ValueError(
                "branch cannot be empty.",
            )

        if len(branch) > 255:
            raise ValueError(
                "branch is too long.",
            )

        branch_path = quote(
            branch,
            safe="",
        )

        response = await self._request(
            "GET",
            f"/repos/{owner}/{repository}/branches/{branch_path}",
            access_token,
        )

        if not isinstance(response, dict):
            raise GitHubAPIError(
                "Unexpected GitHub branch response.",
            )

        return response

    async def list_branches(
        self,
        access_token: str,
        owner: str,
        repository: str,
        *,
        page: int = 1,
        per_page: int = 100,
    ) -> list[dict[str, Any]]:
        self._validate_repository_identifier(
            owner,
            "owner",
        )

        self._validate_repository_identifier(
            repository,
            "repository",
        )

        if page < 1:
            raise ValueError(
                "page must be greater than or equal to 1.",
            )

        if not 1 <= per_page <= 100:
            raise ValueError(
                "per_page must be between 1 and 100.",
            )

        response = await self._request(
            "GET",
            f"/repos/{owner}/{repository}/branches",
            access_token,
            params={
                "page": page,
                "per_page": per_page,
            },
        )

        if not isinstance(response, list):
            raise GitHubAPIError(
                "Unexpected GitHub branches response.",
            )

        return response

    async def list_commits(
        self,
        access_token: str,
        owner: str,
        repository: str,
        *,
        branch: str | None = None,
        page: int = 1,
        per_page: int = 30,
    ) -> list[dict[str, Any]]:
        self._validate_repository_identifier(
            owner,
            "owner",
        )

        self._validate_repository_identifier(
            repository,
            "repository",
        )

        if page < 1:
            raise ValueError(
                "page must be greater than or equal to 1.",
            )

        if not 1 <= per_page <= 100:
            raise ValueError(
                "per_page must be between 1 and 100.",
            )

        params: dict[str, Any] = {
            "page": page,
            "per_page": per_page,
        }

        if branch is not None:
            branch = branch.strip()

            if not branch:
                raise ValueError(
                    "branch cannot be empty.",
                )

            params["sha"] = branch

        response = await self._request(
            "GET",
            f"/repos/{owner}/{repository}/commits",
            access_token,
            params=params,
        )

        if not isinstance(response, list):
            raise GitHubAPIError(
                "Unexpected GitHub commits response.",
            )

        return response

    async def repository_is_accessible(
        self,
        access_token: str,
        owner: str,
        repository: str,
    ) -> bool:
        try:
            await self.get_repository(
                access_token,
                owner,
                repository,
            )

        except GitHubNotFoundError:
            return False

        return True

    @staticmethod
    def _validate_repository_identifier(
        value: str,
        field_name: str,
    ) -> None:
        value = value.strip()

        if not value:
            raise ValueError(
                f"{field_name} cannot be empty.",
            )

        if len(value) > 255:
            raise ValueError(
                f"{field_name} is too long.",
            )

        if "/" in value:
            raise ValueError(
                f"{field_name} must not contain '/'.",
            )