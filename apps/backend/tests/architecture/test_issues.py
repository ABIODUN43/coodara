"""
Tests for architecture issue detection.
"""

from __future__ import annotations

from app.analyzers.models import RepositoryMetricsSnapshot
from app.architecture.graph import (
    ArchitectureEdge,
    ArchitectureGraph,
    ArchitectureNode,
)
from app.architecture.issues import ArchitectureIssueDetector
from app.architecture.models import (
    ArchitectureIssueCategory,
    ArchitectureIssueSeverity,
)


def _graph(
    *,
    nodes: tuple[str, ...],
    edges: tuple[tuple[str, str], ...],
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


def test_detector_detects_dependency_hotspot() -> None:
    graph = _graph(
        nodes=(
            "service.py",
            *(
                f"module_{index}.py"
                for index in range(10)
            ),
        ),
        edges=tuple(
            (
                "service.py",
                f"module_{index}.py",
            )
            for index in range(10)
        ),
    )

    detector = ArchitectureIssueDetector()

    issues = detector.detect(
        graph=graph,
        metrics=RepositoryMetricsSnapshot(),
    )

    assert any(
        issue.category
        == ArchitectureIssueCategory.HIGH_COUPLING
        for issue in issues
    )

    assert any(
        issue.severity
        == ArchitectureIssueSeverity.HIGH
        for issue in issues
    )


def test_detector_detects_critical_dependency_hotspot() -> None:
    graph = _graph(
        nodes=(
            "service.py",
            *(
                f"module_{index}.py"
                for index in range(20)
            ),
        ),
        edges=tuple(
            (
                "service.py",
                f"module_{index}.py",
            )
            for index in range(20)
        ),
    )

    detector = ArchitectureIssueDetector()

    issues = detector.detect(
        graph=graph,
        metrics=RepositoryMetricsSnapshot(),
    )

    assert any(
        issue.category
        == ArchitectureIssueCategory.DEPENDENCY_HOTSPOT
        for issue in issues
    )

    assert any(
        issue.severity
        == ArchitectureIssueSeverity.CRITICAL
        for issue in issues
    )


def test_detector_detects_complexity_hotspot() -> None:
    detector = ArchitectureIssueDetector()

    issues = detector.detect(
        graph=_graph(
            nodes=("main.py",),
            edges=(),
        ),
        metrics=RepositoryMetricsSnapshot(
            complexity=15.0,
        ),
    )

    assert any(
        issue.category
        == ArchitectureIssueCategory.COMPLEXITY_HOTSPOT
        for issue in issues
    )


def test_detector_detects_large_repository() -> None:
    detector = ArchitectureIssueDetector()

    issues = detector.detect(
        graph=_graph(
            nodes=("main.py",),
            edges=(),
        ),
        metrics=RepositoryMetricsSnapshot(
            files=500,
        ),
    )

    assert any(
        issue.category
        == ArchitectureIssueCategory.LARGE_MODULE
        for issue in issues
    )


def test_detector_returns_no_issues_for_small_healthy_repository() -> None:
    detector = ArchitectureIssueDetector()

    issues = detector.detect(
        graph=_graph(
            nodes=("main.py", "service.py"),
            edges=(("main.py", "service.py"),),
        ),
        metrics=RepositoryMetricsSnapshot(
            files=10,
            complexity=5.0,
        ),
    )

    assert issues == ()