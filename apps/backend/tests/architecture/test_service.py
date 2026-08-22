"""
Tests for the Architecture Intelligence application service.

These tests verify the application-service contracts:

- repository ownership validation;
- analysis lifecycle validation;
- analysis-result validation;
- duplicate architecture protection;
- domain/persistence conversion;
- architecture generation and persistence;
- snapshot retrieval;
- snapshot history;
- pagination validation.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from app.architecture.models import (
    ArchitectureEdge,
    ArchitectureGraph,
    ArchitectureIssueCategory,
    ArchitectureIssueSeverity,
    ArchitectureIssueSnapshot,
    ArchitectureRecommendationPriority,
    ArchitectureRecommendationSnapshot,
    ArchitectureScoreSnapshot,
    ArchitectureSnapshot,
)
from app.models.analysis import AnalysisStatus
from app.models.architecture import ArchitectureSnapshot as DBArchitectureSnapshot
from app.services.architecture_service import (
    ArchitectureAlreadyExistsError,
    ArchitectureAnalysisIncompleteError,
    ArchitectureAnalysisNotFoundError,
    ArchitectureAnalysisResultNotFoundError,
    ArchitectureRepositoryNotFoundError,
    ArchitectureService,
    ArchitectureServiceError,
    ArchitectureSnapshotNotFoundError,
)


def _make_service() -> ArchitectureService:
    """
    Create a service with mocked persistence dependencies.
    """

    service = ArchitectureService(
        MagicMock(),
    )

    service.repository_repository = MagicMock()
    service.analysis_repository = MagicMock()
    service.architecture_repository = MagicMock()

    service.repository_repository.get_by_organization_and_id = (
        AsyncMock()
    )

    service.analysis_repository.get_by_id = AsyncMock()
    service.analysis_repository.get_result_by_job = AsyncMock()

    service.architecture_repository.get_by_analysis_result = (
        AsyncMock()
    )
    service.architecture_repository.get_latest_by_repository = (
        AsyncMock()
    )
    service.architecture_repository.create_snapshot = AsyncMock()
    service.architecture_repository.add_score = AsyncMock()
    service.architecture_repository.add_issue = AsyncMock()
    service.architecture_repository.add_recommendation = AsyncMock()
    service.architecture_repository.get_by_id = AsyncMock()
    service.architecture_repository.get_by_repository = AsyncMock()
    service.architecture_repository.count_by_repository = (
        AsyncMock()
    )

    return service


def _repository() -> SimpleNamespace:
    """Create a minimal repository object."""

    return SimpleNamespace(
        id=1,
        organization_id=10,
    )


def _analysis(
    *,
    status: AnalysisStatus = AnalysisStatus.COMPLETED,
    repository_id: int = 1,
) -> SimpleNamespace:
    """Create a minimal analysis-job object."""

    return SimpleNamespace(
        id=100,
        repository_id=repository_id,
        status=status,
    )


def _analysis_result() -> SimpleNamespace:
    """Create a complete analysis result."""

    return SimpleNamespace(
        id=200,
        summary="Repository analysis completed.",
        metrics=SimpleNamespace(
            loc=100,
            files=5,
            classes=3,
            functions=10,
            complexity=5.0,
            maintainability=85.0,
        ),
        technologies=(
            SimpleNamespace(
                technology="Python",
                version="3.13",
                confidence_score=0.99,
            ),
        ),
        dependency_graph=SimpleNamespace(
            graph_data=(
                '{"version":1,'
                '"nodes":[{"id":"app.py","type":"module"}],'
                '"edges":[]}'
            ),
        ),
    )


def _architecture_snapshot() -> ArchitectureSnapshot:
    """Create a deterministic architecture-domain snapshot."""

    return ArchitectureSnapshot(
        version=1,
        graph=ArchitectureGraph(
            version=1,
            nodes=(
                SimpleNamespace(
                    id="app.py",
                    type="module",
                ),
                SimpleNamespace(
                    id="service.py",
                    type="module",
                ),
            ),
            edges=(
                ArchitectureEdge(
                    source="app.py",
                    target="service.py",
                    kind="import",
                ),
            ),
        ),
        score=ArchitectureScoreSnapshot(
            score=85.0,
            maintainability=90.0,
            coupling=80.0,
            cohesion=85.0,
            complexity=85.0,
        ),
        issues=(
            ArchitectureIssueSnapshot(
                severity=ArchitectureIssueSeverity.HIGH,
                category=ArchitectureIssueCategory.DEPENDENCY_HOTSPOT,
                description=(
                    "Module 'app.py' has 10 outgoing dependencies."
                ),
            ),
        ),
        recommendations=(
            ArchitectureRecommendationSnapshot(
                recommendation=(
                    "Reduce dependencies in the application module."
                ),
                priority=ArchitectureRecommendationPriority.HIGH,
            ),
        ),
    )


@pytest.mark.asyncio
async def test_generate_architecture_persists_complete_snapshot() -> None:
    """A completed analysis produces a persisted architecture snapshot."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    service.analysis_repository.get_by_id.return_value = _analysis()

    result = _analysis_result()

    service.analysis_repository.get_result_by_job.return_value = result

    service.architecture_repository.get_by_analysis_result.return_value = (
        None
    )

    service.architecture_repository.get_latest_by_repository.return_value = (
        None
    )

    persisted = DBArchitectureSnapshot(
        id=500,
        repository_id=1,
        analysis_result_id=200,
        snapshot_version=1,
        graph="{}",
    )

    service.architecture_repository.create_snapshot.return_value = (
        persisted
    )

    service.architecture_repository.add_score.return_value = (
        SimpleNamespace(id=1)
    )

    service.architecture_repository.add_issue.return_value = (
        SimpleNamespace(id=2)
    )

    service.architecture_repository.add_recommendation.return_value = (
        SimpleNamespace(id=3)
    )

    service.analyzer.analyze = MagicMock(
        return_value=_architecture_snapshot(),
    )

    created = await service.generate_architecture(
        organization_id=10,
        repository_id=1,
        analysis_id=100,
    )

    assert created is persisted
    assert created.id == 500
    assert created.snapshot_version == 1

    service.analyzer.analyze.assert_called_once()

    service.architecture_repository.create_snapshot.assert_awaited_once()
    service.architecture_repository.add_score.assert_awaited_once()
    service.architecture_repository.add_issue.assert_awaited_once()
    service.architecture_repository.add_recommendation.assert_awaited_once()


@pytest.mark.asyncio
async def test_generate_architecture_increments_snapshot_version() -> None:
    """A new architecture snapshot increments the repository version."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    service.analysis_repository.get_by_id.return_value = _analysis()

    service.analysis_repository.get_result_by_job.return_value = (
        _analysis_result()
    )

    service.architecture_repository.get_by_analysis_result.return_value = (
        None
    )

    service.architecture_repository.get_latest_by_repository.return_value = (
        SimpleNamespace(
            id=400,
            snapshot_version=7,
        )
    )

    persisted = DBArchitectureSnapshot(
        id=500,
        repository_id=1,
        analysis_result_id=200,
        snapshot_version=8,
        graph="{}",
    )

    service.architecture_repository.create_snapshot.return_value = (
        persisted
    )

    service.analyzer.analyze = MagicMock(
        return_value=_architecture_snapshot(),
    )

    await service.generate_architecture(
        organization_id=10,
        repository_id=1,
        analysis_id=100,
    )

    create_call = (
        service.architecture_repository
        .create_snapshot
        .await_args
    )

    snapshot = create_call.args[0]

    assert snapshot.snapshot_version == 8


@pytest.mark.asyncio
async def test_generate_architecture_rejects_unknown_repository() -> None:
    """Architecture generation requires a valid organization repository."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        None
    )

    with pytest.raises(
        ArchitectureRepositoryNotFoundError,
        match="Repository not found",
    ):
        await service.generate_architecture(
            organization_id=10,
            repository_id=1,
            analysis_id=100,
        )


@pytest.mark.asyncio
async def test_generate_architecture_rejects_unknown_analysis() -> None:
    """An analysis belonging to another repository is rejected."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    service.analysis_repository.get_by_id.return_value = (
        _analysis(repository_id=999)
    )

    with pytest.raises(
        ArchitectureAnalysisNotFoundError,
        match="Analysis not found",
    ):
        await service.generate_architecture(
            organization_id=10,
            repository_id=1,
            analysis_id=100,
        )


@pytest.mark.asyncio
async def test_generate_architecture_rejects_incomplete_analysis() -> None:
    """Architecture cannot be generated before analysis completes."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    service.analysis_repository.get_by_id.return_value = _analysis(
        status=AnalysisStatus.RUNNING,
    )

    with pytest.raises(
        ArchitectureAnalysisIncompleteError,
        match="completed repository analysis",
    ):
        await service.generate_architecture(
            organization_id=10,
            repository_id=1,
            analysis_id=100,
        )


@pytest.mark.asyncio
async def test_generate_architecture_rejects_missing_analysis_result() -> None:
    """A completed analysis must have a persisted result."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    service.analysis_repository.get_by_id.return_value = _analysis()

    service.analysis_repository.get_result_by_job.return_value = None

    with pytest.raises(
        ArchitectureAnalysisResultNotFoundError,
        match="Analysis result not found",
    ):
        await service.generate_architecture(
            organization_id=10,
            repository_id=1,
            analysis_id=100,
        )


@pytest.mark.asyncio
async def test_generate_architecture_rejects_duplicate_snapshot() -> None:
    """An analysis result can produce only one architecture snapshot."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    service.analysis_repository.get_by_id.return_value = _analysis()

    result = _analysis_result()

    service.analysis_repository.get_result_by_job.return_value = result

    service.architecture_repository.get_by_analysis_result.return_value = (
        SimpleNamespace(
            id=500,
            analysis_result_id=200,
        )
    )

    with pytest.raises(
        ArchitectureAlreadyExistsError,
        match="already exists",
    ):
        await service.generate_architecture(
            organization_id=10,
            repository_id=1,
            analysis_id=100,
        )


@pytest.mark.asyncio
async def test_generate_architecture_rejects_missing_metrics() -> None:
    """Architecture generation requires repository metrics."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    service.analysis_repository.get_by_id.return_value = _analysis()

    result = _analysis_result()
    result.metrics = None

    service.analysis_repository.get_result_by_job.return_value = result

    service.architecture_repository.get_by_analysis_result.return_value = (
        None
    )

    with pytest.raises(
        ArchitectureServiceError,
        match="Analysis metrics are missing",
    ):
        await service.generate_architecture(
            organization_id=10,
            repository_id=1,
            analysis_id=100,
        )


@pytest.mark.asyncio
async def test_generate_architecture_rejects_missing_dependency_graph() -> None:
    """Architecture generation requires a dependency graph."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    service.analysis_repository.get_by_id.return_value = _analysis()

    result = _analysis_result()
    result.dependency_graph = None

    service.analysis_repository.get_result_by_job.return_value = result

    service.architecture_repository.get_by_analysis_result.return_value = (
        None
    )

    with pytest.raises(
        ArchitectureServiceError,
        match="Analysis dependency graph is missing",
    ):
        await service.generate_architecture(
            organization_id=10,
            repository_id=1,
            analysis_id=100,
        )


@pytest.mark.asyncio
async def test_get_architecture_returns_latest_snapshot() -> None:
    """The latest architecture snapshot can be retrieved."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    latest = SimpleNamespace(
        id=500,
        repository_id=1,
        snapshot_version=4,
    )

    service.architecture_repository.get_latest_by_repository.return_value = (
        latest
    )

    result = await service.get_architecture(
        organization_id=10,
        repository_id=1,
    )

    assert result is latest


@pytest.mark.asyncio
async def test_get_architecture_rejects_missing_snapshot() -> None:
    """Retrieving architecture fails when no snapshot exists."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    service.architecture_repository.get_latest_by_repository.return_value = (
        None
    )

    with pytest.raises(
        ArchitectureSnapshotNotFoundError,
        match="Architecture snapshot not found",
    ):
        await service.get_architecture(
            organization_id=10,
            repository_id=1,
        )


@pytest.mark.asyncio
async def test_get_snapshot_rejects_snapshot_from_another_repository() -> None:
    """A snapshot belonging to another repository cannot be retrieved."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    service.architecture_repository.get_by_id.return_value = (
        SimpleNamespace(
            id=500,
            repository_id=999,
        )
    )

    with pytest.raises(
        ArchitectureSnapshotNotFoundError,
        match="Architecture snapshot not found",
    ):
        await service.get_snapshot(
            organization_id=10,
            repository_id=1,
            snapshot_id=500,
        )


@pytest.mark.asyncio
async def test_list_snapshots_returns_repository_history() -> None:
    """Architecture history can be listed for a repository."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    snapshots = (
        SimpleNamespace(id=3),
        SimpleNamespace(id=2),
        SimpleNamespace(id=1),
    )

    service.architecture_repository.get_by_repository.return_value = (
        snapshots
    )

    result = await service.list_snapshots(
        organization_id=10,
        repository_id=1,
        offset=0,
        limit=20,
    )

    assert result == snapshots

    service.architecture_repository.get_by_repository.assert_awaited_once_with(
        repository_id=1,
        offset=0,
        limit=20,
    )


@pytest.mark.asyncio
async def test_list_snapshots_rejects_invalid_offset() -> None:
    """Negative offsets are rejected."""

    service = _make_service()

    with pytest.raises(
        ValueError,
        match="offset must be greater than or equal to 0",
    ):
        await service.list_snapshots(
            organization_id=10,
            repository_id=1,
            offset=-1,
        )


@pytest.mark.asyncio
async def test_list_snapshots_rejects_invalid_limit() -> None:
    """Page sizes outside the supported range are rejected."""

    service = _make_service()

    with pytest.raises(
        ValueError,
        match="limit must be greater than or equal to 1",
    ):
        await service.list_snapshots(
            organization_id=10,
            repository_id=1,
            limit=0,
        )

    with pytest.raises(
        ValueError,
        match="limit must be less than or equal to 100",
    ):
        await service.list_snapshots(
            organization_id=10,
            repository_id=1,
            limit=101,
        )


@pytest.mark.asyncio
async def test_count_snapshots_returns_repository_count() -> None:
    """Snapshot count is delegated to the architecture repository."""

    service = _make_service()

    service.repository_repository.get_by_organization_and_id.return_value = (
        _repository()
    )

    service.architecture_repository.count_by_repository.return_value = 7

    result = await service.count_snapshots(
        organization_id=10,
        repository_id=1,
    )

    assert result == 7

    service.architecture_repository.count_by_repository.assert_awaited_once_with(
        repository_id=1,
    )


def test_serialize_graph_is_deterministic() -> None:
    """Architecture graph serialization is deterministic."""

    first = _architecture_snapshot()
    second = _architecture_snapshot()

    first_serialized = ArchitectureService._serialize_graph(
        first,
    )

    second_serialized = ArchitectureService._serialize_graph(
        second,
    )

    assert first_serialized == second_serialized


def test_build_analysis_snapshot_preserves_analysis_data() -> None:
    """Persistence analysis results are converted without data loss."""

    result = _analysis_result()

    snapshot = ArchitectureService._build_analysis_snapshot(
        result,
    )

    assert snapshot.summary == result.summary
    assert snapshot.metrics.loc == 100
    assert snapshot.metrics.files == 5
    assert snapshot.metrics.classes == 3
    assert snapshot.metrics.functions == 10
    assert snapshot.metrics.complexity == 5.0
    assert snapshot.metrics.maintainability == 85.0

    assert len(snapshot.technologies) == 1
    assert snapshot.technologies[0].technology == "Python"
    assert snapshot.technologies[0].version == "3.13"

    assert snapshot.dependency_graph is not None
    assert snapshot.dependency_graph.graph_data == (
        result.dependency_graph.graph_data
    )