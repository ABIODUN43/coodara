"""
Architecture issue detection.

Detects deterministic architectural problems from the normalized
architecture graph and repository analysis metrics.

This module contains architecture-domain rules only. It does not
perform database access, HTTP handling, or AI inference.
"""

from __future__ import annotations

from app.analyzers.models import RepositoryMetricsSnapshot
from app.architecture.graph import ArchitectureGraph
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
            *self._detect_dependency_hotspots(graph),
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

        issues: list[ArchitectureIssueSnapshot] = []

        for node in graph.nodes:
            dependency_count = graph.outgoing_count(node.id)

            if dependency_count >= (
                self.CRITICAL_DEPENDENCY_HOTSPOT_THRESHOLD
            ):
                issues.append(
                    ArchitectureIssueSnapshot(
                        severity=ArchitectureIssueSeverity.CRITICAL,
                        category=(
                            ArchitectureIssueCategory
                            .DEPENDENCY_HOTSPOT
                        ),
                        description=(
                            f"Module '{node.id}' has "
                            f"{dependency_count} outgoing dependencies."
                        ),
                    )
                )

            elif dependency_count >= self.DEPENDENCY_HOTSPOT_THRESHOLD:
                issues.append(
                    ArchitectureIssueSnapshot(
                        severity=ArchitectureIssueSeverity.HIGH,
                        category=ArchitectureIssueCategory.HIGH_COUPLING,
                        description=(
                            f"Module '{node.id}' has "
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