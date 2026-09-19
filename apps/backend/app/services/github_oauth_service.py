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

import logging
from collections.abc import Mapping
from typing import Any
from urllib.parse import urlencode

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


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
        connect=30.0,
        read=30.0,
        write=30.0,
        pool=30.0,
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
        Exchange a GitHub authorization code for an OAuth access token.
        """

        if not code:
            raise GitHubOAuthExchangeError(
                "GitHub authorization code is required.",
            )

        logger.info(
            "Exchanging GitHub OAuth code with callback_url=%s",
            settings.GITHUB_CALLBACK_URL,
        )

        try:
            async with httpx.AsyncClient(
                timeout=self.TIMEOUT,
            ) as client:
                response = await client.post(
                    self.GITHUB_ACCESS_TOKEN_URL,
                    headers={
                        "Accept": "application/json",
                    },
                    data={
                        "client_id": settings.GITHUB_CLIENT_ID,
                        "client_secret": settings.GITHUB_CLIENT_SECRET,
                        "code": code,
                        "redirect_uri": settings.GITHUB_CALLBACK_URL,
                    },
                )

        except httpx.TimeoutException as exc:
            logger.error(
                "GitHub OAuth code exchange timed out after %s: %s",
                self.TIMEOUT,
                exc,
            )
            raise GitHubOAuthExchangeError(
                "GitHub OAuth request timed out.",
            ) from exc

        except httpx.RequestError as exc:
            logger.error(
                "Unable to connect to GitHub OAuth endpoint: %s",
                exc,
            )
            raise GitHubOAuthExchangeError(
                "Unable to connect to GitHub OAuth.",
            ) from exc

        if response.is_error:
            logger.error(
                "GitHub OAuth token exchange HTTP error: %d %s",
                response.status_code,
                response.text,
            )
            raise GitHubOAuthExchangeError(
                f"GitHub OAuth token exchange failed with status {response.status_code}.",
            )

        try:
            payload = response.json()
        except ValueError as exc:
            logger.error(
                "GitHub returned invalid JSON during token exchange: %s",
                response.text,
            )
            raise GitHubOAuthExchangeError(
                "GitHub returned an invalid OAuth response.",
            ) from exc

        if not isinstance(payload, Mapping):
            logger.error(
                "GitHub OAuth response payload is not a JSON object: %s",
                payload,
            )
            raise GitHubOAuthExchangeError(
                "GitHub returned an invalid OAuth response.",
            )

        error = payload.get("error")

        if error:
            error_description = payload.get("error_description", "")
            error_uri = payload.get("error_uri", "")
            logger.error(
                "GitHub OAuth exchange error from GitHub: %s - %s (uri: %s)",
                error,
                error_description,
                error_uri,
            )
            raise GitHubOAuthExchangeError(
                f"GitHub authorization was not completed: {error_description or error}",
            )

        access_token = payload.get("access_token")

        if not isinstance(access_token, str) or not access_token:
            logger.error(
                "GitHub did not return an access token in payload: %s",
                payload,
            )
            raise GitHubOAuthExchangeError(
                "GitHub did not return an access token.",
            )

        logger.info("Successfully exchanged GitHub OAuth authorization code for access token")
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
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/vnd.github+json",
                        "X-GitHub-Api-Version": "2022-11-28",
                        "User-Agent": "Coodara/0.1",
                    },
                )

                if response.status_code == 401:
                    logger.error("GitHub /user returned 401 Unauthorized: %s", response.text)
                    raise GitHubOAuthProfileError(
                        "GitHub authorization is invalid.",
                    )

                if response.is_error:
                    logger.error(
                        "GitHub /user returned error status %d: %s",
                        response.status_code,
                        response.text,
                    )
                    raise GitHubOAuthProfileError(
                        "Unable to retrieve GitHub user.",
                    )

                try:
                    user = response.json()
                except ValueError as exc:
                    logger.error("GitHub /user returned non-JSON response: %s", response.text)
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

                email = (
                    user.get("email") if isinstance(user.get("email"), str) else None
                )

                # If primary email is private, query the user/emails endpoint
                if not email:
                    try:
                        emails_response = await client.get(
                            "https://api.github.com/user/emails",
                            headers={
                                "Authorization": f"Bearer {access_token}",
                                "Accept": "application/vnd.github+json",
                                "X-GitHub-Api-Version": "2022-11-28",
                                "User-Agent": "Coodara/0.1",
                            },
                        )
                        if emails_response.status_code == 200:
                            emails_data = emails_response.json()
                            if isinstance(emails_data, list):
                                for item in emails_data:
                                    if (
                                        isinstance(item, dict)
                                        and item.get("primary")
                                        and item.get("email")
                                    ):
                                        email = item["email"]
                                        break
                                if not email and emails_data:
                                    first_item = emails_data[0]
                                    if isinstance(first_item, dict) and first_item.get("email"):
                                        email = first_item["email"]
                    except Exception as email_exc:  # noqa: BLE001
                        logger.warning("Could not fetch user/emails: %s", email_exc)

                logger.info(
                    "Retrieved GitHub profile: id=%d, login=%s, email=%s",
                    github_id,
                    username,
                    email,
                )

                return {
                    "github_id": github_id,
                    "username": username,
                    "email": email,
                    "avatar_url": (
                        user.get("avatar_url")
                        if isinstance(user.get("avatar_url"), str)
                        else None
                    ),
                }

        except httpx.TimeoutException as exc:
            logger.error("GitHub user request timed out: %s", exc)
            raise GitHubOAuthProfileError(
                "GitHub user request timed out.",
            ) from exc

        except httpx.RequestError as exc:
            logger.error("Unable to connect to GitHub user endpoint: %s", exc)
            raise GitHubOAuthProfileError(
                "Unable to connect to GitHub.",
            ) from exc


github_oauth_service = GitHubOAuthService()
