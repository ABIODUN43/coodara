"""
Tests for the canonical Architecture Intelligence analyzer.
"""

from __future__ import annotations

import json

import pytest
from app.analyzers.models import (
    AnalysisSnapshot,
    DependencyGraphSnapshot,
    RepositoryMetricsSnapshot,
)
from app.architecture.analyzer import ArchitectureAnalyzer
from app.architecture.models import ArchitectureSnapshot


def _analysis_snapshot() -> AnalysisSnapshot:
    graph = {
        "version": 1,
        "nodes": [
            {
                "id": "app/main.py",
                "type": "module",
            },
            {
                "id": "app/service.py",
                "type": "module",
            },
        ],
        "edges": [
            {
                "source": "app/main.py",
                "target": "app/service.py",
                "kind": "import",
            },
        ],
    }

    return AnalysisSnapshot(
        metrics=RepositoryMetricsSnapshot(
            loc=100,
            files=2,
            classes=2,
            functions=5,
            complexity=5.0,
            maintainability=85.0,
        ),
        dependency_graph=DependencyGraphSnapshot(
            graph_data=json.dumps(
                graph,
                sort_keys=True,
            ),
        ),
    )


def test_architecture_analyzer_produces_complete_snapshot() -> None:
    analyzer = ArchitectureAnalyzer()

    result = analyzer.analyze(
        _analysis_snapshot(),
    )

    assert isinstance(
        result,
        ArchitectureSnapshot,
    )

    assert result.version == 1

    assert result.graph.version == 1
    assert result.graph.node_count == 2
    assert result.graph.edge_count == 1

    assert 0 <= result.score.score <= 100

    assert isinstance(
        result.issues,
        tuple,
    )

    assert isinstance(
        result.recommendations,
        tuple,
    )


def test_architecture_analyzer_is_deterministic() -> None:
    analyzer = ArchitectureAnalyzer()

    snapshot = _analysis_snapshot()

    first = analyzer.analyze(snapshot)
    second = analyzer.analyze(snapshot)

    assert first == second


def test_architecture_analyzer_rejects_missing_dependency_graph() -> None:
    analyzer = ArchitectureAnalyzer()

    snapshot = AnalysisSnapshot(
        metrics=RepositoryMetricsSnapshot(),
        dependency_graph=None,
    )

    with pytest.raises(ValueError, match="dependency graph"):
        analyzer.analyze(snapshot)