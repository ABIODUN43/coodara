"""
Analysis execution application service.

Coordinates repository acquisition, analyzer execution, persistence,
and analysis-job lifecycle transitions.

This module is intentionally separate from AnalysisService:

AnalysisService
    -> API-facing analysis-job management

AnalysisExecutionService
    -> actual analysis execution
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.analysis.workspace import (
    RepositoryWorkspace,
    RepositoryWorkspaceError,
)
from app.analyzers.context import RepositoryContext
from app.analyzers.exceptions import AnalyzerExecutionError
from app.analyzers.models import AnalysisSnapshot
from app.analyzers.orchestrator import AnalysisOrchestrator
from app.models.analysis import (
    AnalysisJob,
    AnalysisResult,
    AnalysisStatus,
    DependencyGraph,
    DetectedTechnology,
    RepositoryMetrics,
)
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.repository_repository import RepositoryRepository
from sqlalchemy.ext.asyncio import AsyncSession


class AnalysisExecutionError(Exception):
    """Base exception for analysis execution failures."""


class AnalysisJobNotFoundError(AnalysisExecutionError):
    """Analysis job does not exist."""


class AnalysisExecutionService:
    """
    Executes one repository analysis job.

    Responsibilities:
    - validate the analysis job;
    - acquire the repository workspace;
    - execute analyzers;
    - validate the canonical analysis snapshot;
    - persist the immutable analysis snapshot;
    - update analysis lifecycle state.

    Transaction ownership remains outside this service.
    """

    def __init__(
        self,
        db: AsyncSession,
        orchestrator: AnalysisOrchestrator,
    ) -> None:
        self.analysis_repository = AnalysisRepository(db)
        self.repository_repository = RepositoryRepository(db)
        self.orchestrator = orchestrator

    async def execute(
        self,
        *,
        analysis_id: int,
    ) -> AnalysisJob:
        """
        Execute one analysis job.

        The caller owns the transaction commit/rollback.
        """

        job = await self.analysis_repository.get_by_id(
            analysis_id,
        )

        if job is None:
            raise AnalysisJobNotFoundError(
                "Analysis job not found.",
            )

        if job.status not in {
            AnalysisStatus.PENDING,
            AnalysisStatus.QUEUED,
        }:
            raise AnalysisExecutionError(
                f"Analysis job {analysis_id} cannot be executed "
                f"from status '{job.status.value}'.",
            )

        repository = await self.repository_repository.get_by_id(
            job.repository_id,
        )

        if repository is None:
            await self._mark_failed(
                job,
                "Repository no longer exists.",
            )

            raise AnalysisExecutionError(
                "Repository for analysis job no longer exists.",
            )

        await self._mark_running(job)

        try:
            with RepositoryWorkspace(
                clone_url=repository.clone_url,
                branch=repository.default_branch,
            ) as workspace:
                context = RepositoryContext(
                    root_path=workspace.repository_path,
                    repository_id=str(repository.id),
                )

                run = self.orchestrator.analyze(context)

                analysis_snapshot = self._build_snapshot(
                    run.results,
                )

                await self._persist_snapshot(
                    job=job,
                    snapshot=analysis_snapshot,
                )

        except AnalysisExecutionError as exc:
            """
            Preserve known execution-level errors.

            These errors already contain useful diagnostic information,
            such as an invalid analyzer pipeline producing zero or
            multiple AnalysisSnapshots.
            """

            await self._mark_failed(
                job,
                self._safe_error_message(exc),
            )

            raise

        except (
            RepositoryWorkspaceError,
            AnalyzerExecutionError,
            ValueError,
            OSError,
        ) as exc:
            """
            Convert expected lower-level failures into the public
            analysis execution error.
            """

            await self._mark_failed(
                job,
                self._safe_error_message(exc),
            )

            raise AnalysisExecutionError(
                "Repository analysis failed.",
            ) from exc

        except Exception as exc:
            """
            Protect the application boundary from unexpected failures.

            Internal exception details are intentionally not exposed
            through the public exception message.
            """

            await self._mark_failed(
                job,
                "Unexpected analysis execution failure.",
            )

            raise AnalysisExecutionError(
                "Unexpected analysis execution failure.",
            ) from exc

        await self._mark_completed(job)

        return job

    async def _persist_snapshot(
        self,
        *,
        job: AnalysisJob,
        snapshot: AnalysisSnapshot,
    ) -> AnalysisResult:
        """
        Persist one immutable analysis snapshot.

        The snapshot is converted into persistence models here,
        keeping SQLAlchemy out of the analyzer layer.
        """

        result = AnalysisResult(
            analysis_job_id=job.id,
            summary=snapshot.summary,
        )

        await self.analysis_repository.create_result(result)

        metrics = RepositoryMetrics(
            analysis_result_id=result.id,
            loc=snapshot.metrics.loc,
            files=snapshot.metrics.files,
            classes=snapshot.metrics.classes,
            functions=snapshot.metrics.functions,
            complexity=snapshot.metrics.complexity,
            maintainability=snapshot.metrics.maintainability,
        )

        result.metrics = metrics

        for technology in snapshot.technologies:
            result.technologies.append(
                DetectedTechnology(
                    technology=technology.technology,
                    version=technology.version,
                    confidence_score=technology.confidence_score,
                ),
            )

        if snapshot.dependency_graph is not None:
            result.dependency_graph = DependencyGraph(
                graph_data=snapshot.dependency_graph.graph_data,
            )

        await self.analysis_repository.update_result(result)

        return result

    @staticmethod
    def _build_snapshot(
        results: tuple[object, ...],
    ) -> AnalysisSnapshot:
        """
        Convert orchestrator results into the canonical snapshot.

        Exactly one AnalysisSnapshot must be produced by the
        configured analyzer pipeline.
        """

        snapshots = [
            result
            for result in results
            if isinstance(result, AnalysisSnapshot)
        ]

        if len(snapshots) != 1:
            raise AnalysisExecutionError(
                "Analyzer pipeline must produce exactly one "
                "AnalysisSnapshot.",
            )

        return snapshots[0]

    async def _mark_running(
        self,
        job: AnalysisJob,
    ) -> None:
        """
        Transition an analysis job into the running state.
        """

        job.status = AnalysisStatus.RUNNING
        job.progress = 10
        job.started_at = datetime.now(timezone.utc)
        job.error_message = None

        await self.analysis_repository.update(job)

    async def _mark_completed(
        self,
        job: AnalysisJob,
    ) -> None:
        """
        Transition an analysis job into the completed state.
        """

        job.status = AnalysisStatus.COMPLETED
        job.progress = 100
        job.completed_at = datetime.now(timezone.utc)
        job.error_message = None

        await self.analysis_repository.update(job)

    async def _mark_failed(
        self,
        job: AnalysisJob,
        message: str,
    ) -> None:
        """
        Transition an analysis job into the failed state.
        """

        job.status = AnalysisStatus.FAILED
        job.progress = 100
        job.completed_at = datetime.now(timezone.utc)
        job.error_message = message

        await self.analysis_repository.update(job)

    @staticmethod
    def _safe_error_message(
        exc: Exception,
    ) -> str:
        """
        Return a bounded, user-safe execution error.

        Internal exception chains are intentionally not exposed.
        """

        message = str(exc).strip()

        if not message:
            return "Analysis execution failed."

        return message[:2000]