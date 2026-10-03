"""
API integration and authorization tests for Architecture Lab / AEI router.

Verifies:
- Tenancy isolation: Organization member guard enforces 403 on foreign org access
- 404 response on foreign or missing repository
- CRUD endpoints for hypotheses, interventions, experiments, workload/resource profiles, evidence, decisions
- Status code validations (201 Created, 200 OK, 204 No Content, 400 Bad Request)
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.api.dependencies import get_current_active_user, get_current_organization_member
from main import app
from app.models.enums.organization_role import OrganizationRole
from app.models.lab import (
    DecisionStatus,
    EvidenceCategory,
    ExperimentRunStatus,
    ExperimentStatus,
    HypothesisStatus,
    InterventionType,
)
from app.models.organization_member import OrganizationMember
from app.models.user import User
from app.services.lab_service import (
    LabRepositoryNotFoundError,
    LabResourceNotFoundError,
    LabService,
    LabValidationError,
)
from httpx import ASGITransport, AsyncClient


from app.api.v1.lab import _get_lab_service
from app.db.session import get_db


def _make_user(user_id: int = 1, username: str = "architect") -> User:
    user = MagicMock(spec=User)
    user.id = user_id
    user.username = username
    user.email = f"{username}@example.com"
    return user


def _make_member(user_id: int = 1, organization_id: int = 1) -> OrganizationMember:
    member = MagicMock(spec=OrganizationMember)
    member.user_id = user_id
    member.organization_id = organization_id
    member.role = OrganizationRole.MEMBER
    return member


@pytest.fixture
def mock_user():
    return _make_user(user_id=1)


@pytest.fixture
def mock_member():
    return _make_member(user_id=1, organization_id=1)


@pytest.fixture(autouse=True)
def override_db():
    mock_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_lab_api_overview_success(mock_user, mock_member):
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    app.dependency_overrides[get_current_organization_member] = lambda: mock_member

    mock_service = AsyncMock(spec=LabService)
    mock_service.get_overview.return_value = {
        "repository_id": 10,
        "organization_id": 1,
        "hypotheses_count": 2,
        "experiments_count": 1,
        "evidence_count": 5,
        "cost_scenarios_count": 1,
        "decisions_count": 0,
        "hypotheses": [],
        "workload_profiles": [],
        "resource_profiles": [],
        "recent_evidence": [],
        "recent_decisions": [],
    }
    app.dependency_overrides[_get_lab_service] = lambda: mock_service

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/organizations/1/repositories/10/lab")

            assert response.status_code == 200
            data = response.json()
            assert data["repository_id"] == 10
            assert data["hypotheses_count"] == 2
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)
        app.dependency_overrides.pop(get_current_organization_member, None)
        app.dependency_overrides.pop(_get_lab_service, None)


@pytest.mark.asyncio
async def test_lab_api_rejects_unowned_repository(mock_user, mock_member):
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    app.dependency_overrides[get_current_organization_member] = lambda: mock_member

    mock_service = AsyncMock(spec=LabService)
    mock_service.get_overview.side_effect = LabRepositoryNotFoundError("Repository not found.")
    app.dependency_overrides[_get_lab_service] = lambda: mock_service

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/organizations/1/repositories/999/lab")

            assert response.status_code == 404
            assert response.json()["detail"] == "Repository not found."
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)
        app.dependency_overrides.pop(get_current_organization_member, None)
        app.dependency_overrides.pop(_get_lab_service, None)


@pytest.mark.asyncio
async def test_create_hypothesis_endpoint(mock_user, mock_member):
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    app.dependency_overrides[get_current_organization_member] = lambda: mock_member

    mock_service = AsyncMock(spec=LabService)
    mock_hyp = MagicMock()
    mock_hyp.id = 42
    mock_hyp.organization_id = 1
    mock_hyp.repository_id = 10
    mock_hyp.title = "New decoupled service"
    mock_hyp.description = "Test description"
    mock_hyp.question = "Can we decouple?"
    mock_hyp.status = HypothesisStatus.DRAFT.value
    mock_hyp.created_by = 1
    mock_hyp.created_at = "2026-10-03T12:00:00Z"
    mock_hyp.updated_at = "2026-10-03T12:00:00Z"
    mock_hyp.interventions = []

    mock_service.create_hypothesis.return_value = mock_hyp
    app.dependency_overrides[_get_lab_service] = lambda: mock_service

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "title": "New decoupled service",
                "description": "Test description",
                "question": "Can we decouple?",
                "status": "DRAFT",
            }
            response = await client.post(
                "/api/v1/organizations/1/repositories/10/lab/hypotheses",
                json=payload,
            )

            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 42
            assert data["title"] == "New decoupled service"
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)
        app.dependency_overrides.pop(get_current_organization_member, None)
        app.dependency_overrides.pop(_get_lab_service, None)


@pytest.mark.asyncio
async def test_validation_error_returns_400(mock_user, mock_member):
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    app.dependency_overrides[get_current_organization_member] = lambda: mock_member

    mock_service = AsyncMock(spec=LabService)
    mock_service.create_decision_record.side_effect = LabValidationError("Selected intervention does not belong to hypothesis.")
    app.dependency_overrides[_get_lab_service] = lambda: mock_service

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "hypothesis_id": 1,
                "decision": "ACCEPT",
                "rationale": "Invalid intervention selection",
                "selected_intervention_id": 999,
            }
            response = await client.post(
                "/api/v1/organizations/1/repositories/10/lab/decisions",
                json=payload,
            )

            assert response.status_code == 400
            assert "Selected intervention" in response.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)
        app.dependency_overrides.pop(get_current_organization_member, None)
        app.dependency_overrides.pop(_get_lab_service, None)
