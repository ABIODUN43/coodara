"""
Authentication business logic.

Responsible for:

- User authentication
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

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.session import Session
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
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
    Authenticate or create a GitHub user.

    If the user exists:
        - Update profile data.

    If the user does not exist:
        - Create a new user.

    Returns:
        User instance.
    """

        stmt = select(User).where(
            User.github_id ==
            github_user["github_id"]
        )

        result = await db.execute(stmt)

        user = result.scalar_one_or_none()

        if user:

            user.username = github_user[
                "username"
            ]

            user.email = github_user["email"]

            user.avatar_url = github_user[
                "avatar_url"
            ]

            await db.commit()
            await db.refresh(user)

            return user

        user = User(
            github_id=github_user[
                "github_id"
            ],
            username=github_user[
                "username"
            ],
            email=github_user["email"],
            avatar_url=github_user[
                "avatar_url"
            ],
        )

        db.add(user)

        await db.commit()
        await db.refresh(user)

        return user

    async def create_session(
        self,
        db: AsyncSession,
        user: User,
    ) -> dict:
        """
    Create a new authenticated session.

    Generates:
    - Access Token
    - Refresh Token

    Persists refresh token
    in the database.

    Returns:
        Token pair.
    """

        access_token = create_access_token(
            {
                "sub": str(user.id),
                "username":
                    user.username,
            }
        )

        refresh_token = (
            create_refresh_token(
                {
                    "sub": str(user.id)
                }
            )
        )

        session = Session(
            user_id=user.id,
            refresh_token=refresh_token,
        )

        db.add(session)

        await db.commit()

        return {
            "access_token":
                access_token,
            "refresh_token":
                refresh_token,
        }

    async def refresh_access_token(
        self,
        token: str,
    ) -> str:
        """
    Generate a new access token using
    a valid refresh token.

    Returns:
        New access token.
    """

        payload = verify_token(
            token,
            token_type="refresh",
        )

        user_id = payload["sub"]

        return create_access_token(
            {
                "sub": user_id,
            }
        )

    async def logout_user(
        self,
        db: AsyncSession,
        refresh_token: str,
    ) -> None:
        """
    Invalidate an active user session.

    Removes:
    - Refresh token
    - Session record
    """

        stmt = select(Session).where(
            Session.refresh_token ==
            refresh_token
        )

        result = await db.execute(stmt)

        session = (
            result.scalar_one_or_none()
        )

        if session:
            await db.delete(session)
            await db.commit()


auth_service = AuthService()