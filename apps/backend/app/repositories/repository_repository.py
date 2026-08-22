"""
Repository persistence layer.

Responsible only for database operations involving repositories.

Transaction ownership belongs to the service/application layer.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.models.repository import Repository
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession


class RepositoryRepository:
    """
    Data-access object for repository persistence.
    """

    def __init__(
        self,
        db: AsyncSession,
    ) -> None:
        self.db = db

    async def create(
        self,
        repository: Repository,
    ) -> Repository:
        """
        Persist a repository without committing.
        """

        self.db.add(repository)

        await self.db.flush()
        await self.db.refresh(repository)

        return repository

    async def get_by_id(
        self,
        repository_id: int,
    ) -> Repository | None:
        """
        Retrieve a repository by primary key.

        This method should only be used where an unscoped lookup
        is explicitly appropriate. Organization-owned application
        operations should prefer organization-scoped methods.
        """

        statement = select(Repository).where(
            Repository.id == repository_id,
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def get_by_organization_and_id(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> Repository | None:
        """
        Retrieve a repository belonging to an organization.
        """

        statement = select(Repository).where(
            Repository.id == repository_id,
            Repository.organization_id == organization_id,
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def get_by_organization_and_github_id(
        self,
        *,
        organization_id: int,
        github_id: int,
    ) -> Repository | None:
        """
        Retrieve an imported GitHub repository belonging
        to an organization.
        """

        statement = select(Repository).where(
            Repository.organization_id == organization_id,
            Repository.github_id == github_id,
        )

        result = await self.db.execute(statement)

        return result.scalar_one_or_none()

    async def list_by_organization(
        self,
        *,
        organization_id: int,
        offset: int = 0,
        limit: int = 20,
    ) -> Sequence[Repository]:
        """
        Retrieve repositories belonging to an organization.

        Results are deterministically ordered by most recently
        updated repository first.
        """

        statement = (
            select(Repository)
            .where(
                Repository.organization_id == organization_id,
            )
            .order_by(
                Repository.updated_at.desc(),
                Repository.id.desc(),
            )
            .offset(offset)
            .limit(limit)
        )

        result = await self.db.execute(statement)

        return result.scalars().all()

    async def count_by_organization(
        self,
        *,
        organization_id: int,
    ) -> int:
        """
        Count repositories belonging to an organization.
        """

        from sqlalchemy import func

        statement = select(
            func.count(Repository.id),
        ).where(
            Repository.organization_id == organization_id,
        )

        result = await self.db.execute(statement)

        return int(result.scalar_one())

    async def update(
        self,
        repository: Repository,
    ) -> Repository:
        """
        Flush changes to an existing repository.

        No transaction is committed here.
        """

        await self.db.flush()
        await self.db.refresh(repository)

        return repository

    async def delete(
        self,
        repository: Repository,
    ) -> None:
        """
        Delete a repository without committing.
        """

        await self.db.delete(repository)
        await self.db.flush()

    async def delete_by_organization_and_id(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> bool:
        """
        Delete an organization-owned repository.

        Returns True when a repository was deleted.
        """

        statement = delete(Repository).where(
            Repository.id == repository_id,
            Repository.organization_id == organization_id,
        )

        result = await self.db.execute(statement)

        return bool(result.rowcount)