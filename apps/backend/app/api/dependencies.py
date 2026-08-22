"""
Authentication and authorization dependencies.

Responsibilities:

- Authenticate the Coodara access-token cookie.
- Resolve the current user.
- Verify active-user status.
- Verify organization membership.
- Verify organization-owner permissions.
- Resolve the authenticated user's GitHub credential.

Dependencies do not own database transactions.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated

import httpx
import jwt
from app.db.session import get_db
from app.models.enums.organization_role import OrganizationRole
from app.models.organization_member import OrganizationMember
from app.models.user import User
from app.repositories.organization_member_repository import (
    OrganizationMemberRepository,
)
from app.repositories.user_repository import UserRepository
from app.services.github_credential_service import (
    GitHubCredentialError,
    github_credential_service,
)
from app.services.github_service import GitHubClient
from app.services.jwt_service import JWTService
from fastapi import Depends, HTTPException, Path, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

ACCESS_TOKEN_COOKIE = "coodara_access_token"


async def get_current_user(
    request: Request,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> User:
    """
    Resolve the authenticated Coodara user.

    Authentication requirements:

    1. Access-token cookie exists.
    2. JWT signature is valid.
    3. JWT has not expired.
    4. Token type is ``access``.
    5. JWT subject exists.
    6. Subject represents a valid user ID.
    7. User exists in the database.
    """

    token = request.cookies.get(ACCESS_TOKEN_COOKIE)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
        )

    try:
        payload = JWTService.verify_access_token(token)
        user_id = JWTService.get_user_id(payload)

    except (
        jwt.InvalidTokenError,
        ValueError,
        TypeError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        ) from exc

    user_repository = UserRepository(db)

    user = await user_repository.get_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )

    return user


async def get_current_active_user(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> User:
    """
    Resolve the authenticated active user.

    The current User model does not yet contain an explicit
    account-status field, so this currently acts as the
    extension point for future account-state checks.
    """

    return current_user


async def get_current_organization_member(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    current_user: Annotated[
        User,
        Depends(get_current_active_user),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> OrganizationMember:
    """
    Verify that the authenticated user belongs to the
    requested organization.
    """

    repository = OrganizationMemberRepository(db)

    member = await repository.get_member(
        organization_id=organization_id,
        user_id=current_user.id,
    )

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization.",
        )

    return member


async def get_current_organization_owner(
    member: Annotated[
        OrganizationMember,
        Depends(get_current_organization_member),
    ],
) -> OrganizationMember:
    """
    Require organization-owner privileges.
    """

    if member.role != OrganizationRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization owner permissions are required.",
        )

    return member


async def get_current_github_access_token(
    current_user: Annotated[
        User,
        Depends(get_current_active_user),
    ],
) -> str:
    """
    Resolve the authenticated user's GitHub OAuth access token.

    The token is decrypted only on the server and is never
    returned to the browser.
    """

    try:
        return github_credential_service.get_access_token(
            current_user,
        )

    except GitHubCredentialError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "GitHub authorization is required. "
                "Please reconnect your GitHub account."
            ),
        ) from exc

async def get_github_client() -> AsyncIterator[GitHubClient]:
    """
    Provide a GitHub API client for the current request.

    The underlying HTTP client is created for the request
    and closed after the dependency scope ends.
    """

    async with httpx.AsyncClient() as client:
        yield GitHubClient(client)

CurrentUser = Annotated[
    User,
    Depends(get_current_active_user),
]

OrganizationMemberDependency = Annotated[
    OrganizationMember,
    Depends(get_current_organization_member),
]

OrganizationOwnerDependency = Annotated[
    OrganizationMember,
    Depends(get_current_organization_owner),
]

GitHubAccessTokenDependency = Annotated[
    str,
    Depends(get_current_github_access_token),
]

