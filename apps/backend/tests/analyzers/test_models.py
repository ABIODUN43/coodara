from app.analyzers.models import (
    AnalysisSnapshot,
    DependencyGraphSnapshot,
    RepositoryMetricsSnapshot,
    TechnologySnapshot,
)


def test_analysis_snapshot_has_empty_defaults() -> None:
    snapshot = AnalysisSnapshot()

    assert snapshot.summary is None
    assert snapshot.metrics.loc == 0
    assert snapshot.metrics.files == 0
    assert snapshot.metrics.classes == 0
    assert snapshot.metrics.functions == 0
    assert snapshot.technologies == ()
    assert snapshot.dependency_graph is None


def test_repository_metrics_snapshot_stores_metrics() -> None:
    metrics = RepositoryMetricsSnapshot(
        loc=1_000,
        files=20,
        classes=10,
        functions=50,
        complexity=4.5,
        maintainability=82.0,
    )

    assert metrics.loc == 1_000
    assert metrics.files == 20
    assert metrics.classes == 10
    assert metrics.functions == 50
    assert metrics.complexity == 4.5
    assert metrics.maintainability == 82.0


def test_technology_snapshot_stores_detection() -> None:
    technology = TechnologySnapshot(
        technology="FastAPI",
        version="0.116.1",
        confidence_score=0.98,
    )

    assert technology.technology == "FastAPI"
    assert technology.version == "0.116.1"
    assert technology.confidence_score == 0.98


def test_dependency_graph_snapshot_stores_graph_data() -> None:
    graph = DependencyGraphSnapshot(
        graph_data='{"nodes": [], "edges": []}',
    )

    assert graph.graph_data == '{"nodes": [], "edges": []}'


def test_analysis_snapshot_is_immutable() -> None:
    snapshot = AnalysisSnapshot()

    try:
        snapshot.summary = "changed"  # type: ignore[misc]
    except AttributeError:
        pass
    else:
        raise AssertionError(
            "AnalysisSnapshot should be immutable.",
        )