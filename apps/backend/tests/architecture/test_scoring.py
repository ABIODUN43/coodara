"""
Tests for architecture scoring.
"""

from __future__ import annotations

from app.analyzers.models import RepositoryMetricsSnapshot
from app.architecture.graph import (
    ArchitectureEdge,
    ArchitectureGraph,
    ArchitectureNode,
)
from app.architecture.scoring import ArchitectureScorer


def _graph(
    *,
    nodes: tuple[str, ...] = (),
    edges: tuple[tuple[str, str], ...] = (),
) -> ArchitectureGraph:
    return ArchitectureGraph(
        version=1,
        nodes=tuple(
            ArchitectureNode(id=node)
            for node in nodes
        ),
        edges=tuple(
            ArchitectureEdge(
                source=source,
                target=target,
            )
            for source, target in edges
        ),
    )


def test_scorer_returns_values_between_zero_and_one_hundred() -> None:
    scorer = ArchitectureScorer()

    result = scorer.calculate(
        graph=_graph(
            nodes=("a.py", "b.py", "c.py"),
            edges=(
                ("a.py", "b.py"),
                ("a.py", "c.py"),
            ),
        ),
        metrics=RepositoryMetricsSnapshot(
            complexity=5.0,
            maintainability=80.0,
        ),
    )

    assert 0 <= result.score <= 100
    assert 0 <= result.maintainability <= 100
    assert 0 <= result.coupling <= 100
    assert 0 <= result.cohesion <= 100
    assert 0 <= result.complexity <= 100


def test_scorer_is_deterministic() -> None:
    scorer = ArchitectureScorer()

    graph = _graph(
        nodes=("a.py", "b.py"),
        edges=(("a.py", "b.py"),),
    )

    metrics = RepositoryMetricsSnapshot(
        complexity=4.0,
        maintainability=85.0,
    )

    first = scorer.calculate(
        graph=graph,
        metrics=metrics,
    )

    second = scorer.calculate(
        graph=graph,
        metrics=metrics,
    )

    assert first == second


def test_scorer_handles_empty_graph() -> None:
    scorer = ArchitectureScorer()

    result = scorer.calculate(
        graph=_graph(),
        metrics=RepositoryMetricsSnapshot(),
    )

    assert result.coupling == 100.0
    assert result.cohesion == 100.0
    assert result.complexity == 100.0
    assert result.maintainability == 100.0
    assert result.score == 100.0


def test_scorer_handles_missing_metrics() -> None:
    scorer = ArchitectureScorer()

    result = scorer.calculate(
        graph=_graph(
            nodes=("a.py",),
        ),
        metrics=RepositoryMetricsSnapshot(
            complexity=None,
            maintainability=None,
        ),
    )

    assert result.complexity == 100.0
    assert result.maintainability == 100.0