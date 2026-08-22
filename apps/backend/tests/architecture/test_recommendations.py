"""
Tests for architecture recommendations.
"""

from __future__ import annotations

from app.architecture.models import (
    ArchitectureIssueCategory,
    ArchitectureIssueSeverity,
    ArchitectureIssueSnapshot,
    ArchitectureRecommendationPriority,
)
from app.architecture.recommendations import (
    ArchitectureRecommendationEngine,
)


def _issue(
    category: ArchitectureIssueCategory,
    severity: ArchitectureIssueSeverity = (
        ArchitectureIssueSeverity.HIGH
    ),
) -> ArchitectureIssueSnapshot:
    return ArchitectureIssueSnapshot(
        severity=severity,
        category=category,
        description="Test architecture issue.",
    )


def test_recommendation_engine_generates_recommendations() -> None:
    engine = ArchitectureRecommendationEngine()

    recommendations = engine.generate(
        (
            _issue(
                ArchitectureIssueCategory.HIGH_COUPLING,
            ),
        )
    )

    assert len(recommendations) == 1
    assert recommendations[0].priority == (
        ArchitectureRecommendationPriority.HIGH
    )
    assert recommendations[0].recommendation


def test_recommendation_engine_removes_duplicates() -> None:
    engine = ArchitectureRecommendationEngine()

    recommendations = engine.generate(
        (
            _issue(
                ArchitectureIssueCategory.HIGH_COUPLING,
            ),
            _issue(
                ArchitectureIssueCategory.HIGH_COUPLING,
            ),
        )
    )

    assert len(recommendations) == 1


def test_recommendation_engine_handles_multiple_issue_categories() -> None:
    engine = ArchitectureRecommendationEngine()

    recommendations = engine.generate(
        (
            _issue(
                ArchitectureIssueCategory.HIGH_COUPLING,
            ),
            _issue(
                ArchitectureIssueCategory.COMPLEXITY_HOTSPOT,
            ),
            _issue(
                ArchitectureIssueCategory.LARGE_MODULE,
                ArchitectureIssueSeverity.MEDIUM,
            ),
        )
    )

    assert len(recommendations) == 3