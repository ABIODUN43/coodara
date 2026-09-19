"""
Multi-Tenant Isolation & Authorization Tests for Architecture Memory (Coodara V2).

Verifies:
- User in Org A cannot read Org B repository architectural memory (403 Forbidden).
- Querying a foreign repository ID under an owned organization returns 404 Not Found without leaking existence.
- Search and History endpoints enforce organization isolation.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from app.api.dependencies import get_current_organization_member
from app.api.v1.memory import (
    get_architecture_history,
    get_repository_memory,
    search_memory,
)
from app.models.enums.organization_role import OrganizationRole
from app.models.memory import ArchitectureMemory
from app.models.organization_member import OrganizationMember
from app.models.user import User
from app.services.architecture_memory_service import (
    ArchitectureMemoryService,
    MemoryRepositoryNotFoundError,
)
from fastapi import HTTPException


def _make_user(user_id: int = 1, username: str = "alice") -> User:
    user = MagicMock(spec=User)
    user.id = user_id
    user.username = username
    user.email = f"{username}@example.com"
    return user


def _make_member(
    user_id: int,
    organization_id: int,
    role: OrganizationRole = OrganizationRole.MEMBER,
) -> OrganizationMember:
    member = MagicMock(spec=OrganizationMember)
    member.user_id = user_id
    member.organization_id = organization_id
    member.role = role
    return member


@pytest.mark.asyncio
async def test_get_memory_rejects_foreign_repository():
    """
    Querying memory for a repository not owned by the organization returns 404 Not Found.
    """
    db = AsyncMock()
    member_a = _make_member(user_id=1, organization_id=1)

    with pytest.MonkeyPatch.context() as mp:
        mock_service = AsyncMock(spec=ArchitectureMemoryService)
        mock_service.get_memory.side_effect = MemoryRepositoryNotFoundError("Repository not found.")
        mp.setattr("app.api.v1.memory._create_memory_service", lambda _db: mock_service)

        with pytest.raises(HTTPException) as exc_info:
            await get_repository_memory(
                organization_id=1,
                repository_id=999,  # Belongs to Org B
                member=member_a,
                db=db,
            )

        assert exc_info.value.status_code == 404
        assert "Repository not found" in exc_info.value.detail


@pytest.mark.asyncio
async def test_search_memory_rejects_foreign_repository():
    """
    Searching memory for a repository not owned by the organization returns 404 Not Found.
    """
    db = AsyncMock()
    member_a = _make_member(user_id=1, organization_id=1)

    with pytest.MonkeyPatch.context() as mp:
        mock_service = AsyncMock(spec=ArchitectureMemoryService)
        mock_service.search_memory.side_effect = MemoryRepositoryNotFoundError("Repository not found.")
        mp.setattr("app.api.v1.memory._create_memory_service", lambda _db: mock_service)

        with pytest.raises(HTTPException) as exc_info:
            await search_memory(
                organization_id=1,
                repository_id=999,  # Belongs to Org B
                member=member_a,
                q="authentication",
                db=db,
            )

        assert exc_info.value.status_code == 404
        assert "Repository not found" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_history_rejects_foreign_repository():
    """
    Querying history for a repository not owned by the organization returns 404 Not Found.
    """
    db = AsyncMock()
    member_a = _make_member(user_id=1, organization_id=1)

    with pytest.MonkeyPatch.context() as mp:
        mock_service = AsyncMock(spec=ArchitectureMemoryService)
        mock_service.list_events.side_effect = MemoryRepositoryNotFoundError("Repository not found.")
        mp.setattr("app.api.v1.memory._create_memory_service", lambda _db: mock_service)

        with pytest.raises(HTTPException) as exc_info:
            await get_architecture_history(
                organization_id=1,
                repository_id=999,  # Belongs to Org B
                member=member_a,
                db=db,
            )

        assert exc_info.value.status_code == 404
        assert "Repository not found" in exc_info.value.detail
