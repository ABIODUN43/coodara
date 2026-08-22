"""
Internal domain models for repository analysis.

These models represent analysis output before it is persisted.
They deliberately have no dependency on SQLAlchemy, FastAPI,
GitHub clients, or database repositories.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class RepositoryMetricsSnapshot:
    """
    Metrics produced from one repository analysis.
    """

    loc: int = 0
    files: int = 0
    classes: int = 0
    functions: int = 0
    complexity: float | None = None
    maintainability: float | None = None


@dataclass(frozen=True, slots=True)
class TechnologySnapshot:
    """
    Technology detected in a repository.
    """

    technology: str
    version: str | None = None
    confidence_score: float = 0.0


@dataclass(frozen=True, slots=True)
class DependencyGraphSnapshot:
    """
    Dependency graph generated from repository analysis.

    The graph representation is intentionally kept as a string
    at this layer. The concrete serialization format can evolve
    independently from the analysis domain.
    """

    graph_data: str


@dataclass(frozen=True, slots=True)
class AnalysisSnapshot:
    """
    Complete immutable output of one repository analysis.

    This is the boundary between the analysis engine and the
    application/persistence layer.
    """

    summary: str | None = None

    metrics: RepositoryMetricsSnapshot = field(
        default_factory=RepositoryMetricsSnapshot,
    )

    technologies: tuple[TechnologySnapshot, ...] = ()

    dependency_graph: DependencyGraphSnapshot | None = None