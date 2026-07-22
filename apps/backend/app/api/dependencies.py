"""
Authentication dependencies.

Responsible for:

- JWT authentication
- Current user retrieval
- Route protection

These dependencies are used by all
authenticated API endpoints across
the Coodara platform.

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from fastapi import (
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.db.session import get_db

from app.models.user import User

from app.repositories.user_repository import (
    UserRepository,
)

from app.services.jwt_service import (
    JWTService,
)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    ),
    db: AsyncSession = Depends(
        get_db
    ),
) -> User:
    """
    Retrieve the authenticated user.

    Validates the JWT access token and
    loads the corresponding user from
    the database.

    Raises:
        HTTPException(401)
    """

    token = credentials.credentials

    try:

        payload = (
            JWTService.verify_token(
                token,
                token_type="access",
            )
        )

        user_id = int(
            payload["sub"]
        )

    except Exception:

        raise HTTPException(
            status_code=
            status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )

    repository = UserRepository(
        db
    )

    user = await repository.get_by_id(
        user_id
    )

    if not user:

        raise HTTPException(
            status_code=
            status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(
        get_current_user
    ),
) -> User:
    """
    Future extension point.

    Later we can check:

    - is_active
    - is_verified
    - organization membership
    - subscription status

    Returns:
        Authenticated user.
    """

    return current_user