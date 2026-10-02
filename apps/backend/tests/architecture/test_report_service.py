"""
Tests for ArchitectureReportService and report generation logic.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.architecture.report_service import (
    ArchitectureReportNotFoundError,
    ArchitectureReportService,
)
from app.models.analysis import (
    AnalysisJob,
    AnalysisResult,
    AnalysisStatus,
    DetectedTechnology,
    RepositoryMetrics,
)
from app.models.architecture import (
    ArchitectureIssue,
    ArchitectureRecommendation,
    ArchitectureScore,
    ArchitectureSnapshot,
)
from app.models.repository import Repository


@pytest.fixture
def mock_db() -> AsyncMock:
    return AsyncMock()


def _sample_graph_json() -> str:
    return json.dumps({
        "version": 1,
        "nodes": [
            {
                "id": "app.controllers.auth",
                "name": "AuthController",
                "type": "controller",
                "subsystem": "Presentation",
                "file_path": "app/controllers/auth.py",
                "responsibilities": ["Handle login", "Issue tokens"],
                "efferent_coupling": 2,
                "afferent_coupling": 5,
                "instability_index": 0.28,
            },
            {
                "id": "app.services.user_service",
                "name": "UserService",
                "type": "service",
                "subsystem": "Domain Services",
                "file_path": "app/services/user_service.py",
                "responsibilities": ["Manage user state", "Password hashing"],
                "efferent_coupling": 1,
                "afferent_coupling": 3,
                "instability_index": 0.25,
            },
            {
                "id": "app.models.user",
                "name": "UserModel",
                "type": "database",
                "subsystem": "Persistence",
                "file_path": "app/models/user.py",
                "responsibilities": ["User table ORM"],
                "efferent_coupling": 0,
                "afferent_coupling": 4,
                "instability_index": 0.0,
            },
        ],
        "edges": [
            {
                "source": "app.controllers.auth",
                "target": "app.services.user_service",
                "kind": "dependency",
                "is_intentional": True,
                "boundary_status": "intentional",
            },
            {
                "source": "app.controllers.auth",
                "target": "app.models.user",
                "kind": "dependency",
                "is_intentional": False,
                "boundary_status": "violates_boundary",
                "rationale": "Presentation layer directly accesses Persistence bypassing Domain Services.",
            },
        ],
    })


@pytest.mark.asyncio
async def test_report_service_generates_complete_report(mock_db: AsyncMock) -> None:
    service = ArchitectureReportService(mock_db)

    # Mock Repository
    mock_repo = Repository(
        id=10,
        organization_id=1,
        name="billing-service",
        primary_language="Python",
    )
    mock_repo.default_branch = "main"

    # Mock Job
    mock_job = AnalysisJob(
        id=100,
        repository_id=10,
        status=AnalysisStatus.COMPLETED,
        created_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )
    mock_job.commit_hash = "c3a4f5b6e7890"

    # Mock Result with Metrics and Tech
    mock_metrics = RepositoryMetrics(
        id=1,
        analysis_result_id=100,
        loc=4500,
        files=32,
        classes=18,
        functions=95,
        complexity=6.2,
        maintainability=82.0,
    )
    mock_tech = [
        DetectedTechnology(
            id=1,
            analysis_result_id=100,
            technology="FastAPI",
            version="0.115.0",
            confidence_score=0.98,
        ),
        DetectedTechnology(
            id=2,
            analysis_result_id=100,
            technology="PostgreSQL",
            version="15",
            confidence_score=0.95,
        ),
    ]
    mock_result = AnalysisResult(
        id=100,
        analysis_job_id=100,
        metrics=mock_metrics,
        technologies=mock_tech,
    )

    # Mock Snapshot with Score, Issues, Recommendations
    mock_score = ArchitectureScore(
        id=1,
        architecture_snapshot_id=1,
        score=84.5,
        maintainability=82.0,
        coupling=78.0,
        cohesion=88.0,
        complexity=75.0,
    )
    mock_issues = [
        ArchitectureIssue(
            id=1,
            architecture_snapshot_id=1,
            severity="warning",
            category="layer_violation",
            description="AuthController directly imports UserModel bypassing Domain Services.",
            status="open",
        ),
    ]
    mock_recommendations = [
        ArchitectureRecommendation(
            id=1,
            architecture_snapshot_id=1,
            recommendation="Invert dependency flow by routing UserModel calls through UserService.",
            priority="medium",
            status="open",
            action_plan="Refactor AuthController to query UserService.get_user_by_credentials.",
        ),
    ]
    mock_snapshot = ArchitectureSnapshot(
        id=1,
        repository_id=10,
        analysis_result_id=100,
        graph=_sample_graph_json(),
        score=mock_score,
        issues=mock_issues,
        recommendations=mock_recommendations,
    )

    # Mock database queries in sequence:
    # 1. repo, 2. job, 3. result, 4. snapshot
    mock_repo_res = MagicMock()
    mock_repo_res.scalar_one_or_none.return_value = mock_repo

    mock_job_res = MagicMock()
    mock_job_res.scalar_one_or_none.return_value = mock_job

    mock_result_res = MagicMock()
    mock_result_res.scalar_one_or_none.return_value = mock_result

    mock_snap_res = MagicMock()
    mock_snap_res.scalar_one_or_none.return_value = mock_snapshot

    mock_db.execute.side_effect = [
        mock_repo_res,
        mock_job_res,
        mock_result_res,
        mock_snap_res,
    ]

    report = await service.generate_report(organization_id=1, repository_id=10)

    # Assertions on Report Metadata
    assert report.meta.repository_name == "billing-service"
    assert report.meta.total_loc == 4500
    assert report.meta.total_files == 32
    assert report.meta.total_classes == 18
    assert report.meta.commit_sha == "c3a4f5b6e7890"

    # Assertions on Executive Summary
    assert report.executive_summary.health_score == 84.5
    assert report.executive_summary.health_label == "Healthy"
    assert report.executive_summary.detected_pattern != ""

    # Assertions on Technologies
    assert len(report.technology_stack) == 2
    assert report.technology_stack[0].name == "FastAPI"

    # Assertions on Components
    assert len(report.components) == 3
    auth_comp = next(c for c in report.components if c.name == "AuthController")
    assert auth_comp.subsystem == "Presentation"
    assert auth_comp.instability_index == 0.28
    assert len(auth_comp.responsibilities) == 2

    # Assertions on Diagram
    assert "flowchart TD" in report.diagram.mermaid_code
    assert "subgraph" in report.diagram.mermaid_code
    assert "violates boundary" in report.diagram.mermaid_code
    assert len(report.diagram.subsystems) >= 2

    # Assertions on Findings & Evidence
    assert len(report.findings) == 1
    assert report.findings[0].category == "layer_violation"
    assert len(report.findings[0].evidence) >= 1
    assert report.findings[0].evidence[0].source_type == "source_code"

    # Assertions on Recommendations
    assert len(report.recommendations) == 1
    assert "Invert dependency flow" in report.recommendations[0].summary

    # Assertions on Methodology
    assert "deterministic ast" in report.methodology.static_analysis_scope.lower()
    assert len(report.methodology.limitations) > 0

    # Assertions on Markdown content
    assert "# Software Architecture Intelligence Report: billing-service" in report.markdown_content
    assert "```mermaid" in report.markdown_content
    assert "AuthController" in report.markdown_content
    assert "FastAPI" in report.markdown_content


@pytest.mark.asyncio
async def test_report_service_raises_on_tenant_mismatch(mock_db: AsyncMock) -> None:
    service = ArchitectureReportService(mock_db)

    # Repository query returns None (tenant isolation mismatch)
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res

    with pytest.raises(ArchitectureReportNotFoundError) as exc_info:
        await service.generate_report(organization_id=99, repository_id=10)

    assert "Repository 10 not found in organization 99" in str(exc_info.value)


@pytest.mark.asyncio
async def test_report_service_raises_when_no_completed_analysis(mock_db: AsyncMock) -> None:
    service = ArchitectureReportService(mock_db)

    mock_repo = Repository(id=10, organization_id=1, name="empty-service")
    mock_repo_res = MagicMock()
    mock_repo_res.scalar_one_or_none.return_value = mock_repo

    mock_job_res = MagicMock()
    mock_job_res.scalar_one_or_none.return_value = None  # No completed job

    mock_db.execute.side_effect = [mock_repo_res, mock_job_res]

    with pytest.raises(ArchitectureReportNotFoundError) as exc_info:
        await service.generate_report(organization_id=1, repository_id=10)

    assert "No completed analysis found" in str(exc_info.value)
