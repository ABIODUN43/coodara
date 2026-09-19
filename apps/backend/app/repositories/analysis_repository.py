"""
Analysis persistence layer.

Responsible only for database operations involving repository
analysis jobs and their analysis results.

Transaction ownership belongs to the service/application layer.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.models.analysis import (
    AnalysisJob,
    AnalysisResult,
    AnalysisStatus,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class AnalysisRepository:
    """
    Data-access object for repository analysis persistence.

    This repository deliberately contains no business rules,
    authorization logic, HTTP concerns, GitHub integration,
    worker orchestration, or analysis logic.
    """

    def __init__(
        self,
        db: AsyncSession,
    ) -> None:
        self.db = db

    async def create(
        self,
        job: AnalysisJob,
    ) -> AnalysisJob:
        """
        Persist an analysis job without committing.
        """

        self.db.add(job)

        await self.db.flush()
        await self.db.refresh(job)

        return job

    async def get_by_id(
        self,
        analysis_id: int,
    ) -> AnalysisJob | None:
        """
        Retrieve an analysis job by primary key.
        """

        statement = select(AnalysisJob).where(
            AnalysisJob.id == analysis_id,
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def get_by_repository(
        self,
        *,
        repository_id: int,
        offset: int = 0,
        limit: int = 20,
    ) -> Sequence[AnalysisJob]:
        """
        Retrieve analysis jobs belonging to a repository.

        Results are ordered from newest to oldest.
        """

        statement = (
            select(AnalysisJob)
            .where(
                AnalysisJob.repository_id == repository_id,
            )
            .order_by(
                AnalysisJob.created_at.desc(),
                AnalysisJob.id.desc(),
            )
            .offset(offset)
            .limit(limit)
        )

        result = await self.db.execute(statement)

        return result.scalars().all()

    async def count_by_repository(
        self,
        *,
        repository_id: int,
    ) -> int:
        """
        Count analysis jobs belonging to a repository.
        """

        from sqlalchemy import func

        statement = select(
            func.count(AnalysisJob.id),
            ).where(
                AnalysisJob.repository_id == repository_id,
            )

        result = await self.db.execute(statement)

        return int(result.scalar_one())

    async def get_running(
        self,
        *,
        repository_id: int,
    ) -> AnalysisJob | None:
        """
        Retrieve the currently running analysis for a repository.

        Returns None when no running analysis exists.
        """

        statement = (
            select(AnalysisJob)
            .where(
                AnalysisJob.repository_id == repository_id,
                AnalysisJob.status == AnalysisStatus.RUNNING,
            )
            .order_by(
                AnalysisJob.created_at.desc(),
                AnalysisJob.id.desc(),
            )
            .limit(1)
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def get_active(
        self,
        *,
        repository_id: int,
    ) -> AnalysisJob | None:
        """
        Retrieve the newest active analysis for a repository.

        Active analyses are pending, queued, or currently running.
        """

        statement = (
            select(AnalysisJob)
            .where(
                AnalysisJob.repository_id == repository_id,
                AnalysisJob.status.in_(
                    (
                        AnalysisStatus.PENDING,
                        AnalysisStatus.QUEUED,
                        AnalysisStatus.RUNNING,
                    ),
                ),
            )
            .order_by(
                AnalysisJob.created_at.desc(),
                AnalysisJob.id.desc(),
            )
            .limit(1)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def update(
        self,
        job: AnalysisJob,
    ) -> AnalysisJob:
        """
        Flush changes to an existing analysis job.

        No transaction is committed here.
        """

        await self.db.flush()
        await self.db.refresh(job)

        return job

    async def create_result(
        self,
        result: AnalysisResult,
    ) -> AnalysisResult:
        """
        Persist an analysis result without committing.
        """

        self.db.add(result)

        await self.db.flush()
        await self.db.refresh(result)

        return result

    async def get_result_by_job(
        self,
        *,
        analysis_job_id: int,
    ) -> AnalysisResult | None:
        """
        Retrieve the analysis result belonging to a job.
        """

        statement = select(AnalysisResult).where(
            AnalysisResult.analysis_job_id == analysis_job_id,
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def delete_result(
        self,
        result: AnalysisResult,
    ) -> None:
        """
        Remove an existing analysis result.
        """

        await self.db.delete(result)
        await self.db.flush()

    async def update_result(
        self,
        result: AnalysisResult,
    ) -> AnalysisResult:
        """
        Flush changes to an existing analysis result.

        No transaction is committed here.
        """

        await self.db.flush()
        await self.db.refresh(result)

        return result