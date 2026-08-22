"""
Domain models for Architecture Intelligence.

These models contain architecture knowledge derived from
repository analysis.

They intentionally do not depend on SQLAlchemy, FastAPI,
or database infrastructure.

Architecture pipeline:

    Repository Analysis
            ↓
    Architecture Graph
            ↓
    Architecture Score
            ↓
    Architecture Issues
            ↓
    Architecture Recommendations
            ↓
    Architecture Snapshot
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class ArchitectureIssueSeverity(StrEnum):
    """
    Severity assigned to an architectural issue.
    """

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ArchitectureIssueCategory(StrEnum):
    """
    Category assigned to an architectural issue.
    """

    HIGH_COUPLING = "high_coupling"
    DEPENDENCY_HOTSPOT = "dependency_hotspot"
    COMPLEXITY_HOTSPOT = "complexity_hotspot"
    LARGE_MODULE = "large_module"


class ArchitectureRecommendationPriority(StrEnum):
    """
    Priority assigned to an architecture recommendation.
    """

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass(frozen=True, slots=True)
class ArchitectureNode:
    """
    One node in the architecture graph.

    A node normally represents a source module or file.
    """

    id: str
    type: str = "module"


@dataclass(frozen=True, slots=True)
class ArchitectureEdge:
    """
    One dependency relationship in the architecture graph.
    """

    source: str
    target: str
    kind: str = "import"


@dataclass(frozen=True, slots=True)
class ArchitectureGraph:
    """
    Normalized architecture dependency graph.

    The graph is derived from the dependency graph produced
    by repository analysis.

    Nodes and edges are immutable and deterministically ordered.
    """

    version: int
    nodes: tuple[ArchitectureNode, ...]
    edges: tuple[ArchitectureEdge, ...]

    @property
    def node_count(self) -> int:
        """Return the number of nodes."""

        return len(self.nodes)

    @property
    def edge_count(self) -> int:
        """Return the number of edges."""

        return len(self.edges)

    def incoming_count(
        self,
        node_id: str,
    ) -> int:
        """
        Return the number of dependencies pointing to a node.
        """

        return sum(
            edge.target == node_id
            for edge in self.edges
        )

    def outgoing_count(
        self,
        node_id: str,
    ) -> int:
        """
        Return the number of dependencies originating from a node.
        """

        return sum(
            edge.source == node_id
            for edge in self.edges
        )


@dataclass(frozen=True, slots=True)
class ArchitectureScoreSnapshot:
    """
    Deterministic architecture health score.

    All values use a 0-100 scale where higher is better.
    """

    score: float
    maintainability: float
    coupling: float
    cohesion: float
    complexity: float


@dataclass(frozen=True, slots=True)
class ArchitectureIssueSnapshot:
    """
    One architecture issue detected during analysis.
    """

    severity: ArchitectureIssueSeverity
    category: ArchitectureIssueCategory
    description: str


@dataclass(frozen=True, slots=True)
class ArchitectureRecommendationSnapshot:
    """
    One deterministic architecture improvement recommendation.
    """

    recommendation: str
    priority: ArchitectureRecommendationPriority


@dataclass(frozen=True, slots=True)
class ArchitectureSnapshot:
    """
    Complete architecture intelligence output produced from
    one completed repository analysis.

    This is the domain boundary between architecture computation
    and persistence.
    """

    version: int
    graph: ArchitectureGraph
    score: ArchitectureScoreSnapshot

    issues: tuple[
        ArchitectureIssueSnapshot,
        ...,
    ] = field(
        default_factory=tuple,
    )

    recommendations: tuple[
        ArchitectureRecommendationSnapshot,
        ...,
    ] = field(
        default_factory=tuple,
    )