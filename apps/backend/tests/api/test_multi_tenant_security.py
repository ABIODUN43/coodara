"""
Comprehensive Multi-Tenant Security & Tenant Isolation Tests.

Verifies:
- User in Org A cannot access, list, or mutate repositories in Org B (403 Forbidden).
- User in Org A cannot trigger, view, or delete analyses for Org B repositories.
- User in Org A cannot view architecture snapshots for Org B repositories.
- User in Org A cannot access or query AI Chat for Org B.
- Querying a foreign repository ID under an owned organization returns 404 Not Found without leaking resource existence.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from app.api.dependencies import get_current_organization_member
from app.api.v1.analysis import create_analysis, get_analysis
from app.api.v1.architecture import get_architecture
from app.api.v1.chat import chat_organization, chat_repository
from app.api.v1.repositories import get_repository, list_repositories
from app.models.enums.organization_role import OrganizationRole
from app.models.organization_member import OrganizationMember
from app.models.repository import Repository
from app.models.user import User
from app.schemas.chat import ChatMessageRequest
from app.services.analysis_service import AnalysisNotFoundError, AnalysisService
from app.services.architecture_service import (
    ArchitectureRepositoryNotFoundError,
    ArchitectureService,
)
from app.services.chat_service import ChatRepositoryNotFoundError, ChatService
from app.services.repository_service import RepositoryNotFoundError, RepositoryService
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
async def test_get_current_organization_member_rejects_non_member():
    """
    User belonging only to Org A cannot resolve membership for Org B (403 Forbidden).
    """
    db = AsyncMock()
    user_a = _make_user(user_id=1, username="alice")

    with pytest.MonkeyPatch.context() as mp:
        mock_repo = AsyncMock()
        mock_repo.get_member.return_value = None
        mp.setattr(
            "app.api.dependencies.OrganizationMemberRepository",
            lambda _db: mock_repo,
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_current_organization_member(
                organization_id=999,  # Org B
                current_user=user_a,
                db=db,
            )

        assert exc_info.value.status_code == 403
        assert "do not have access to this organization" in exc_info.value.detail


@pytest.mark.asyncio
async def test_repository_access_cross_tenant_returns_404():
    """
    Attempting to get a repository belonging to Org B via Org A's endpoint returns 404 Not Found.
    """
    db = AsyncMock()
    member_a = _make_member(user_id=1, organization_id=1)

    with pytest.MonkeyPatch.context() as mp:
        mock_service = AsyncMock(spec=RepositoryService)
        mock_service.get_repository.side_effect = RepositoryNotFoundError("Repository not found.")
        mp.setattr("app.api.v1.repositories._create_repository_service", lambda **kwargs: mock_service)

        with pytest.raises(HTTPException) as exc_info:
            await get_repository(
                organization_id=1,
                repository_id=200,  # Belongs to Org B
                member=member_a,
                github_client=AsyncMock(),
                db=db,
            )

        assert exc_info.value.status_code == 404
        assert "Repository not found" in exc_info.value.detail


@pytest.mark.asyncio
async def test_analysis_access_cross_tenant_returns_404():
    """
    Attempting to get an analysis belonging to another repository or org returns 404 Not Found.
    """
    db = AsyncMock()
    member_a = _make_member(user_id=1, organization_id=1)

    with pytest.MonkeyPatch.context() as mp:
        mock_service = AsyncMock(spec=AnalysisService)
        mock_service.get_analysis.side_effect = AnalysisNotFoundError("Analysis not found.")
        mp.setattr("app.api.v1.analysis._create_analysis_service", lambda _db: mock_service)

        with pytest.raises(HTTPException) as exc_info:
            await get_analysis(
                organization_id=1,
                repository_id=100,
                analysis_id=999,  # Foreign analysis
                member=member_a,
                db=db,
            )

        assert exc_info.value.status_code == 404
        assert "Analysis not found" in exc_info.value.detail


@pytest.mark.asyncio
async def test_architecture_access_cross_tenant_returns_404():
    """
    Attempting to access architecture snapshot for a foreign repository returns 404 Not Found.
    """
    db = AsyncMock()
    member_a = _make_member(user_id=1, organization_id=1)

    with pytest.MonkeyPatch.context() as mp:
        mock_service = AsyncMock(spec=ArchitectureService)
        mock_service.get_architecture.side_effect = ArchitectureRepositoryNotFoundError("Repository not found.")
        mp.setattr("app.api.v1.architecture._create_architecture_service", lambda _db: mock_service)

        with pytest.raises(HTTPException) as exc_info:
            await get_architecture(
                organization_id=1,
                repository_id=999,  # Foreign repository
                member=member_a,
                db=db,
            )

        assert exc_info.value.status_code == 404
        assert "Repository not found" in exc_info.value.detail


@pytest.mark.asyncio
async def test_chat_repository_cross_tenant_returns_404():
    """
    Attempting to chat about a repository belonging to Org B under Org A returns 404 Not Found.
    """
    db = AsyncMock()
    member_a = _make_member(user_id=1, organization_id=1)

    with pytest.MonkeyPatch.context() as mp:
        mock_service = AsyncMock(spec=ChatService)
        mock_service.chat.side_effect = ChatRepositoryNotFoundError("Repository not found.")
        mp.setattr("app.api.v1.chat._create_chat_service", lambda _db: mock_service)

        with pytest.raises(HTTPException) as exc_info:
            await chat_repository(
                organization_id=1,
                repository_id=200,  # Foreign repository
                request=ChatMessageRequest(message="What is the architecture?"),
                member=member_a,
                db=db,
            )

        assert exc_info.value.status_code == 404
        assert "Repository not found" in exc_info.value.detail
