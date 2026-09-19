"""
Architecture Memory repository layer for Coodara V2.

Encapsulates SQL persistence queries for ArchitectureMemory, ArchitectureComponent,
ArchitectureRelationship, ArchitectureTechnologyMemory, ArchitectureMemoryEntry,
and ArchitectureEvent.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.models.memory import (
    ArchitectureComponent,
    ArchitectureEvent,
    ArchitectureEventType,
    ArchitectureMemory,
    ArchitectureMemoryEntry,
    ArchitectureRelationship,
    ArchitectureTechnologyMemory,
    MemoryType,
)
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class ArchitectureMemoryRepository:
    """
    SQLAlchemy repository for Architecture Memory entities.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_repository(
        self,
        repository_id: int,
    ) -> ArchitectureMemory | None:
        """
        Retrieve the ArchitectureMemory root for a repository.
        """
        statement = (
            select(ArchitectureMemory)
            .options(
                selectinload(ArchitectureMemory.components),
                selectinload(ArchitectureMemory.relationships),
                selectinload(ArchitectureMemory.technologies),
                selectinload(ArchitectureMemory.entries),
            )
            .where(ArchitectureMemory.repository_id == repository_id)
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def create_memory(
        self,
        memory: ArchitectureMemory,
    ) -> ArchitectureMemory:
        """
        Persist a new ArchitectureMemory entity.
        """
        self.db.add(memory)
        await self.db.flush()
        return memory

    async def create_entry(
        self,
        entry: ArchitectureMemoryEntry,
    ) -> ArchitectureMemoryEntry:
        """
        Persist a single ArchitectureMemoryEntry entity.
        """
        self.db.add(entry)
        await self.db.flush()
        return entry

    async def create_event(
        self,
        event: ArchitectureEvent,
    ) -> ArchitectureEvent:
        """
        Persist a single ArchitectureEvent entity.
        """
        self.db.add(event)
        await self.db.flush()
        return event


    async def update_memory(
        self,
        memory: ArchitectureMemory,
    ) -> ArchitectureMemory:
        """
        Update an existing ArchitectureMemory entity.
        """
        await self.db.flush()
        return memory

    async def get_entry_by_id(
        self,
        entry_id: int,
    ) -> ArchitectureMemoryEntry | None:
        """
        Retrieve one ArchitectureMemoryEntry by ID.
        """
        statement = select(ArchitectureMemoryEntry).where(
            ArchitectureMemoryEntry.id == entry_id
        )
        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def list_entries(
        self,
        *,
        repository_id: int,
        offset: int = 0,
        limit: int = 50,
        memory_type: MemoryType | None = None,
    ) -> Sequence[ArchitectureMemoryEntry]:
        """
        List memory entries for a repository.
        """
        statement = (
            select(ArchitectureMemoryEntry)
            .where(ArchitectureMemoryEntry.repository_id == repository_id)
            .order_by(desc(ArchitectureMemoryEntry.created_at))
            .offset(offset)
            .limit(limit)
        )
        if memory_type is not None:
            statement = statement.where(
                ArchitectureMemoryEntry.memory_type == memory_type
            )

        result = await self.db.execute(statement)
        return result.scalars().all()

    async def add_events(
        self,
        events: list[ArchitectureEvent],
    ) -> None:
        """
        Persist multiple architectural evolution events.
        """
        for event in events:
            self.db.add(event)
        await self.db.flush()

    async def list_events(
        self,
        *,
        repository_id: int,
        offset: int = 0,
        limit: int = 50,
        event_type: ArchitectureEventType | None = None,
    ) -> Sequence[ArchitectureEvent]:
        """
        List historical architectural events for a repository.
        """
        statement = (
            select(ArchitectureEvent)
            .where(ArchitectureEvent.repository_id == repository_id)
            .order_by(desc(ArchitectureEvent.created_at))
            .offset(offset)
            .limit(limit)
        )
        if event_type is not None:
            statement = statement.where(
                ArchitectureEvent.event_type == event_type
            )

        result = await self.db.execute(statement)
        return result.scalars().all()

    async def count_events(
        self,
        *,
        repository_id: int,
        event_type: ArchitectureEventType | None = None,
    ) -> int:
        """
        Count total architectural events for a repository.
        """
        statement = (
            select(func.count(ArchitectureEvent.id))
            .where(ArchitectureEvent.repository_id == repository_id)
        )
        if event_type is not None:
            statement = statement.where(
                ArchitectureEvent.event_type == event_type
            )

        result = await self.db.execute(statement)
        return result.scalar_one() or 0

    async def search_entries(
        self,
        *,
        repository_id: int,
        query: str,
        memory_type: MemoryType | None = None,
        limit: int = 20,
    ) -> Sequence[ArchitectureMemoryEntry]:
        """
        Keyword & substring search over memory entries within a repository.
        """
        search_filter = (
            ArchitectureMemoryEntry.title.ilike(f"%{query}%")
            | ArchitectureMemoryEntry.content.ilike(f"%{query}%")
        )

        statement = (
            select(ArchitectureMemoryEntry)
            .where(
                ArchitectureMemoryEntry.repository_id == repository_id,
                search_filter,
            )
            .order_by(desc(ArchitectureMemoryEntry.created_at))
            .limit(limit)
        )
        if memory_type is not None:
            statement = statement.where(
                ArchitectureMemoryEntry.memory_type == memory_type
            )

        result = await self.db.execute(statement)
        return result.scalars().all()
