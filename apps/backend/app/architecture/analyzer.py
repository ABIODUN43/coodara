"""
Architecture intelligence analyzer.

Transforms the canonical repository analysis snapshot into an
immutable architecture intelligence snapshot.

The analyzer coordinates architecture-domain components:

    DependencyGraphSnapshot
            ↓
    ArchitectureGraph
            ↓
    ArchitectureScore
            ↓
    ArchitectureIssues
            ↓
    ArchitectureRecommendations
            ↓
    ArchitectureSnapshot

This module contains no database, HTTP, or AI infrastructure.
"""

from __future__ import annotations

from app.analyzers.models import AnalysisSnapshot
from app.architecture.graph import parse_dependency_graph
from app.architecture.issues import ArchitectureIssueDetector
from app.architecture.models import ArchitectureSnapshot
from app.architecture.recommendations import (
    ArchitectureRecommendationEngine,
)
from app.architecture.scoring import ArchitectureScorer


class ArchitectureAnalyzer:
    """
    Canonical architecture intelligence pipeline.

    The analyzer is deterministic: identical repository analysis
    snapshots produce identical architecture snapshots.
    """

    def __init__(
        self,
        *,
        scorer: ArchitectureScorer | None = None,
        issue_detector: ArchitectureIssueDetector | None = None,
        recommendation_engine: (
            ArchitectureRecommendationEngine | None
        ) = None,
    ) -> None:
        self.scorer = scorer or ArchitectureScorer()
        self.issue_detector = (
            issue_detector or ArchitectureIssueDetector()
        )
        self.recommendation_engine = (
            recommendation_engine
            or ArchitectureRecommendationEngine()
        )

    def analyze(
        self,
        snapshot: AnalysisSnapshot,
    ) -> ArchitectureSnapshot:
        """
        Transform repository analysis into architecture intelligence.

        A dependency graph is required for the MVP architecture layer.
        """

        if snapshot.dependency_graph is None:
            raise ValueError(
                "Architecture analysis requires a dependency graph.",
            )

        graph = parse_dependency_graph(
            snapshot.dependency_graph,
        )

        score = self.scorer.calculate(
            graph=graph,
            metrics=snapshot.metrics,
        )

        issues = self.issue_detector.detect(
            graph=graph,
            metrics=snapshot.metrics,
        )

        recommendations = self.recommendation_engine.generate(
            issues,
        )

        return ArchitectureSnapshot(
            version=graph.version,
            graph=graph,
            score=score,
            issues=issues,
            recommendations=recommendations,
        )