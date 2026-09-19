"""
Architecture Intelligence database models.

Architecture data is derived from completed repository analyses.

Persistence hierarchy:

    Repository
        ↓
    ArchitectureSnapshot
        ├── ArchitectureScore
        ├── ArchitectureIssue
        └── ArchitectureRecommendation

Every architecture snapshot is linked to the AnalysisResult
that produced it, providing provenance and reproducibility.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from app.db.base import Base
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.analysis import AnalysisResult
    from app.models.repository import Repository


class ArchitectureSnapshot(Base):
    """
    Immutable architecture representation generated from one
    completed analysis result.
    """

    __tablename__ = "architecture_snapshots"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    repository_id: Mapped[int] = mapped_column(
        ForeignKey(
            "repositories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    analysis_result_id: Mapped[int] = mapped_column(
        ForeignKey(
            "analysis_results.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    snapshot_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    graph: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    repository: Mapped[Repository] = relationship(
        "Repository",
        back_populates="architecture_snapshots",
    )

    analysis_result: Mapped[AnalysisResult] = relationship(
        "AnalysisResult",
        back_populates="architecture_snapshot",
    )

    score: Mapped[ArchitectureScore | None] = relationship(
        "ArchitectureScore",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        uselist=False,
    )

    issues: Mapped[list[ArchitectureIssue]] = relationship(
        "ArchitectureIssue",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )

    recommendations: Mapped[
        list[ArchitectureRecommendation]
    ] = relationship(
        "ArchitectureRecommendation",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"ArchitectureSnapshot("
            f"id={self.id}, "
            f"repository_id={self.repository_id}, "
            f"analysis_result_id={self.analysis_result_id}"
            f")"
        )


class ArchitectureScore(Base):
    """
    Architecture health metrics for one architecture snapshot.
    """

    __tablename__ = "architecture_scores"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    architecture_snapshot_id: Mapped[int] = mapped_column(
        ForeignKey(
            "architecture_snapshots.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    maintainability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    coupling: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    cohesion: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    complexity: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    snapshot: Mapped[ArchitectureSnapshot] = relationship(
        "ArchitectureSnapshot",
        back_populates="score",
    )

    def __repr__(self) -> str:
        return (
            f"ArchitectureScore("
            f"id={self.id}, "
            f"architecture_snapshot_id="
            f"{self.architecture_snapshot_id}, "
            f"score={self.score}"
            f")"
        )


class ArchitectureIssue(Base):
    """
    Architectural problem detected for one snapshot.
    """

    __tablename__ = "architecture_issues"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    architecture_snapshot_id: Mapped[int] = mapped_column(
        ForeignKey(
            "architecture_snapshots.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="open",
        server_default="open",
    )

    dismissed_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    snapshot: Mapped[ArchitectureSnapshot] = relationship(
        "ArchitectureSnapshot",
        back_populates="issues",
    )

    def __repr__(self) -> str:
        return (
            f"ArchitectureIssue("
            f"id={self.id}, "
            f"architecture_snapshot_id="
            f"{self.architecture_snapshot_id}, "
            f"severity={self.severity!r}, "
            f"category={self.category!r}"
            f")"
        )


class ArchitectureRecommendation(Base):
    """
    Architecture improvement recommendation for one snapshot.
    """

    __tablename__ = "architecture_recommendations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    architecture_snapshot_id: Mapped[int] = mapped_column(
        ForeignKey(
            "architecture_snapshots.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    recommendation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    priority: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="open",
        server_default="open",
    )

    action_plan: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    snapshot: Mapped[ArchitectureSnapshot] = relationship(
        "ArchitectureSnapshot",
        back_populates="recommendations",
    )

    def __repr__(self) -> str:
        return (
            f"ArchitectureRecommendation("
            f"id={self.id}, "
            f"architecture_snapshot_id="
            f"{self.architecture_snapshot_id}, "
            f"priority={self.priority!r}"
            f")"
        )


class ArchitectureDecision(Base):
    """
    Architectural Decision Record (ADR) persisted for a repository.
    """

    __tablename__ = "architecture_decisions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    repository_id: Mapped[int] = mapped_column(
        ForeignKey(
            "repositories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    adr_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="accepted",
        server_default="accepted",
    )

    decision_date: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    author: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Architect",
        server_default="Architect",
    )

    context: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    decision: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    consequences: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="[]",
        server_default="[]",
    )

    affected_components: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="[]",
        server_default="[]",
    )

    tags: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="[]",
        server_default="[]",
    )

    source_file: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    repository: Mapped[Repository] = relationship(
        "Repository",
        back_populates="architecture_decisions",
    )

    def __repr__(self) -> str:
        return (
            f"ArchitectureDecision("
            f"id={self.id}, "
            f"repository_id={self.repository_id}, "
            f"adr_number={self.adr_number!r}, "
            f"title={self.title!r}"
            f")"
        )


class ArchitectureRule(Base):
    """
    User-defined or system-enforced custom boundary and structural policy rule.
    """

    __tablename__ = "architecture_rules"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    repository_id: Mapped[int] = mapped_column(
        ForeignKey(
            "repositories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    rule_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="disallow_dependency",
        server_default="disallow_dependency",
    )

    source_pattern: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    target_pattern: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="critical",
        server_default="critical",
    )

    rationale: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    repository: Mapped[Repository] = relationship(
        "Repository",
        back_populates="architecture_rules",
    )

    def __repr__(self) -> str:
        return (
            f"ArchitectureRule("
            f"id={self.id}, "
            f"repository_id={self.repository_id}, "
            f"name={self.name!r}, "
            f"rule_type={self.rule_type!r}"
            f")"
        )


class ArchitectureSimulation(Base):
    """
    Persisted simulation experiment in the architectural prediction ledger.
    """

    __tablename__ = "architecture_simulations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    simulation_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )

    repository_id: Mapped[int] = mapped_column(
        ForeignKey(
            "repositories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    commit_sha: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="HEAD",
        server_default="HEAD",
    )

    user_request: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    normalized_intervention: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Refactor",
        server_default="Refactor",
    )

    target_entities: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="[]",
        server_default="[]",
    )

    hypothetical_changes: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="{}",
        server_default="{}",
    )

    predicted_impacts: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="{}",
        server_default="{}",
    )

    evidence: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="[]",
        server_default="[]",
    )

    confidence: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="HIGH",
        server_default="HIGH",
    )

    alternatives: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="[]",
        server_default="[]",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    repository: Mapped[Repository] = relationship(
        "Repository",
        back_populates="architecture_simulations",
    )

    def __repr__(self) -> str:
        return (
            f"ArchitectureSimulation("
            f"id={self.id}, "
            f"simulation_id={self.simulation_id!r}, "
            f"repository_id={self.repository_id}, "
            f"normalized_intervention={self.normalized_intervention!r}"
            f")"
        )