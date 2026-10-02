"""
API endpoint tests for Architecture Intelligence Report.

Tests:
- get_architecture_report returns structured report on success
- get_architecture_report maps ArchitectureReportNotFoundError to 404
- get_architecture_report maps unexpected errors to 500
- download_architecture_report_markdown returns markdown response with headers
- download_architecture_report_markdown maps ArchitectureReportNotFoundError to 404
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from app.api.v1.architecture import (
    get_architecture_report,
    get_architecture_report_markdown,
)
from app.architecture.report_service import (
    ArchitectureReportNotFoundError,
    ArchitectureReportService,
)
from app.schemas.report import (
    ArchitectureReportResponse,
    ReportDiagram,
    ReportExecutiveSummary,
    ReportMeta,
    ReportMethodology,
)


def _make_dummy_report() -> ArchitectureReportResponse:
    now = datetime.now(timezone.utc)
    return ArchitectureReportResponse(
        meta=ReportMeta(
            repository_id=42,
            repository_name="payment-service",
            organization_id=1,
            primary_language="TypeScript",
            analyzed_at=now,
            analysis_job_id=99,
        ),
        executive_summary=ReportExecutiveSummary(
            detected_pattern="Layered Architecture",
            pattern_category="layered",
            alignment_score=90.0,
            health_score=85.0,
            health_label="Healthy",
            maintainability=80.0,
            modularity=85.0,
            coupling=70.0,
            complexity=65.0,
            summary_text="Clean separation of API, services, and repositories.",
        ),
        technology_stack=[],
        components=[],
        diagram=ReportDiagram(
            mermaid_code="flowchart TD\nA-->B",
            node_count=2,
            edge_count=1,
            subsystems=["Core"],
        ),
        dependency_hotspots=[],
        findings=[],
        recommendations=[],
        adrs=[],
        methodology=ReportMethodology(
            static_analysis_scope="Full AST parsing and dependency analysis",
            limitations=["Static analysis only"],
            confidence_rationale="Grounded in AST",
            generated_at=now,
        ),
        markdown_content="# Software Architecture Intelligence Report: payment-service\n\nDummy Markdown",
    )


@pytest.mark.asyncio
async def test_get_architecture_report_success() -> None:
    mock_db = AsyncMock()
    mock_member = AsyncMock()
    mock_report = _make_dummy_report()

    with patch.object(
        ArchitectureReportService,
        "generate_report",
        new=AsyncMock(return_value=mock_report),
    ):
        result = await get_architecture_report(
            organization_id=1,
            repository_id=42,
            member=mock_member,
            db=mock_db,
        )

    assert result == mock_report
    assert result.meta.repository_name == "payment-service"
    assert result.executive_summary.health_score == 85.0


@pytest.mark.asyncio
async def test_get_architecture_report_not_found_maps_to_404() -> None:
    mock_db = AsyncMock()
    mock_member = AsyncMock()

    with (
        patch.object(
            ArchitectureReportService,
            "generate_report",
            new=AsyncMock(side_effect=ArchitectureReportNotFoundError("Repository not found.")),
        ),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_architecture_report(
            organization_id=1,
            repository_id=999,
            member=mock_member,
            db=mock_db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."


@pytest.mark.asyncio
async def test_get_architecture_report_error_maps_to_500() -> None:
    mock_db = AsyncMock()
    mock_member = AsyncMock()

    with (
        patch.object(
            ArchitectureReportService,
            "generate_report",
            new=AsyncMock(side_effect=RuntimeError("Database failure")),
        ),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_architecture_report(
            organization_id=1,
            repository_id=42,
            member=mock_member,
            db=mock_db,
        )

    assert exc_info.value.status_code == 500
    assert "Failed to generate architecture report" in exc_info.value.detail


@pytest.mark.asyncio
async def test_download_architecture_report_markdown_success() -> None:
    mock_db = AsyncMock()
    mock_member = AsyncMock()
    mock_report = _make_dummy_report()

    with patch.object(
        ArchitectureReportService,
        "generate_report",
        new=AsyncMock(return_value=mock_report),
    ):
        response = await get_architecture_report_markdown(
            organization_id=1,
            repository_id=42,
            member=mock_member,
            db=mock_db,
        )

    assert response.status_code == 200
    assert response.media_type == "text/markdown; charset=utf-8"
    assert "attachment; filename=" in response.headers["Content-Disposition"]
    assert "coodara-architecture-report-payment-service.md" in response.headers["Content-Disposition"]
    assert response.body.decode("utf-8") == mock_report.markdown_content


@pytest.mark.asyncio
async def test_download_architecture_report_markdown_not_found_maps_to_404() -> None:
    mock_db = AsyncMock()
    mock_member = AsyncMock()

    with (
        patch.object(
            ArchitectureReportService,
            "generate_report",
            new=AsyncMock(side_effect=ArchitectureReportNotFoundError("Snapshot not found.")),
        ),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_architecture_report_markdown(
            organization_id=1,
            repository_id=42,
            member=mock_member,
            db=mock_db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Snapshot not found."
