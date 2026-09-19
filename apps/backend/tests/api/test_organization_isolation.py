"""
Organization isolation and multi-tenant boundary tests.

Verifies:
1. User belonging to Org A and Org B importing under Org B creates resource in Org B.
2. User belonging to Org A and Org B importing under Org A creates resource in Org A.
3. User belonging only to Org A attempting to access/import into Org B receives 403 Forbidden.
4. Resource belonging to Org A requested via Org B endpoint returns 404 Not Found without leaking existence.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.api.dependencies import get_current_organization_member
from app.api.v1.analysis import get_analysis
from app.api.v1.architecture import get_architecture
from app.api.v1.repositories import get_repository, import_repository
from app.models.enums.organization_role import OrganizationRole
from app.models.organization_member import OrganizationMember
from app.models.repository import Repository
from app.models.user import User
from app.schemas.repository import RepositoryImportRequest
from app.services.analysis_service import AnalysisService
from app.services.architecture_service import (
    ArchitectureRepositoryNotFoundError,
    ArchitectureService,
)
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


def _make_repository(
    repo_id: int = 100,
    organization_id: int = 1,
    name: str = "coodara-service",
) -> Repository:
    repo = MagicMock(spec=Repository)
    repo.id = repo_id
    repo.organization_id = organization_id
    repo.name = name
    repo.owner = "acme"
    repo.full_name = f"acme/{name}"
    repo.clone_url = f"https://github.com/acme/{name}.git"
    repo.default_branch = "main"
    repo.visibility = "public"
    return repo


# ---------------------------------------------------------------------------
# Case 1 & Case 2: Multi-Org member imports into explicit selected Org
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_import_repository_into_explicit_selected_organization_b() -> None:
    """
    Case 1: User belongs to Org A (id=1) and Org B (id=2).
    User selects Org B.
    Imported repository must belong to Org B.
    """
    member_b = _make_member(user_id=1, organization_id=2)
    created_repo_b = _make_repository(repo_id=200, organization_id=2, name="service-b")

    mock_db = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()

    mock_repo_service = MagicMock(spec=RepositoryService)
    mock_repo_service.import_repository = AsyncMock(return_value=created_repo_b)

    payload = RepositoryImportRequest(
        owner="acme",
        name="service-b",
        default_branch="main",
    )

    with patch(
        "app.api.v1.repositories._create_repository_service",
        return_value=mock_repo_service,
    ):
        result = await import_repository(
            organization_id=2,
            payload=payload,
            member=member_b,
            github_access_token="test-token",
            github_client=MagicMock(),
            db=mock_db,
        )

    assert result.organization_id == 2
    mock_repo_service.import_repository.assert_awaited_once_with(
        organization_id=2,
        payload=payload,
    )
    mock_db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_import_repository_into_explicit_selected_organization_a() -> None:
    """
    Case 2: User belongs to Org A (id=1) and Org B (id=2).
    User selects Org A.
    Imported repository must belong to Org A.
    """
    member_a = _make_member(user_id=1, organization_id=1)
    created_repo_a = _make_repository(repo_id=100, organization_id=1, name="service-a")


    mock_db = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()

    mock_repo_service = MagicMock(spec=RepositoryService)
    mock_repo_service.import_repository = AsyncMock(return_value=created_repo_a)

    payload = RepositoryImportRequest(
        owner="acme",
        name="service-a",
        default_branch="main",
    )

    with patch(
        "app.api.v1.repositories._create_repository_service",
        return_value=mock_repo_service,
    ):
        result = await import_repository(
            organization_id=1,
            payload=payload,
            member=member_a,
            github_access_token="test-token",
            github_client=MagicMock(),
            db=mock_db,
        )

    assert result.organization_id == 1
    mock_repo_service.import_repository.assert_awaited_once_with(
        organization_id=1,
        payload=payload,
    )
    mock_db.commit.assert_awaited_once()


# ---------------------------------------------------------------------------
# Case 3: User belongs only to Org A attempting access to Org B -> 403
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_user_in_org_a_attempting_org_b_denied_with_403() -> None:
    """
    Case 3: User belongs only to Org A.
    When sending organization_id=2 (Org B), dependency check returns 403 Forbidden.
    """
    user = _make_user(user_id=1)
    mock_db = MagicMock()

    mock_member_repo = MagicMock()
    mock_member_repo.get_member = AsyncMock(return_value=None)  # Not a member of Org B

    with (
        patch(
            "app.api.dependencies.OrganizationMemberRepository",
            return_value=mock_member_repo,
        ),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_current_organization_member(
            organization_id=2,
            current_user=user,
            db=mock_db,
        )

    assert exc_info.value.status_code == 403
    assert "You do not have access to this organization." in exc_info.value.detail


# ---------------------------------------------------------------------------
# Case 4: Cross-Organization Resource Access -> 404 (No Leakage)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_org_a_repository_requested_via_org_b_returns_404() -> None:
    """
    Case 4: Repository 100 belongs to Org A (id=1).
    A user with access to Org B (id=2) requests /organizations/2/repositories/100.
    The response must be 404 Not Found (never leaking that the repo exists in Org A).
    """
    member_b = _make_member(user_id=2, organization_id=2)
    mock_db = MagicMock()

    mock_repo_service = MagicMock(spec=RepositoryService)
    mock_repo_service.get_repository = AsyncMock(
        side_effect=RepositoryNotFoundError("Repository not found."),
    )

    with (
        patch(
            "app.api.v1.repositories._create_repository_service",
            return_value=mock_repo_service,
        ),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_repository(
            organization_id=2,
            repository_id=100,
            member=member_b,
            github_client=MagicMock(),
            db=mock_db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."


@pytest.mark.asyncio
async def test_org_a_analysis_requested_via_org_b_returns_404() -> None:
    """
    Case 4 (Analysis): Analysis for Org A repo requested via Org B endpoint returns 404.
    """
    member_b = _make_member(user_id=2, organization_id=2)
    mock_db = MagicMock()

    mock_analysis_service = MagicMock(spec=AnalysisService)
    mock_analysis_service.get_analysis = AsyncMock(
        side_effect=RepositoryNotFoundError("Repository not found."),
    )

    with (
        patch(
            "app.api.v1.analysis._create_analysis_service",
            return_value=mock_analysis_service,
        ),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_analysis(
            organization_id=2,
            repository_id=100,
            analysis_id=1,
            member=member_b,
            db=mock_db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."


@pytest.mark.asyncio
async def test_org_a_architecture_requested_via_org_b_returns_404() -> None:
    """
    Case 4 (Architecture): Architecture for Org A repo requested via Org B endpoint returns 404.
    """
    member_b = _make_member(user_id=2, organization_id=2)
    mock_db = MagicMock()

    mock_arch_service = MagicMock(spec=ArchitectureService)
    mock_arch_service.get_architecture = AsyncMock(
        side_effect=ArchitectureRepositoryNotFoundError("Repository not found."),
    )

    with (
        patch(
            "app.api.v1.architecture._create_architecture_service",
            return_value=mock_arch_service,
        ),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_architecture(
            organization_id=2,
            repository_id=100,
            member=member_b,
            db=mock_db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."
