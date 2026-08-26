"""
GitHub OAuth service.

Responsible for:

- GitHub OAuth authorization URL generation.
- Authorization-code exchange.
- Retrieval of the authenticated GitHub user.

This service does not manage Coodara sessions.
It does not manage Coodara JWTs.
It does not manage repository persistence.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any
from urllib.parse import urlencode

import httpx
from app.core.config import settings


class GitHubOAuthError(Exception):
    """Base exception for GitHub OAuth failures."""


class GitHubOAuthExchangeError(GitHubOAuthError):
    """GitHub authorization-code exchange failed."""


class GitHubOAuthProfileError(GitHubOAuthError):
    """GitHub authenticated-user response was invalid."""


class GitHubOAuthService:
    """
    GitHub OAuth integration service.
    """

    GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"

    GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"

    GITHUB_USER_URL = "https://api.github.com/user"

    TIMEOUT = httpx.Timeout(
        connect=5.0,
        read=15.0,
        write=15.0,
        pool=5.0,
    )

    async def get_authorization_url(
        self,
        *,
        state: str,
    ) -> str:
        """
        Generate the GitHub OAuth authorization URL.
        """

        if not state:
            raise GitHubOAuthError(
                "OAuth state cannot be empty.",
            )

        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_CALLBACK_URL,
            "scope": "repo read:user user:email",
            "state": state,
        }

        return f"{self.GITHUB_AUTHORIZE_URL}?{urlencode(params)}"

    async def exchange_code_for_token(
        self,
        code: str,
    ) -> str:
        """
        Exchange a GitHub authorization code for an
        OAuth access token.
        """

        if not code:
            raise GitHubOAuthExchangeError(
                "GitHub authorization code is required.",
            )

        try:
            async with httpx.AsyncClient(
                timeout=self.TIMEOUT,
            ) as client:
                response = await client.post(
                    self.GITHUB_ACCESS_TOKEN_URL,
                    headers={
                        "Accept": ("application/vnd.github+json"),
                    },
                    data={
                        "client_id": settings.GITHUB_CLIENT_ID,
                        "client_secret": (settings.GITHUB_CLIENT_SECRET),
                        "code": code,
                        "redirect_uri": (settings.GITHUB_CALLBACK_URL),
                    },
                )

        except httpx.TimeoutException as exc:
            raise GitHubOAuthExchangeError(
                "GitHub OAuth request timed out.",
            ) from exc

        except httpx.RequestError as exc:
            raise GitHubOAuthExchangeError(
                "Unable to connect to GitHub OAuth.",
            ) from exc

        if response.is_error:
            raise GitHubOAuthExchangeError(
                "GitHub OAuth token exchange failed.",
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise GitHubOAuthExchangeError(
                "GitHub returned an invalid OAuth response.",
            ) from exc

        if not isinstance(payload, Mapping):
            raise GitHubOAuthExchangeError(
                "GitHub returned an invalid OAuth response.",
            )

        error = payload.get("error")

        if error:
            raise GitHubOAuthExchangeError(
                "GitHub authorization was not completed.",
            )

        access_token = payload.get("access_token")

        if not isinstance(access_token, str):
            raise GitHubOAuthExchangeError(
                "GitHub did not return an access token.",
            )

        return access_token

    async def get_github_user(
        self,
        access_token: str,
    ) -> dict[str, Any]:
        """
        Retrieve the authenticated GitHub user.
        """

        if not access_token:
            raise GitHubOAuthProfileError(
                "GitHub access token is required.",
            )

        try:
            async with httpx.AsyncClient(
                timeout=self.TIMEOUT,
            ) as client:
                response = await client.get(
                    self.GITHUB_USER_URL,
                    headers={
                        "Authorization": (f"Bearer {access_token}"),
                        "Accept": ("application/vnd.github+json"),
                        "X-GitHub-Api-Version": ("2022-11-28"),
                        "User-Agent": "Coodara/0.1",
                    },
                )

        except httpx.TimeoutException as exc:
            raise GitHubOAuthProfileError(
                "GitHub user request timed out.",
            ) from exc

        except httpx.RequestError as exc:
            raise GitHubOAuthProfileError(
                "Unable to connect to GitHub.",
            ) from exc

        if response.status_code == 401:
            raise GitHubOAuthProfileError(
                "GitHub authorization is invalid.",
            )

        if response.is_error:
            raise GitHubOAuthProfileError(
                "Unable to retrieve GitHub user.",
            )

        try:
            user = response.json()
        except ValueError as exc:
            raise GitHubOAuthProfileError(
                "GitHub returned invalid user data.",
            ) from exc

        if not isinstance(user, Mapping):
            raise GitHubOAuthProfileError(
                "GitHub returned invalid user data.",
            )

        github_id = user.get("id")
        username = user.get("login")

        if not isinstance(github_id, int):
            raise GitHubOAuthProfileError(
                "GitHub user ID is invalid.",
            )

        if not isinstance(username, str) or not username:
            raise GitHubOAuthProfileError(
                "GitHub username is invalid.",
            )

        return {
            "github_id": github_id,
            "username": username,
            "email": (
                user.get("email") if isinstance(user.get("email"), str) else None
            ),
            "avatar_url": (
                user.get("avatar_url")
                if isinstance(user.get("avatar_url"), str)
                else None
            ),
        }


github_oauth_service = GitHubOAuthService()
