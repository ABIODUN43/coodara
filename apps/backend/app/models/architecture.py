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