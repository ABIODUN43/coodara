"""
Deterministic architecture recommendation engine.
"""

from __future__ import annotations

from app.architecture.models import (
    ArchitectureIssueCategory,
    ArchitectureIssueSnapshot,
    ArchitectureRecommendationPriority,
    ArchitectureRecommendationSnapshot,
)


class ArchitectureRecommendationEngine:
    """
    Convert detected architecture issues into actionable recommendations.
    """

    def generate(
        self,
        issues: tuple[ArchitectureIssueSnapshot, ...],
    ) -> tuple[ArchitectureRecommendationSnapshot, ...]:
        recommendations: list[
            ArchitectureRecommendationSnapshot
        ] = []

        seen: set[str] = set()

        for issue in issues:
            recommendation = self._recommend_for_issue(issue)

            if recommendation is None:
                continue

            if recommendation.recommendation in seen:
                continue

            seen.add(
                recommendation.recommendation,
            )

            recommendations.append(
                recommendation,
            )

        return tuple(recommendations)

    @staticmethod
    def _recommend_for_issue(
        issue: ArchitectureIssueSnapshot,
    ) -> ArchitectureRecommendationSnapshot | None:
        if issue.category == ArchitectureIssueCategory.HIGH_COUPLING:
            return ArchitectureRecommendationSnapshot(
                recommendation=(
                    "Review highly connected modules and introduce "
                    "clearer dependency boundaries."
                ),
                priority=ArchitectureRecommendationPriority.HIGH,
            )

        if issue.category == ArchitectureIssueCategory.DEPENDENCY_HOTSPOT:
            return ArchitectureRecommendationSnapshot(
                recommendation=(
                    "Reduce dependency concentration by separating "
                    "responsibilities and introducing stable module "
                    "boundaries."
                ),
                priority=ArchitectureRecommendationPriority.HIGH,
            )

        if issue.category == ArchitectureIssueCategory.COMPLEXITY_HOTSPOT:
            return ArchitectureRecommendationSnapshot(
                recommendation=(
                    "Investigate high-complexity areas and consider "
                    "decomposing large or complex responsibilities."
                ),
                priority=ArchitectureRecommendationPriority.HIGH,
            )

        if issue.category == ArchitectureIssueCategory.LARGE_MODULE:
            return ArchitectureRecommendationSnapshot(
                recommendation=(
                    "Review repository boundaries and consider "
                    "splitting large architectural areas into "
                    "smaller cohesive modules."
                ),
                priority=ArchitectureRecommendationPriority.MEDIUM,
            )

        if issue.category == ArchitectureIssueCategory.CIRCULAR_DEPENDENCY:
            return ArchitectureRecommendationSnapshot(
                recommendation=(
                    f"Break circular dependency loop ({issue.description}) "
                    "by applying Dependency Inversion (DIP) or extracting shared interfaces into a third module."
                ),
                priority=ArchitectureRecommendationPriority.HIGH,
            )

        if issue.category == ArchitectureIssueCategory.HUB_MODULE:
            return ArchitectureRecommendationSnapshot(
                recommendation=(
                    "Decompose architectural hub module into smaller single-responsibility "
                    "services and decouple inbound callers using event-driven interfaces."
                ),
                priority=ArchitectureRecommendationPriority.HIGH,
            )

        if issue.category == ArchitectureIssueCategory.UNSTABLE_DEPENDENCY:
            return ArchitectureRecommendationSnapshot(
                recommendation=(
                    "Align with Stable Dependencies Principle: invert dependency so stable core "
                    "does not depend on volatile implementations."
                ),
                priority=ArchitectureRecommendationPriority.MEDIUM,
            )

        if issue.category == ArchitectureIssueCategory.LAYER_VIOLATION:
            return ArchitectureRecommendationSnapshot(
                recommendation=(
                    "Enforce strict directional layer boundaries: presentation and controllers "
                    "must route domain operations through services rather than accessing data layers directly."
                ),
                priority=ArchitectureRecommendationPriority.HIGH,
            )

        return None