"""
Architecture API endpoint tests.

These tests verify:

- architecture generation;
- transaction commit/rollback behavior;
- repository-not-found mapping;
- analysis-not-found mapping;
- incomplete-analysis conflict mapping;
- missing-analysis-result mapping;
- duplicate-architecture conflict mapping;
- latest architecture retrieval;
- architecture snapshot listing;
- individual snapshot retrieval;
- HTTP-layer exception mapping;
- graph and snapshot serialization.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.api.v1.architecture import (
    _parse_graph,
    _serialize_snapshot,
    generate_architecture,
    get_architecture,
    get_architecture_snapshot,
    list_architecture_snapshots,
)
from app.models.architecture import (
    ArchitectureIssue,
    ArchitectureRecommendation,
    ArchitectureScore,
    ArchitectureSnapshot,
)
from app.services.architecture_service import (
    ArchitectureAlreadyExistsError,
    ArchitectureAnalysisIncompleteError,
    ArchitectureAnalysisNotFoundError,
    ArchitectureAnalysisResultNotFoundError,
    ArchitectureRepositoryNotFoundError,
    ArchitectureServiceError,
    ArchitectureSnapshotNotFoundError,
)
from fastapi import HTTPException

TEST_DATETIME = datetime(
    2026,
    1,
    1,
    tzinfo=timezone.utc,
)


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------


def make_member() -> MagicMock:
    """Create a mock organization member."""

    return MagicMock()


def make_db() -> MagicMock:
    """
    Create a mocked asynchronous database session.

    Transaction operations are asynchronous SQLAlchemy operations.
    """

    db = MagicMock()

    db.commit = AsyncMock()
    db.rollback = AsyncMock()

    return db


def make_score(
    *,
    snapshot_id: int = 1,
) -> ArchitectureScore:
    """Create an architecture score for testing."""

    return ArchitectureScore(
        id=1,
        architecture_snapshot_id=snapshot_id,
        score=82.5,
        maintainability=85.0,
        coupling=80.0,
        cohesion=84.0,
        complexity=81.0,
        created_at=TEST_DATETIME,
    )


def make_issue(
    *,
    snapshot_id: int = 1,
) -> ArchitectureIssue:
    """Create an architecture issue for testing."""

    return ArchitectureIssue(
        id=1,
        architecture_snapshot_id=snapshot_id,
        severity="high",
        category="dependency_hotspot",
        description="Module has excessive outgoing dependencies.",
        created_at=TEST_DATETIME,
    )


def make_recommendation(
    *,
    snapshot_id: int = 1,
) -> ArchitectureRecommendation:
    """Create an architecture recommendation for testing."""

    return ArchitectureRecommendation(
        id=1,
        architecture_snapshot_id=snapshot_id,
        recommendation="Reduce dependencies in the service module.",
        priority="high",
        created_at=TEST_DATETIME,
    )


def make_snapshot(
    *,
    snapshot_id: int = 1,
    repository_id: int = 100,
    analysis_result_id: int = 200,
    snapshot_version: int = 1,
    graph: str | None = None,
) -> ArchitectureSnapshot:
    """Create a persisted architecture snapshot for testing."""

    snapshot = ArchitectureSnapshot(
        id=snapshot_id,
        repository_id=repository_id,
        analysis_result_id=analysis_result_id,
        snapshot_version=snapshot_version,
        graph=graph
        or json.dumps(
            {
                "version": 1,
                "nodes": [
                    {
                        "id": "app.main",
                        "type": "module",
                    },
                    {
                        "id": "app.services",
                        "type": "module",
                    },
                ],
                "edges": [
                    {
                        "source": "app.main",
                        "target": "app.services",
                        "kind": "import",
                    },
                ],
            }
        ),
        created_at=TEST_DATETIME,
    )

    snapshot.score = make_score(
        snapshot_id=snapshot_id,
    )
    snapshot.issues = [
        make_issue(
            snapshot_id=snapshot_id,
        ),
    ]
    snapshot.recommendations = [
        make_recommendation(
            snapshot_id=snapshot_id,
        ),
    ]

    return snapshot


def make_service() -> MagicMock:
    """Create a mocked architecture service."""

    return MagicMock()


def patch_architecture_service(
    service: MagicMock,
):
    """Patch architecture service construction."""

    return patch(
        "app.api.v1.architecture._create_architecture_service",
        return_value=service,
    )


# ---------------------------------------------------------------------------
# Graph parsing
# ---------------------------------------------------------------------------


def test_parse_graph_returns_graph_response() -> None:
    """Valid graph JSON should be converted to the API representation."""

    graph = _parse_graph(
        json.dumps(
            {
                "version": 2,
                "nodes": [
                    {
                        "id": "app.main",
                        "type": "module",
                    },
                    {
                        "id": "app.api",
                        "type": "package",
                    },
                ],
                "edges": [
                    {
                        "source": "app.main",
                        "target": "app.api",
                        "kind": "import",
                    },
                ],
            }
        )
    )

    assert graph.version == 2
    assert len(graph.nodes) == 2
    assert len(graph.edges) == 1

    assert graph.nodes[0].id == "app.main"
    assert graph.nodes[0].type == "module"

    assert graph.edges[0].source == "app.main"
    assert graph.edges[0].target == "app.api"
    assert graph.edges[0].kind == "import"


def test_parse_graph_uses_defaults() -> None:
    """Missing optional graph fields should use API defaults."""

    graph = _parse_graph(
        json.dumps(
            {
                "nodes": [
                    {
                        "id": "app.main",
                    },
                ],
                "edges": [
                    {
                        "source": "app.main",
                        "target": "app.api",
                    },
                ],
            }
        )
    )

    assert graph.version == 1
    assert graph.nodes[0].type == "module"
    assert graph.edges[0].kind == "import"


def test_parse_graph_ignores_invalid_nodes_and_edges() -> None:
    """Malformed individual nodes and edges should be skipped."""

    graph = _parse_graph(
        json.dumps(
            {
                "version": 1,
                "nodes": [
                    {
                        "id": "valid",
                        "type": "module",
                    },
                    {
                        "id": 123,
                        "type": "module",
                    },
                    "invalid-node",
                ],
                "edges": [
                    {
                        "source": "valid",
                        "target": "other",
                    },
                    {
                        "source": 123,
                        "target": "other",
                    },
                    "invalid-edge",
                ],
            }
        )
    )

    assert len(graph.nodes) == 1
    assert graph.nodes[0].id == "valid"

    assert len(graph.edges) == 1
    assert graph.edges[0].source == "valid"


def test_parse_graph_rejects_invalid_json() -> None:
    """Invalid JSON should raise an architecture service error."""

    with pytest.raises(
        ArchitectureServiceError,
        match="Stored architecture graph is invalid.",
    ):
        _parse_graph("{invalid-json")


def test_parse_graph_rejects_non_object_json() -> None:
    """Graph JSON must contain an object."""

    with pytest.raises(
        ArchitectureServiceError,
        match="Stored architecture graph is invalid.",
    ):
        _parse_graph("[]")


def test_parse_graph_rejects_invalid_version() -> None:
    """Graph version must be an integer."""

    with pytest.raises(
        ArchitectureServiceError,
        match="Stored architecture graph version is invalid.",
    ):
        _parse_graph(
            json.dumps(
                {
                    "version": "1",
                    "nodes": [],
                    "edges": [],
                }
            )
        )


def test_parse_graph_rejects_invalid_nodes_container() -> None:
    """Graph nodes must be represented by a list."""

    with pytest.raises(
        ArchitectureServiceError,
        match="Stored architecture graph nodes are invalid.",
    ):
        _parse_graph(
            json.dumps(
                {
                    "version": 1,
                    "nodes": {},
                    "edges": [],
                }
            )
        )


def test_parse_graph_rejects_invalid_edges_container() -> None:
    """Graph edges must be represented by a list."""

    with pytest.raises(
        ArchitectureServiceError,
        match="Stored architecture graph edges are invalid.",
    ):
        _parse_graph(
            json.dumps(
                {
                    "version": 1,
                    "nodes": [],
                    "edges": {},
                }
            )
        )


# ---------------------------------------------------------------------------
# Snapshot serialization
# ---------------------------------------------------------------------------


def test_serialize_snapshot_returns_api_response() -> None:
    """A complete persisted snapshot should serialize correctly."""

    snapshot = make_snapshot()

    response = _serialize_snapshot(snapshot)

    assert response.id == snapshot.id
    assert response.repository_id == snapshot.repository_id
    assert response.analysis_result_id == snapshot.analysis_result_id
    assert response.snapshot_version == snapshot.snapshot_version

    assert response.graph.version == 1
    assert len(response.graph.nodes) == 2
    assert len(response.graph.edges) == 1

    assert response.score.score == 82.5
    assert response.score.maintainability == 85.0
    assert response.score.coupling == 80.0
    assert response.score.cohesion == 84.0
    assert response.score.complexity == 81.0

    assert len(response.issues) == 1
    assert response.issues[0].severity == "high"
    assert response.issues[0].category == "dependency_hotspot"

    assert len(response.recommendations) == 1
    assert response.recommendations[0].priority == "high"


def test_serialize_snapshot_requires_graph() -> None:
    """A snapshot without graph data should fail serialization."""

    snapshot = make_snapshot()
    snapshot.graph = None

    with pytest.raises(
        ArchitectureServiceError,
        match="Architecture snapshot graph is missing.",
    ):
        _serialize_snapshot(snapshot)


def test_serialize_snapshot_requires_score() -> None:
    """A snapshot without a score should fail serialization."""

    snapshot = make_snapshot()
    snapshot.score = None

    with pytest.raises(
        ArchitectureServiceError,
        match="Architecture snapshot score is missing.",
    ):
        _serialize_snapshot(snapshot)


# ---------------------------------------------------------------------------
# Generate architecture
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_architecture_returns_created_snapshot() -> None:
    """Successful generation should commit and return the snapshot."""

    snapshot = make_snapshot()

    service = make_service()
    service.generate_architecture = AsyncMock(
        return_value=snapshot,
    )

    db = make_db()

    with patch_architecture_service(service):
        result = await generate_architecture(
            organization_id=10,
            repository_id=100,
            analysis_id=200,
            member=make_member(),
            db=db,
        )

    assert result.id == snapshot.id
    assert result.repository_id == snapshot.repository_id
    assert result.analysis_result_id == snapshot.analysis_result_id

    service.generate_architecture.assert_awaited_once_with(
        organization_id=10,
        repository_id=100,
        analysis_id=200,
    )

    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_generate_architecture_maps_repository_not_found_to_404() -> None:
    """Missing repository should produce HTTP 404."""

    service = make_service()
    service.generate_architecture = AsyncMock(
        side_effect=ArchitectureRepositoryNotFoundError(
            "Repository not found.",
        ),
    )

    db = make_db()

    with (
        patch_architecture_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await generate_architecture(
            organization_id=10,
            repository_id=999,
            analysis_id=200,
            member=make_member(),
            db=db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."

    db.commit.assert_not_awaited()
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_generate_architecture_maps_analysis_not_found_to_404() -> None:
    """Missing analysis should produce HTTP 404."""

    service = make_service()
    service.generate_architecture = AsyncMock(
        side_effect=ArchitectureAnalysisNotFoundError(
            "Analysis not found.",
        ),
    )

    db = make_db()

    with (
        patch_architecture_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await generate_architecture(
            organization_id=10,
            repository_id=100,
            analysis_id=999,
            member=make_member(),
            db=db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Analysis not found."

    db.commit.assert_not_awaited()
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_generate_architecture_maps_incomplete_analysis_to_409() -> None:
    """Incomplete analysis should produce HTTP 409."""

    service = make_service()
    service.generate_architecture = AsyncMock(
        side_effect=ArchitectureAnalysisIncompleteError(
            "Architecture analysis requires a completed repository analysis.",
        ),
    )

    db = make_db()

    with (
        patch_architecture_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await generate_architecture(
            organization_id=10,
            repository_id=100,
            analysis_id=200,
            member=make_member(),
            db=db,
        )

    assert exc_info.value.status_code == 409
    assert (
        exc_info.value.detail
        == "Architecture analysis requires a completed "
        "repository analysis."
    )

    db.commit.assert_not_awaited()
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_generate_architecture_maps_missing_result_to_404() -> None:
    """Missing analysis result should produce HTTP 404."""

    service = make_service()
    service.generate_architecture = AsyncMock(
        side_effect=ArchitectureAnalysisResultNotFoundError(
            "Analysis result not found.",
        ),
    )

    db = make_db()

    with (
        patch_architecture_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await generate_architecture(
            organization_id=10,
            repository_id=100,
            analysis_id=200,
            member=make_member(),
            db=db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Analysis result not found."

    db.commit.assert_not_awaited()
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_generate_architecture_maps_duplicate_to_409() -> None:
    """Existing architecture should produce HTTP 409."""

    service = make_service()
    service.generate_architecture = AsyncMock(
        side_effect=ArchitectureAlreadyExistsError(
            "Architecture already exists for this analysis.",
        ),
    )

    db = make_db()

    with (
        patch_architecture_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await generate_architecture(
            organization_id=10,
            repository_id=100,
            analysis_id=200,
            member=make_member(),
            db=db,
        )

    assert exc_info.value.status_code == 409
    assert (
        exc_info.value.detail
        == "Architecture already exists for this analysis."
    )

    db.commit.assert_not_awaited()
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_generate_architecture_rolls_back_on_service_error() -> None:
    """
    Unexpected architecture service errors should roll back and
    propagate.
    """

    service = make_service()
    service.generate_architecture = AsyncMock(
        side_effect=ArchitectureServiceError(
            "Architecture graph is invalid.",
        ),
    )

    db = make_db()

    with (
        patch_architecture_service(service),
        pytest.raises(ArchitectureServiceError) as exc_info,
    ):
        await generate_architecture(
            organization_id=10,
            repository_id=100,
            analysis_id=200,
            member=make_member(),
            db=db,
        )

    assert str(exc_info.value) == "Architecture graph is invalid."

    db.commit.assert_not_awaited()
    db.rollback.assert_awaited_once()


# ---------------------------------------------------------------------------
# Get latest architecture
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_architecture_returns_latest_snapshot() -> None:
    """Get architecture should return the latest snapshot."""

    snapshot = make_snapshot()

    service = make_service()
    service.get_architecture = AsyncMock(
        return_value=snapshot,
    )

    with patch_architecture_service(service):
        result = await get_architecture(
            organization_id=10,
            repository_id=100,
            member=make_member(),
            db=make_db(),
        )

    assert result.id == snapshot.id
    assert result.snapshot_version == snapshot.snapshot_version

    service.get_architecture.assert_awaited_once_with(
        organization_id=10,
        repository_id=100,
    )


@pytest.mark.asyncio
async def test_get_architecture_maps_repository_not_found_to_404() -> None:
    """Missing repository should produce HTTP 404."""

    service = make_service()
    service.get_architecture = AsyncMock(
        side_effect=ArchitectureRepositoryNotFoundError(
            "Repository not found.",
        ),
    )

    with (
        patch_architecture_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_architecture(
            organization_id=10,
            repository_id=999,
            member=make_member(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."


@pytest.mark.asyncio
async def test_get_architecture_maps_missing_snapshot_to_404() -> None:
    """Missing architecture snapshot should produce HTTP 404."""

    service = make_service()
    service.get_architecture = AsyncMock(
        side_effect=ArchitectureSnapshotNotFoundError(
            "Architecture snapshot not found.",
        ),
    )

    with (
        patch_architecture_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_architecture(
            organization_id=10,
            repository_id=100,
            member=make_member(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Architecture snapshot not found."


# ---------------------------------------------------------------------------
# List architecture snapshots
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_architecture_snapshots_returns_snapshots() -> None:
    """Snapshot listing should serialize every returned snapshot."""

    snapshots = [
        make_snapshot(
            snapshot_id=1,
            snapshot_version=1,
        ),
        make_snapshot(
            snapshot_id=2,
            snapshot_version=2,
            analysis_result_id=201,
        ),
    ]

    service = make_service()
    service.list_snapshots = AsyncMock(
        return_value=snapshots,
    )

    with patch_architecture_service(service):
        result = await list_architecture_snapshots(
            organization_id=10,
            repository_id=100,
            member=make_member(),
            offset=10,
            limit=20,
            db=make_db(),
        )

    assert len(result) == 2
    assert result[0].id == 1
    assert result[0].snapshot_version == 1
    assert result[1].id == 2
    assert result[1].snapshot_version == 2

    service.list_snapshots.assert_awaited_once_with(
        organization_id=10,
        repository_id=100,
        offset=10,
        limit=20,
    )


@pytest.mark.asyncio
async def test_list_architecture_snapshots_returns_empty_list() -> None:
    """An empty architecture history should return an empty list."""

    service = make_service()
    service.list_snapshots = AsyncMock(
        return_value=[],
    )

    with patch_architecture_service(service):
        result = await list_architecture_snapshots(
            organization_id=10,
            repository_id=100,
            member=make_member(),
            offset=0,
            limit=20,
            db=make_db(),
        )

    assert result == []

    service.list_snapshots.assert_awaited_once_with(
        organization_id=10,
        repository_id=100,
        offset=0,
        limit=20,
    )


@pytest.mark.asyncio
async def test_list_architecture_snapshots_maps_repository_not_found_to_404() -> None:
    """Missing repository should produce HTTP 404."""

    service = make_service()
    service.list_snapshots = AsyncMock(
        side_effect=ArchitectureRepositoryNotFoundError(
            "Repository not found.",
        ),
    )

    with (
        patch_architecture_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await list_architecture_snapshots(
            organization_id=10,
            repository_id=999,
            member=make_member(),
            offset=0,
            limit=20,
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."


# ---------------------------------------------------------------------------
# Get individual architecture snapshot
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_architecture_snapshot_returns_snapshot() -> None:
    """Individual snapshot retrieval should return the requested snapshot."""

    snapshot = make_snapshot(
        snapshot_id=42,
        snapshot_version=3,
    )

    service = make_service()
    service.get_snapshot = AsyncMock(
        return_value=snapshot,
    )

    with patch_architecture_service(service):
        result = await get_architecture_snapshot(
            organization_id=10,
            repository_id=100,
            snapshot_id=42,
            member=make_member(),
            db=make_db(),
        )

    assert result.id == 42
    assert result.repository_id == 100
    assert result.snapshot_version == 3

    service.get_snapshot.assert_awaited_once_with(
        organization_id=10,
        repository_id=100,
        snapshot_id=42,
    )


@pytest.mark.asyncio
async def test_get_architecture_snapshot_maps_repository_not_found_to_404() -> None:
    """Missing repository should produce HTTP 404."""

    service = make_service()
    service.get_snapshot = AsyncMock(
        side_effect=ArchitectureRepositoryNotFoundError(
            "Repository not found.",
        ),
    )

    with (
        patch_architecture_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_architecture_snapshot(
            organization_id=10,
            repository_id=999,
            snapshot_id=1,
            member=make_member(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Repository not found."


@pytest.mark.asyncio
async def test_get_architecture_snapshot_maps_snapshot_not_found_to_404() -> None:
    """Missing snapshot should produce HTTP 404."""

    service = make_service()
    service.get_snapshot = AsyncMock(
        side_effect=ArchitectureSnapshotNotFoundError(
            "Architecture snapshot not found.",
        ),
    )

    with (
        patch_architecture_service(service),
        pytest.raises(HTTPException) as exc_info,
    ):
        await get_architecture_snapshot(
            organization_id=10,
            repository_id=100,
            snapshot_id=999,
            member=make_member(),
            db=make_db(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Architecture snapshot not found."