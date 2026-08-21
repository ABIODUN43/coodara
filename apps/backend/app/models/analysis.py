"""
Repository analysis database models.

Represents analysis jobs, analysis results, repository metrics,
detected technologies, and dependency graphs generated from
repository analysis.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from app.db.base import Base
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.repository import Repository


class AnalysisStatus(StrEnum):
    """
    Lifecycle states for a repository analysis job.
    """

    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AnalysisJob(Base):
    """
    Represents one repository analysis execution.

    An analysis job belongs to a repository. Organizational ownership
    is inherited through the repository relationship.
    """

    __tablename__ = "analysis_jobs"

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

    status: Mapped[AnalysisStatus] = mapped_column(
        SQLEnum(
            AnalysisStatus,
            name="analysis_status",
            native_enum=True,
            validate_strings=True,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=AnalysisStatus.PENDING,
        server_default=AnalysisStatus.PENDING.value,
        index=True,
    )

    progress: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
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
        back_populates="analysis_jobs",
    )

    result: Mapped[AnalysisResult | None] = relationship(
        "AnalysisResult",
        back_populates="job",
        cascade="all, delete-orphan",
        uselist=False,
    )

    def __repr__(self) -> str:
        return (
            f"AnalysisJob("
            f"id={self.id}, "
            f"repository_id={self.repository_id}, "
            f"status={self.status.value!r}, "
            f"progress={self.progress}"
            f")"
        )


class AnalysisResult(Base):
    """
    Stores the structured output produced by an analysis job.

    A result represents one immutable analysis snapshot and therefore
    belongs to exactly one analysis job.
    """

    __tablename__ = "analysis_results"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    analysis_job_id: Mapped[int] = mapped_column(
        ForeignKey(
            "analysis_jobs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    job: Mapped[AnalysisJob] = relationship(
        "AnalysisJob",
        back_populates="result",
    )

    metrics: Mapped[RepositoryMetrics | None] = relationship(
        "RepositoryMetrics",
        back_populates="result",
        cascade="all, delete-orphan",
        uselist=False,
    )

    technologies: Mapped[list[DetectedTechnology]] = relationship(
        "DetectedTechnology",
        back_populates="result",
        cascade="all, delete-orphan",
    )

    dependency_graph: Mapped[DependencyGraph | None] = relationship(
        "DependencyGraph",
        back_populates="result",
        cascade="all, delete-orphan",
        uselist=False,
    )

    def __repr__(self) -> str:
        return (
            f"AnalysisResult("
            f"id={self.id}, "
            f"analysis_job_id={self.analysis_job_id}"
            f")"
        )


class RepositoryMetrics(Base):
    """
    Stores repository metrics for one analysis snapshot.
    """

    __tablename__ = "repository_metrics"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
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

    loc: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    files: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    classes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    functions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    complexity: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    maintainability: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    result: Mapped[AnalysisResult] = relationship(
        "AnalysisResult",
        back_populates="metrics",
    )

    def __repr__(self) -> str:
        return (
            f"RepositoryMetrics("
            f"id={self.id}, "
            f"analysis_result_id={self.analysis_result_id}"
            f")"
        )


class DetectedTechnology(Base):
    """
    Stores a technology detected during one analysis snapshot.
    """

    __tablename__ = "detected_technologies"

    __table_args__ = (
        UniqueConstraint(
            "analysis_result_id",
            "technology",
            name="uq_detected_technology_result_technology",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    analysis_result_id: Mapped[int] = mapped_column(
        ForeignKey(
            "analysis_results.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    technology: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    version: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    confidence_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    result: Mapped[AnalysisResult] = relationship(
        "AnalysisResult",
        back_populates="technologies",
    )

    def __repr__(self) -> str:
        return (
            f"DetectedTechnology("
            f"id={self.id}, "
            f"analysis_result_id={self.analysis_result_id}, "
            f"technology={self.technology!r}"
            f")"
        )


class DependencyGraph(Base):
    """
    Stores the dependency graph generated for one analysis snapshot.
    """

    __tablename__ = "dependency_graphs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
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

    graph_data: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    result: Mapped[AnalysisResult] = relationship(
        "AnalysisResult",
        back_populates="dependency_graph",
    )

    def __repr__(self) -> str:
        return (
            f"DependencyGraph("
            f"id={self.id}, "
            f"analysis_result_id={self.analysis_result_id}"
            f")"
        )