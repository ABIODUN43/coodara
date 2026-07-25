"""
Authentication business logic.

Responsible for:

- GitHub authentication
- User creation
- Session management
- Token refresh
- Logout handling

This module orchestrates all authentication
operations for the Coodara platform.

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

from app.repositories.user_repository import (
    UserRepository,
)

from app.redis.session import (
    redis_session_service,
)

from app.services.jwt_service import (
    JWTService,
)

from fastapi import HTTPException, status

class AuthService:
    """
    Authentication service.

    Handles all authentication workflows
    and session lifecycle management.
    """

    async def authenticate_github_user(
        self,
        db: AsyncSession,
        github_user: dict,
    ) -> User:
        """
        Authenticate a GitHub user.

        Creates a new user if one does
        not already exist.

        Updates profile information
        when the user already exists.
        """

        user_repository = UserRepository(db)

        user = (
            await user_repository
            .get_by_github_id(
                github_user["github_id"]
            )
        )

        if user:

            return await user_repository.update(
                user,
                username=github_user[
                    "username"
                ],
                email=github_user[
                    "email"
                ],
                avatar_url=github_user[
                    "avatar_url"
                ],
            )

        return await user_repository.create(
            github_id=github_user[
                "github_id"
            ],
            username=github_user[
                "username"
            ],
            email=github_user[
                "email"
            ],
            avatar_url=github_user[
                "avatar_url"
            ],
        )

    async def create_session(
        self,
        user: User,
    ) -> dict:
        """
        Create a new authenticated
        session for a user.

        Generates:

        - Access Token
        - Refresh Token

        Stores refresh token
        in Redis.
        """

        access_token = (
            JWTService.create_access_token(
                user_id=user.id,
                username=user.username,
            )
        )

        refresh_token = (
            JWTService.create_refresh_token(
                user_id=user.id,
            )
        )

        await (
            redis_session_service
            .create_session(
                user_id=user.id,
                refresh_token=refresh_token,
            )
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    async def refresh_access_token(
        self,
        db: AsyncSession,
        refresh_token: str,
    ) -> str:
        """
        Generate a new access token
        from a valid refresh token.
        """
        try:
            payload = JWTService.verify_token(
                refresh_token,
                token_type="refresh",
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token."
            )

        exists = await redis_session_service.validate_session(
            refresh_token
        )
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired.",
            )
        user_id = int(
            payload["sub"]
        )

        user_repository = (
            UserRepository(db)
        )

        user = await (
            user_repository.get_by_id(
                user_id
            )
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found.",
            )

        return (
            JWTService.create_access_token(
                user_id=user.id,
                username=user.username,
            )
        )

    async def logout_user(
        self,
        refresh_token: str,
    ) -> None:
        """
        Invalidate an active session.
        """

        await (
            redis_session_service
            .revoke_session(
                refresh_token
            )
        )


auth_service = AuthService()