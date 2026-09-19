"""
Architecture issue detection.

Detects deterministic architectural problems from the normalized
architecture graph and repository analysis metrics.

This module contains architecture-domain rules only. It does not
perform database access, HTTP handling, or AI inference.
"""

from __future__ import annotations

from app.analyzers.models import RepositoryMetricsSnapshot
from app.architecture.cycles import TarjanCycleDetector
from app.architecture.graph import ArchitectureGraph
from app.architecture.metrics import RobertMartinMetricsEngine
from app.architecture.models import (
    ArchitectureIssueCategory,
    ArchitectureIssueSeverity,
    ArchitectureIssueSnapshot,
)


class ArchitectureIssueDetector:
    """
    Detect architectural issues from graph structure and repository
    metrics.

    Detection is deterministic: identical graph and metrics inputs
    always produce identical issues in the same order.
    """

    # Outgoing dependency counts below this value are not considered
    # problematic by the current MVP rules.
    DEPENDENCY_HOTSPOT_THRESHOLD = 10

    # At this level the dependency concentration becomes a concrete
    # dependency hotspot rather than merely high coupling.
    CRITICAL_DEPENDENCY_HOTSPOT_THRESHOLD = 20

    # Aggregate repository complexity threshold.
    COMPLEXITY_HOTSPOT_THRESHOLD = 10.0

    # Aggregate repository source-file threshold.
    LARGE_REPOSITORY_THRESHOLD = 300

    def __init__(
        self,
        *,
        cycle_detector: TarjanCycleDetector | None = None,
        metrics_engine: RobertMartinMetricsEngine | None = None,
    ) -> None:
        self._cycle_detector = cycle_detector or TarjanCycleDetector()
        self._metrics_engine = metrics_engine or RobertMartinMetricsEngine()

    def detect(
        self,
        *,
        graph: ArchitectureGraph,
        metrics: RepositoryMetricsSnapshot,
    ) -> tuple[ArchitectureIssueSnapshot, ...]:
        """
        Detect all supported architecture issues.

        The resulting collection is deterministic.
        """

        issues = [
            *self._detect_circular_dependencies(graph),
            *self._detect_dependency_hotspots(graph),
            *self._detect_hub_modules(graph),
            *self._detect_unstable_dependencies(graph),
            *self._detect_complexity_hotspot(metrics),
            *self._detect_large_repository(metrics),
        ]

        return tuple(
            sorted(
                issues,
                key=self._issue_sort_key,
            )
        )

    @staticmethod
    def _issue_sort_key(
        issue: ArchitectureIssueSnapshot,
    ) -> tuple[str, str, str]:
        """
        Return a deterministic ordering key.
        """

        return (
            issue.severity.value,
            issue.category.value,
            issue.description,
        )

    def _detect_circular_dependencies(
        self,
        graph: ArchitectureGraph,
    ) -> list[ArchitectureIssueSnapshot]:
        """Detect circular dependency loops using Tarjan's algorithm."""
        node_ids = [n.id for n in graph.nodes]
        edge_pairs = [(e.source, e.target) for e in graph.edges]
        cycles = self._cycle_detector.detect_cycles(
            node_ids,
            edge_pairs,
            max_total_cycles=50,
            max_cycles_per_scc=3,
        )

        issues: list[ArchitectureIssueSnapshot] = []
        for cycle in cycles[:50]:
            path_str = " -> ".join(f"'{p}'" for p in cycle.path)
            severity = (
                ArchitectureIssueSeverity.CRITICAL
                if cycle.length <= 2
                else ArchitectureIssueSeverity.HIGH
            )
            issues.append(
                ArchitectureIssueSnapshot(
                    severity=severity,
                    category=ArchitectureIssueCategory.CIRCULAR_DEPENDENCY,
                    description=f"Circular dependency detected: {path_str}.",
                )
            )
        return issues

    def _detect_hub_modules(
        self,
        graph: ArchitectureGraph,
    ) -> list[ArchitectureIssueSnapshot]:
        """Detect hub modules with high incoming and outgoing couplings."""
        node_ids = [n.id for n in graph.nodes]
        edge_pairs = [(e.source, e.target) for e in graph.edges]
        module_metrics = self._metrics_engine.compute_metrics(node_ids, edge_pairs)

        issues: list[ArchitectureIssueSnapshot] = []
        hub_modules = [m for m in module_metrics.values() if m.is_hub]
        hub_modules.sort(key=lambda m: (m.ca + m.ce), reverse=True)

        for m in hub_modules[:50]:
            issues.append(
                ArchitectureIssueSnapshot(
                    severity=ArchitectureIssueSeverity.HIGH,
                    category=ArchitectureIssueCategory.HUB_MODULE,
                    description=(
                        f"Architectural Hub: Module '{m.node_id}' has high afferent "
                        f"coupling (Ca={m.ca}) and high efferent coupling (Ce={m.ce})."
                    ),
                )
            )
        return issues

    def _detect_unstable_dependencies(
        self,
        graph: ArchitectureGraph,
    ) -> list[ArchitectureIssueSnapshot]:
        """Detect Stable Dependencies Principle violations."""
        node_ids = [n.id for n in graph.nodes]
        edge_pairs = [(e.source, e.target) for e in graph.edges]
        module_metrics = self._metrics_engine.compute_metrics(node_ids, edge_pairs)
        violations = self._metrics_engine.detect_unstable_dependencies(module_metrics, edge_pairs)

        issues: list[ArchitectureIssueSnapshot] = []
        for v in violations[:20]:
            issues.append(
                ArchitectureIssueSnapshot(
                    severity=ArchitectureIssueSeverity.MEDIUM,
                    category=ArchitectureIssueCategory.UNSTABLE_DEPENDENCY,
                    description=(
                        f"Unstable Dependency: Stable module '{v.source}' (I={v.source_instability:.2f}) "
                        f"depends on unstable module '{v.target}' (I={v.target_instability:.2f})."
                    ),
                )
            )
        return issues

    def _detect_dependency_hotspots(
        self,
        graph: ArchitectureGraph,
    ) -> list[ArchitectureIssueSnapshot]:
        """
        Detect modules with unusually high outgoing dependencies.

        MVP classification:

        10-19 outgoing dependencies
            -> HIGH severity / HIGH_COUPLING

        20+ outgoing dependencies
            -> CRITICAL severity / DEPENDENCY_HOTSPOT
        """

        outgoing_counts: dict[str, int] = {}
        for edge in graph.edges:
            outgoing_counts[edge.source] = outgoing_counts.get(edge.source, 0) + 1

        hotspots: list[tuple[str, int]] = []

        for node in graph.nodes:
            dependency_count = outgoing_counts.get(node.id, 0)
            if dependency_count >= self.DEPENDENCY_HOTSPOT_THRESHOLD:
                hotspots.append((node.id, dependency_count))

        # Sort by dependency concentration descending
        hotspots.sort(key=lambda item: item[1], reverse=True)

        issues: list[ArchitectureIssueSnapshot] = []
        for node_id, dependency_count in hotspots[:50]:
            if dependency_count >= self.CRITICAL_DEPENDENCY_HOTSPOT_THRESHOLD:
                issues.append(
                    ArchitectureIssueSnapshot(
                        severity=ArchitectureIssueSeverity.CRITICAL,
                        category=ArchitectureIssueCategory.DEPENDENCY_HOTSPOT,
                        description=(
                            f"Module '{node_id}' has "
                            f"{dependency_count} outgoing dependencies."
                        ),
                    )
                )
            else:
                issues.append(
                    ArchitectureIssueSnapshot(
                        severity=ArchitectureIssueSeverity.HIGH,
                        category=ArchitectureIssueCategory.HIGH_COUPLING,
                        description=(
                            f"Module '{node_id}' has "
                            f"{dependency_count} outgoing dependencies."
                        ),
                    )
                )

        return issues

    def _detect_complexity_hotspot(
        self,
        metrics: RepositoryMetricsSnapshot,
    ) -> list[ArchitectureIssueSnapshot]:
        """
        Detect repositories with high aggregate complexity.

        No complexity value means the signal is unavailable and
        therefore no complexity issue is produced.
        """

        complexity = metrics.complexity

        if complexity is None:
            return []

        if complexity < self.COMPLEXITY_HOTSPOT_THRESHOLD:
            return []

        severity = (
            ArchitectureIssueSeverity.HIGH
            if complexity < 20.0
            else ArchitectureIssueSeverity.CRITICAL
        )

        return [
            ArchitectureIssueSnapshot(
                severity=severity,
                category=ArchitectureIssueCategory.COMPLEXITY_HOTSPOT,
                description=(
                    "Repository complexity is high "
                    f"({complexity:.2f})."
                ),
            )
        ]

    def _detect_large_repository(
        self,
        metrics: RepositoryMetricsSnapshot,
    ) -> list[ArchitectureIssueSnapshot]:
        """
        Detect unusually large repositories.

        The current MVP uses source-file count as the available
        repository-size signal.
        """

        if metrics.files < self.LARGE_REPOSITORY_THRESHOLD:
            return []

        return [
            ArchitectureIssueSnapshot(
                severity=ArchitectureIssueSeverity.MEDIUM,
                category=ArchitectureIssueCategory.LARGE_MODULE,
                description=(
                    "Repository contains "
                    f"{metrics.files} source files."
                ),
            )
        ]