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

        return None