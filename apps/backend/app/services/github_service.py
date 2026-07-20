"""
GitHub OAuth service.

Responsible for:

- Generating GitHub OAuth URLs
- Exchanging authorization codes
- Retrieving GitHub user information

This service is the primary authentication
provider for the Coodara MVP.

Authentication Flow:

Frontend
    ↓
GitHub Login
    ↓
Authorization Code
    ↓
GitHub Token
    ↓
GitHub User
    ↓
Coodara User

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

import httpx

from app.core.config import settings


class GithubService:
    """
    Service for interacting with the GitHub API.

    Handles the complete OAuth lifecycle
    for user authentication.
    """

    @staticmethod
    def get_github_authorization_url() -> str:
        """
    Generate GitHub OAuth URL.

    Returns:
        Authorization URL for redirecting users.
    """
        return (
            "https://github.com/login/oauth/authorize"
            f"?client_id={settings.GITHUB_CLIENT_ID}"
            "&scope=read:user user:email"
        )

    @staticmethod
    async def exchange_code_for_token(
        code: str,
    ) -> str:
        """
    Exchange OAuth authorization code
    for a GitHub access token.

    Args:
        code:
            OAuth authorization code.

    Returns:
        GitHub access token.
    """

        async with httpx.AsyncClient() as client:

            response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={
                    "Accept": "application/json"
                },
                data={
                    "client_id":
                        settings.GITHUB_CLIENT_ID,
                    "client_secret":
                        settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                },
            )

        response.raise_for_status()

        data = response.json()

        if "access_token" not in data:
            raise Exception(
                "Failed to retrieve GitHub token."
            )

        return data["access_token"]

    @staticmethod
    async def get_github_user(
        access_token: str,
    ) -> dict:
        """
    Retrieve GitHub profile information.

    Args:
        access_token:
            GitHub OAuth token.

    Returns:
        User information dictionary.
    """

        headers = {
            "Authorization":
                f"Bearer {access_token}",
            "Accept":
                "application/json",
        }

        async with httpx.AsyncClient() as client:

            user_response = await client.get(
                "https://api.github.com/user",
                headers=headers,
            )

            email_response = await client.get(
                "https://api.github.com/user/emails",
                headers=headers,
            )

        user_response.raise_for_status()

        user = user_response.json()

        email = None

        if email_response.status_code == 200:
            emails = email_response.json()

            primary = next(
                (
                    e
                    for e in emails
                    if e["primary"]
                ),
                None,
            )

            if primary:
                email = primary["email"]

        return {
            "github_id": user["id"],
            "username": user["login"],
            "name": user.get("name"),
            "email": email,
            "avatar_url": user.get(
                "avatar_url"
            ),
        }


github_service = GithubService()