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

from app.services.jwt_service import (
    JWTService,
)

from app.models.user import User

from app.repositories.user_repository import (
    UserRepository,
)

from app.repositories.session_repository import (
    SessionRepository,
)


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

            return await (
                user_repository.update(
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
            )

        return await (
            user_repository.create(
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
        )

    async def create_session(
        self,
        db: AsyncSession,
        user: User,
    ) -> dict:
        """
        Create a new authenticated
        session for a user.
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

        session_repository = (
            SessionRepository(db)
        )

        await session_repository.create(
            user_id=user.id,
            refresh_token=refresh_token,
        )

        return {
            "access_token":
                access_token,
            "refresh_token":
                refresh_token,
        }

    async def refresh_access_token(
        self,
        refresh_token: str,
    ) -> str:
        """
        Generate a new access token
        from a valid refresh token.
        """

        payload = (
            JWTService.verify_token(
                refresh_token,
                token_type="refresh",
            )
        )

        return (
            JWTService.create_access_token(
                user_id=int(
                payload["sub"]
        ),
        username=payload.get(
            "username",
            "",
        ),
    )
)

    async def logout_user(
        self,
        db: AsyncSession,
        refresh_token: str,
    ) -> None:
        """
        Invalidate an active session.
        """

        session_repository = (
            SessionRepository(db)
        )

        session = (
            await session_repository
            .get_by_refresh_token(
                refresh_token
            )
        )

        if session:

            await (
                session_repository.delete(
                    session.id
                )
            )


auth_service = AuthService()