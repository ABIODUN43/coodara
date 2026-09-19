"""
Authentication application service.

Responsible for:

- GitHub authentication
- User creation/update
- Access-token generation
- Refresh-session creation
- Refresh-token rotation
- Session validation
- Logout

The service contains authentication business logic
but does not depend on FastAPI request/response objects.
"""

from __future__ import annotations

import secrets
from typing import Any

from app.models.user import User
from app.redis.session import redis_session_service
from app.repositories.user_repository import UserRepository
from app.services.jwt_service import JWTService
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession


class AuthService:
    """
    Application service for authentication.
    """

    @staticmethod
    def _generate_refresh_token() -> str:
        """
        Generate a cryptographically secure opaque refresh token.
        """

        return secrets.token_urlsafe(64)

    async def authenticate_github_user(
        self,
        db: AsyncSession,
        github_user: dict[str, Any],
    ) -> User:
        """
        Find or create a user from GitHub profile data.
        """

        repository = UserRepository(db)

        github_id = github_user.get("github_id")

        if not isinstance(github_id, int):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GitHub user identity.",
            )

        username = github_user.get("username")

        if not isinstance(username, str) or not username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GitHub username.",
            )

        email = github_user.get("email")
        avatar_url = github_user.get("avatar_url")

        if email is not None and not isinstance(email, str):
            email = None

        if avatar_url is not None and not isinstance(
            avatar_url,
            str,
        ):
            avatar_url = None

        user = await repository.get_by_github_id(
            github_id,
        )

        if user is not None:
            return await repository.update(
                user,
                username=username,
                email=email,
                avatar_url=avatar_url,
            )

        return await repository.create(
            github_id=github_id,
            username=username,
            email=email,
            avatar_url=avatar_url,
        )

    async def authenticate_demo_user(
        self,
        db: AsyncSession,
        username: str = "Abiodun43",
        email: str = "user@coodara.ai",
    ) -> User:
        """
        Authenticate or initialize a demo user for instant login.
        """
        repository = UserRepository(db)
        user = await repository.get_by_github_id(439999)
        if user is not None:
            return user
        return await repository.create(
            github_id=439999,
            username=username,
            email=email,
            avatar_url="https://avatars.githubusercontent.com/u/439999?v=4",
        )


    async def create_session(
        self,
        user: User,
    ) -> dict[str, str]:
        """
        Create an authenticated session.

        Returns:

            access_token:
                Short-lived JWT.

            refresh_token:
                Opaque random secret.

        The refresh token is stored only indirectly:
        Redis stores its SHA-256 hash as the key.
        """

        access_token = JWTService.create_access_token(
            user_id=user.id,
            username=user.username,
        )

        refresh_token = self._generate_refresh_token()

        await redis_session_service.create_session(
            user_id=user.id,
            refresh_token=refresh_token,
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    async def refresh_session(
        self,
        db: AsyncSession,
        refresh_token: str,
    ) -> dict[str, str]:
        """
        Validate and rotate an authenticated session.

        Rotation:

            old refresh token
                    ↓
                 validate
                    ↓
                 revoke
                    ↓
            generate new refresh token
                    ↓
            create new Redis session
                    ↓
            create new access token
        """

        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh session is required.",
            )

        user_id = await redis_session_service.get_user_id(
            refresh_token,
        )

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh session.",
            )

        repository = UserRepository(db)

        user = await repository.get_by_id(user_id)

        if user is None:
            await redis_session_service.revoke_session(
                refresh_token,
            )

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh session.",
            )

        # Revoke the old token before issuing another one.
        await redis_session_service.revoke_session(
            refresh_token,
        )

        access_token = JWTService.create_access_token(
            user_id=user.id,
            username=user.username,
        )

        new_refresh_token = self._generate_refresh_token()

        await redis_session_service.create_session(
            user_id=user.id,
            refresh_token=new_refresh_token,
        )

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
        }

    async def logout_user(
        self,
        refresh_token: str,
    ) -> None:
        """
        Revoke an authenticated refresh session.

        Logout is intentionally idempotent.
        """

        if not refresh_token:
            return

        await redis_session_service.revoke_session(
            refresh_token,
        )


auth_service = AuthService()
