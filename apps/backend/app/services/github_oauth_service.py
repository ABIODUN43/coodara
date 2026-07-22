"""
GitHub OAuth service.

Responsible for:

- GitHub OAuth authorization flow
- Access token exchange
- GitHub user retrieval
- GitHub API communication

This service encapsulates all GitHub-specific
authentication logic used by Coodara.

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from urllib.parse import urlencode

import httpx

from app.core.config import settings


class GitHubOAuthService:
    """
    GitHub OAuth integration service.

    Handles:

    - Authorization URL generation
    - OAuth code exchange
    - User profile retrieval
    """

    GITHUB_AUTHORIZE_URL = (
        "https://github.com/login/oauth/authorize"
    )

    GITHUB_ACCESS_TOKEN_URL = (
        "https://github.com/login/oauth/access_token"
    )

    GITHUB_USER_URL = (
        "https://api.github.com/user"
    )

    async def get_authorization_url(
        self,
    ) -> str:
        """
        Generate GitHub OAuth URL.

        Returns:
            GitHub authorization URL.
        """

        params = {
            "client_id":
                settings.GITHUB_CLIENT_ID,
            "redirect_uri":
                settings.GITHUB_CALLBACK_URL,
            "scope":
                "read:user user:email",
        }

        return (
            f"{self.GITHUB_AUTHORIZE_URL}"
            f"?{urlencode(params)}"
        )

    async def exchange_code_for_token(
        self,
        code: str,
    ) -> str:
        """
        Exchange authorization code
        for GitHub access token.

        Args:
            code:
                GitHub OAuth code.

        Returns:
            GitHub access token.
        """

        async with httpx.AsyncClient() as client:

            response = await client.post(
                self.GITHUB_ACCESS_TOKEN_URL,
                headers={
                    "Accept":
                        "application/json",
                },
                data={
                    "client_id":
                        settings.GITHUB_CLIENT_ID,
                    "client_secret":
                        settings.GITHUB_CLIENT_SECRET,
                    "code":
                        code,
                    "redirect_uri":
                        settings.GITHUB_CALLBACK_URL,
                },
                timeout=30,
            )

            response.raise_for_status()

            payload = response.json()

            access_token = payload.get(
                "access_token"
            )

            if not access_token:
                raise ValueError(
                    "Failed to obtain GitHub access token."
                )

            return access_token

    async def get_github_user(
        self,
        access_token: str,
    ) -> dict:
        """
        Retrieve authenticated
        GitHub user profile.

        Args:
            access_token:
                GitHub access token.

        Returns:
            Normalized user payload.
        """

        async with httpx.AsyncClient() as client:

            response = await client.get(
                self.GITHUB_USER_URL,
                headers={
                    "Authorization":
                        f"Bearer {access_token}",
                    "Accept":
                        "application/json",
                },
                timeout=30,
            )

            response.raise_for_status()

            user = response.json()

            return {
                "github_id":
                    user["id"],
                "username":
                    user["login"],
                "email":
                    user.get("email"),
                "avatar_url":
                    user.get("avatar_url"),
            }


github_oauth_service = (
    GitHubOAuthService()
)