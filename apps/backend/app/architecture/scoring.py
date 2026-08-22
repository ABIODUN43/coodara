"""
Deterministic architecture health scoring.

The MVP scoring engine deliberately contains no AI.

Scores are derived from observable repository-analysis signals so
that the same repository state produces the same architecture score.
"""

from __future__ import annotations

from app.analyzers.models import RepositoryMetricsSnapshot
from app.architecture.graph import ArchitectureGraph
from app.architecture.models import ArchitectureScoreSnapshot


class ArchitectureScorer:
    """
    Calculate deterministic architecture health metrics.

    Every metric is normalized to a 0-100 scale.
    """

    def calculate(
        self,
        *,
        graph: ArchitectureGraph,
        metrics: RepositoryMetricsSnapshot,
    ) -> ArchitectureScoreSnapshot:
        """
        Calculate the architecture health score.
        """

        maintainability = self._maintainability_score(
            metrics.maintainability,
        )

        coupling = self._coupling_score(
            graph,
        )

        cohesion = self._cohesion_score(
            graph,
        )

        complexity = self._complexity_score(
            metrics.complexity,
        )

        score = self._overall_score(
            maintainability=maintainability,
            coupling=coupling,
            cohesion=cohesion,
            complexity=complexity,
        )

        return ArchitectureScoreSnapshot(
            score=score,
            maintainability=maintainability,
            coupling=coupling,
            cohesion=cohesion,
            complexity=complexity,
        )

    @staticmethod
    def _maintainability_score(
        maintainability: float | None,
    ) -> float:
        if maintainability is None:
            return 100.0

        return _clamp(
            maintainability,
            0.0,
            100.0,
        )

    @staticmethod
    def _complexity_score(
        complexity: float | None,
    ) -> float:
        if complexity is None:
            return 100.0

        if complexity <= 1:
            return 100.0

        return _clamp(
            100.0 - ((complexity - 1.0) * 5.0),
            0.0,
            100.0,
        )

    @staticmethod
    def _coupling_score(
        graph: ArchitectureGraph,
    ) -> float:
        if graph.node_count == 0:
            return 100.0

        average_dependencies = (
            graph.edge_count / graph.node_count
        )

        return _clamp(
            100.0 - (average_dependencies * 10.0),
            0.0,
            100.0,
        )

    @staticmethod
    def _cohesion_score(
        graph: ArchitectureGraph,
    ) -> float:
        """
        MVP cohesion proxy.

        A graph with fewer isolated modules receives a higher score.
        """

        if graph.node_count == 0:
            return 100.0

        connected_nodes = {
            edge.source
            for edge in graph.edges
        } | {
            edge.target
            for edge in graph.edges
        }

        ratio = len(connected_nodes) / graph.node_count

        return _clamp(
            ratio * 100.0,
            0.0,
            100.0,
        )

    @staticmethod
    def _overall_score(
        *,
        maintainability: float,
        coupling: float,
        cohesion: float,
        complexity: float,
    ) -> float:
        return round(
            (
                maintainability
                + coupling
                + cohesion
                + complexity
            )
            / 4.0,
            2,
        )


def _clamp(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    """Clamp a value to an inclusive range."""

    return max(
        minimum,
        min(value, maximum),
    )