"""
Repository analysis application service.

Responsible for analysis business workflows.

This service owns:
- Analysis creation.
- Organization/repository ownership enforcement.
- Active-analysis detection.
- Analysis retrieval.
- Analysis listing.
- Analysis-result retrieval.

This service does not own:
- FastAPI request handling.
- SQL construction.
- GitHub HTTP implementation.
- Database transaction commits.
- Actual repository analysis execution.
- Background worker orchestration.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.models.analysis import AnalysisJob, AnalysisResult, AnalysisStatus
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.repository_repository import RepositoryRepository
from app.services.repository_service import RepositoryNotFoundError
from sqlalchemy.ext.asyncio import AsyncSession


class AnalysisServiceError(Exception):
    """Base exception for analysis service failures."""


class AnalysisNotFoundError(AnalysisServiceError):
    """Analysis does not exist in the repository."""


class AnalysisAlreadyActiveError(AnalysisServiceError):
    """Repository already has an active analysis."""


class AnalysisResultNotFoundError(AnalysisServiceError):
    """Analysis result does not exist."""


class AnalysisService:
    """
    Application service for repository analysis workflows.
    """

    def __init__(
        self,
        db: AsyncSession,
    ) -> None:
        self.analysis_repository = AnalysisRepository(db)
        self.repository_repository = RepositoryRepository(db)

    async def create_analysis(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> AnalysisJob:
        """
        Create a new analysis job for an organization-owned repository.

        No transaction is committed here.
        """

        repository = (
            await self.repository_repository.get_by_organization_and_id(
                organization_id=organization_id,
                repository_id=repository_id,
            )
        )

        if repository is None:
            raise RepositoryNotFoundError(
                "Repository not found.",
            )

        active_analysis = await self.analysis_repository.get_active(
            repository_id=repository_id,
        )

        if active_analysis is not None:
            now = datetime.now(timezone.utc)
            created_at = active_analysis.created_at
            if created_at is not None:
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                age_seconds = (now - created_at).total_seconds()
            else:
                age_seconds = 0

            # If the active job is stale (older than 3 minutes, or pending > 60s), mark it failed to allow re-analysis
            if age_seconds > 180 or (active_analysis.status == AnalysisStatus.PENDING and age_seconds > 45):
                active_analysis.status = AnalysisStatus.FAILED
                active_analysis.error_message = "Analysis timed out or was superseded."
                active_analysis.completed_at = now
                await self.analysis_repository.update(active_analysis)
            else:
                raise AnalysisAlreadyActiveError(
                    "Repository already has an active analysis.",
                )

        job = AnalysisJob(
            repository_id=repository_id,
        )

        return await self.analysis_repository.create(job)

    async def get_analysis(
        self,
        *,
        organization_id: int,
        repository_id: int,
        analysis_id: int,
    ) -> AnalysisJob:
        """
        Retrieve an analysis belonging to an organization-owned repository.
        """

        repository = (
            await self.repository_repository.get_by_organization_and_id(
                organization_id=organization_id,
                repository_id=repository_id,
            )
        )

        if repository is None:
            raise RepositoryNotFoundError(
                "Repository not found.",
            )

        analysis = await self.analysis_repository.get_by_id(
            analysis_id,
        )

        if (
            analysis is None
            or analysis.repository_id != repository_id
        ):
            raise AnalysisNotFoundError(
                "Analysis not found.",
            )

        return analysis

    async def list_analyses(
        self,
        *,
        organization_id: int,
        repository_id: int,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[AnalysisJob], int]:
        """
        List analyses belonging to an organization-owned repository.
        """

        if page < 1:
            raise ValueError(
                "page must be greater than or equal to 1.",
            )

        if per_page < 1:
            raise ValueError(
                "per_page must be greater than or equal to 1.",
            )

        if per_page > 100:
            raise ValueError(
                "per_page must be less than or equal to 100.",
            )

        repository = (
            await self.repository_repository.get_by_organization_and_id(
                organization_id=organization_id,
                repository_id=repository_id,
            )
        )

        if repository is None:
            raise RepositoryNotFoundError(
                "Repository not found.",
            )

        offset = (page - 1) * per_page

        analyses = await self.analysis_repository.get_by_repository(
            repository_id=repository_id,
            offset=offset,
            limit=per_page,
        )

        total = await self.analysis_repository.count_by_repository(
            repository_id=repository_id,
        )

        return list(analyses), total

    async def get_analysis_result(
        self,
        *,
        organization_id: int,
        repository_id: int,
        analysis_id: int,
    ) -> AnalysisResult:
        """
        Retrieve the result belonging to an organization-owned analysis.
        """

        await self.get_analysis(
            organization_id=organization_id,
            repository_id=repository_id,
            analysis_id=analysis_id,
        )

        result = await self.analysis_repository.get_result_by_job(
            analysis_job_id=analysis_id,
        )

        if result is None:
            raise AnalysisResultNotFoundError(
                "Analysis result not found.",
            )

        return result