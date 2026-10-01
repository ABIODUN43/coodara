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


class TruthStatus(StrEnum):
    """
    Epistemic truth classification for architectural claims, metrics, and symbols.

    Invariants:
    1. OBSERVED: Directly established from repository files, AST, or commits.
    2. DERIVED: Deterministically calculated from observed evidence (e.g., BFS paths,
       transitive reachability, efferent coupling, Robert Martin instability).
    3. INFERRED: Reasoned architectural interpretation not directly observed (e.g.,
       architectural pattern applicability, likely coupling bottlenecks).
    4. UNKNOWN: Cannot be established from available static evidence (e.g., runtime
       traffic, execution frequency, team ownership without explicit CODEOWNERS/metadata).
    5. PROPOSED: Remediation or design entity recommended for creation/modification
       (e.g., proposed interface, adapter, protocol, refactor signature).

    CRITICAL RULES:
    - PROPOSED entities must NEVER be classified as OBSERVED.
    - Absence of evidence (e.g., missing ADRs) must NEVER be conflated with verified zero.
    - Absence of metadata (e.g., unassigned team) must be UNKNOWN, NEVER fabricated.
    """

    OBSERVED = "OBSERVED"
    DERIVED = "DERIVED"
    INFERRED = "INFERRED"
    UNKNOWN = "UNKNOWN"
    PROPOSED = "PROPOSED"


@dataclass(frozen=True, slots=True)
class TruthClaim:
    """
    An architectural claim bound to an explicit TruthStatus and evidence citation.
    """

    claim: str
    status: TruthStatus
    evidence_citation: str = ""
    rationale: str = ""

    @property
    def is_fact(self) -> bool:
        """Return True if the claim is directly observed from repository evidence."""
        return self.status == TruthStatus.OBSERVED

    @property
    def is_derived(self) -> bool:
        """Return True if the claim is mathematically derived from observed evidence."""
        return self.status == TruthStatus.DERIVED

    @property
    def is_proposed(self) -> bool:
        """Return True if the entity is a recommendation rather than existing code."""
        return self.status == TruthStatus.PROPOSED

    @property
    def is_unknown(self) -> bool:
        """Return True if the claim cannot be established from repository evidence."""
        return self.status == TruthStatus.UNKNOWN


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
    CIRCULAR_DEPENDENCY = "circular_dependency"
    LAYER_VIOLATION = "layer_violation"
    UNSTABLE_DEPENDENCY = "unstable_dependency"
    HUB_MODULE = "hub_module"


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