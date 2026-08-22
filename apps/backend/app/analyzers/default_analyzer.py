"""
Default repository analysis pipeline.

Composes the individual deterministic analyzers into the canonical
AnalysisSnapshot consumed by the application/persistence layer.

This module is the only analyzer-layer component responsible for
combining analyzer outputs.
"""

from __future__ import annotations

from app.analyzers.base import Analyzer
from app.analyzers.context import RepositoryContext
from app.analyzers.dependency_analyzer import DependencyAnalyzer
from app.analyzers.exceptions import AnalyzerExecutionError
from app.analyzers.metrics_analyzer import MetricsAnalyzer
from app.analyzers.models import (
    AnalysisSnapshot,
    DependencyGraphSnapshot,
    RepositoryMetricsSnapshot,
    TechnologySnapshot,
)
from app.analyzers.technology_analyzer import TechnologyAnalyzer


class DefaultAnalyzer(Analyzer[AnalysisSnapshot]):
    """
    Canonical repository analysis pipeline.

    The pipeline executes the concrete analyzers in a deterministic
    order and combines their outputs into one immutable
    AnalysisSnapshot.
    """

    name = "default"

    def __init__(
        self,
        *,
        metrics_analyzer: MetricsAnalyzer | None = None,
        technology_analyzer: TechnologyAnalyzer | None = None,
        dependency_analyzer: DependencyAnalyzer | None = None,
    ) -> None:
        self._metrics_analyzer = (
            metrics_analyzer or MetricsAnalyzer()
        )
        self._technology_analyzer = (
            technology_analyzer or TechnologyAnalyzer()
        )
        self._dependency_analyzer = (
            dependency_analyzer or DependencyAnalyzer()
        )

    def analyze(
        self,
        context: RepositoryContext,
    ) -> AnalysisSnapshot:
        """
        Execute all repository analyzers and combine their results.
        """

        try:
            metrics = self._metrics_analyzer.analyze(context)
            technologies = self._technology_analyzer.analyze(context)
            dependency_graph = self._dependency_analyzer.analyze(
                context,
            )
        except Exception as exc:
            raise AnalyzerExecutionError(
                "Default repository analysis pipeline failed.",
            ) from exc

        return AnalysisSnapshot(
            metrics=RepositoryMetricsSnapshot(
                loc=metrics.loc,
                files=metrics.files,
                classes=metrics.classes,
                functions=metrics.functions,
                complexity=metrics.complexity,
                maintainability=metrics.maintainability,
            ),
            technologies=tuple(
                TechnologySnapshot(
                    technology=technology.technology,
                    version=technology.version,
                    confidence_score=technology.confidence_score,
                )
                for technology in technologies
            ),
            dependency_graph=(
                DependencyGraphSnapshot(
                    graph_data=dependency_graph.graph_data,
                )
                if dependency_graph is not None
                else None
            ),
        )