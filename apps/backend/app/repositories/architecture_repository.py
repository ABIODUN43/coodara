"""
Architecture Intelligence persistence layer.

Responsible only for database operations involving
architecture snapshots and their derived results.

Business rules belong to ArchitectureService.
Architecture computation belongs to ArchitectureAnalyzer.
Transaction ownership belongs to the application/service layer.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.models.architecture import (
    ArchitectureIssue,
    ArchitectureRecommendation,
    ArchitectureScore,
    ArchitectureSnapshot,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class ArchitectureRepository:
    """
    Data-access layer for Architecture Intelligence persistence.

    This repository deliberately contains no:
    - business rules;
    - authorization logic;
    - HTTP concerns;
    - architecture analysis;
    - AI inference;
    - transaction commits.
    """

    def __init__(
        self,
        db: AsyncSession,
    ) -> None:
        self.db = db

    async def create_snapshot(
        self,
        snapshot: ArchitectureSnapshot,
    ) -> ArchitectureSnapshot:
        """
        Persist an architecture snapshot without committing.
        """

        self.db.add(snapshot)

        await self.db.flush()
        await self.db.refresh(snapshot)

        return snapshot

    async def get_by_id(
        self,
        snapshot_id: int,
    ) -> ArchitectureSnapshot | None:
        """
        Retrieve an architecture snapshot by primary key.

        The complete architecture result is loaded:
        - score;
        - issues;
        - recommendations.
        """

        statement = (
            select(ArchitectureSnapshot)
            .where(
                ArchitectureSnapshot.id == snapshot_id,
            )
            .options(
                selectinload(ArchitectureSnapshot.score),
                selectinload(ArchitectureSnapshot.issues),
                selectinload(
                    ArchitectureSnapshot.recommendations,
                ),
            )
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def get_by_analysis_result(
        self,
        *,
        analysis_result_id: int,
    ) -> ArchitectureSnapshot | None:
        """
        Retrieve the architecture snapshot generated from
        a specific analysis result.
        """

        statement = (
            select(ArchitectureSnapshot)
            .where(
                ArchitectureSnapshot.analysis_result_id
                == analysis_result_id,
            )
            .options(
                selectinload(ArchitectureSnapshot.score),
                selectinload(ArchitectureSnapshot.issues),
                selectinload(
                    ArchitectureSnapshot.recommendations,
                ),
            )
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def get_latest_by_repository(
        self,
        *,
        repository_id: int,
    ) -> ArchitectureSnapshot | None:
        """
        Retrieve the latest architecture snapshot for a repository.
        """

        statement = (
            select(ArchitectureSnapshot)
            .where(
                ArchitectureSnapshot.repository_id
                == repository_id,
            )
            .order_by(
                ArchitectureSnapshot.created_at.desc(),
                ArchitectureSnapshot.id.desc(),
            )
            .limit(1)
            .options(
                selectinload(ArchitectureSnapshot.score),
                selectinload(ArchitectureSnapshot.issues),
                selectinload(
                    ArchitectureSnapshot.recommendations,
                ),
            )
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def get_by_repository(
        self,
        *,
        repository_id: int,
        offset: int = 0,
        limit: int = 20,
    ) -> Sequence[ArchitectureSnapshot]:
        """
        Retrieve architecture history for a repository.

        Results are ordered from newest to oldest.
        """

        statement = (
            select(ArchitectureSnapshot)
            .where(
                ArchitectureSnapshot.repository_id
                == repository_id,
            )
            .order_by(
                ArchitectureSnapshot.created_at.desc(),
                ArchitectureSnapshot.id.desc(),
            )
            .offset(offset)
            .limit(limit)
            .options(
                selectinload(ArchitectureSnapshot.score),
            )
        )

        result = await self.db.execute(statement)

        return result.scalars().all()

    async def count_by_repository(
        self,
        *,
        repository_id: int,
    ) -> int:
        """
        Count architecture snapshots belonging to a repository.
        """

        statement = select(
            func.count(ArchitectureSnapshot.id),
        ).where(
            ArchitectureSnapshot.repository_id
            == repository_id,
        )

        result = await self.db.execute(statement)

        return int(result.scalar_one())

    async def get_previous_snapshot(
        self,
        *,
        repository_id: int,
        snapshot_id: int,
    ) -> ArchitectureSnapshot | None:
        """
        Retrieve the snapshot immediately preceding a given snapshot.

        This will later support architecture evolution and
        snapshot comparison.
        """

        statement = (
            select(ArchitectureSnapshot)
            .where(
                ArchitectureSnapshot.repository_id
                == repository_id,
                ArchitectureSnapshot.id < snapshot_id,
            )
            .order_by(
                ArchitectureSnapshot.created_at.desc(),
                ArchitectureSnapshot.id.desc(),
            )
            .limit(1)
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def add_score(
        self,
        score: ArchitectureScore,
    ) -> ArchitectureScore:
        """
        Persist architecture score without committing.
        """

        self.db.add(score)

        await self.db.flush()
        await self.db.refresh(score)

        return score

    async def add_issue(
        self,
        issue: ArchitectureIssue,
    ) -> ArchitectureIssue:
        """
        Persist one architecture issue without committing.
        """

        self.db.add(issue)

        await self.db.flush()
        await self.db.refresh(issue)

        return issue

    async def add_recommendation(
        self,
        recommendation: ArchitectureRecommendation,
    ) -> ArchitectureRecommendation:
        """
        Persist one architecture recommendation without committing.
        """

        self.db.add(recommendation)

        await self.db.flush()
        await self.db.refresh(recommendation)

        return recommendation