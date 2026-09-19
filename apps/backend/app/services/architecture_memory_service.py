"""
Architecture Memory application service for Coodara V2 (Silicon Valley Standard).

Coordinates persistent architectural memory lifecycle, diff reconciliation,
conversational ADR capture & write-back, architectural drift detection, and semantic RAG search.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Sequence
from typing import Any

from app.ai.memory.retriever import ArchitectureMemoryRetriever, ScoredMemoryEntry
from app.architecture.memory.drift_detector import (
    ArchitectureDriftReport,
    detect_architecture_drift,
)
from app.architecture.memory.reconciler import (
    ArchitectureMemoryReconciler,
    ReconciliationResult,
)
from app.models.analysis import AnalysisJob, AnalysisResult, AnalysisStatus
from app.models.architecture import ArchitectureSnapshot
from app.models.memory import (
    ArchitectureEvent,
    ArchitectureEventType,
    ArchitectureMemory,
    ArchitectureMemoryEntry,
    MemoryType,
)
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.architecture_memory_repository import (
    ArchitectureMemoryRepository,
)
from app.repositories.architecture_repository import ArchitectureRepository
from app.repositories.repository_repository import RepositoryRepository
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class ArchitectureMemoryServiceError(Exception):
    """Base exception for architecture memory failures."""


class MemoryRepositoryNotFoundError(ArchitectureMemoryServiceError):
    """Repository does not exist or is not accessible."""


class MemoryAnalysisNotFoundError(ArchitectureMemoryServiceError):
    """Analysis job does not exist."""


class MemoryEntryNotFoundError(ArchitectureMemoryServiceError):
    """Memory entry does not exist."""


class ArchitectureMemoryService:
    """
    Application service for Architecture Memory workflows.
    """

    def __init__(
        self,
        db: AsyncSession,
        *,
        reconciler: ArchitectureMemoryReconciler | None = None,
        retriever: ArchitectureMemoryRetriever | None = None,
    ) -> None:
        self.db = db
        self.memory_repository = ArchitectureMemoryRepository(db)
        self.repository_repository = RepositoryRepository(db)
        self.analysis_repository = AnalysisRepository(db)
        self.architecture_repository = ArchitectureRepository(db)
        self.reconciler = reconciler or ArchitectureMemoryReconciler()
        self.retriever = retriever or ArchitectureMemoryRetriever()

    async def get_memory(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> ArchitectureMemory | None:
        """
        Retrieve the ArchitectureMemory root for a repository.
        """
        await self._validate_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        return await self.memory_repository.get_by_repository(repository_id)

    async def reconcile_memory(
        self,
        *,
        organization_id: int,
        repository_id: int,
        analysis_id: int,
    ) -> ReconciliationResult:
        """
        Reconcile a completed analysis snapshot with accumulated architectural memory.
        Idempotent: prevents duplicate events if called multiple times for the same analysis.
        """
        await self._validate_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )

        job = await self.analysis_repository.get_by_id(analysis_id)
        if job is None or job.repository_id != repository_id:
            raise MemoryAnalysisNotFoundError("Analysis job not found.")

        result = await self.analysis_repository.get_result_by_job(
            analysis_job_id=analysis_id,
        )
        if result is None:
            raise MemoryAnalysisNotFoundError("Analysis result not found.")

        snapshot = await self.architecture_repository.get_by_analysis_result(
            analysis_result_id=result.id,
        )
        if snapshot is None:
            snapshot = await self.architecture_repository.get_latest_by_repository(
                repository_id=repository_id,
            )

        if snapshot is None:
            raise ArchitectureMemoryServiceError(
                f"Architecture snapshot not found for analysis {analysis_id}"
            )

        memory = await self.memory_repository.get_by_repository(repository_id)
        if memory is None:
            memory = ArchitectureMemory(
                organization_id=organization_id,
                repository_id=repository_id,
                latest_analysis_id=analysis_id,
                components=[],
                technologies=[],
                relationships=[],
                entries=[],
            )
            await self.memory_repository.create_memory(memory)

        reconciliation = self.reconciler.reconcile(
            memory=memory,
            snapshot=snapshot,
            analysis_result=result,
            previous_snapshot=None,
            analysis_id=analysis_id,
        )

        for entry in reconciliation.new_entries:
            entry.memory_id = memory.id
            self.db.add(entry)

        for event in reconciliation.new_events:
            self.db.add(event)

        memory.latest_analysis_id = analysis_id
        await self.db.flush()
        await self.db.commit()
        return reconciliation

    async def record_decision(
        self,
        *,
        organization_id: int,
        repository_id: int,
        title: str,
        content: str,
        memory_type: MemoryType = MemoryType.ARCHITECTURE_DECISION,
        confidence: float = 1.0,
        source_analyzer: str = "Conversational Architecture Decision",
        source_file: str | None = None,
    ) -> ArchitectureMemoryEntry:
        """
        Record and persist a new Architectural Decision Record (ADR) or constraint directly into Architecture Memory.
        """
        await self._validate_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        memory = await self.memory_repository.get_by_repository(repository_id)
        if not memory:
            memory = ArchitectureMemory(
                organization_id=organization_id,
                repository_id=repository_id,
                latest_analysis_id=0,
                components=[],
                technologies=[],
                relationships=[],
                entries=[],
            )
            await self.memory_repository.create_memory(memory)

        entry = ArchitectureMemoryEntry(
            memory_id=memory.id,
            organization_id=organization_id,
            repository_id=repository_id,
            analysis_id=memory.latest_analysis_id or 1,
            memory_type=memory_type,
            title=title,
            content=content,
            confidence=confidence,
            source_analyzer=source_analyzer,
            source_file=source_file,
        )
        saved_entry = await self.memory_repository.create_entry(entry)

        # Emit evolution event
        event = ArchitectureEvent(
            organization_id=organization_id,
            repository_id=repository_id,
            analysis_id=memory.latest_analysis_id or 1,
            event_type=ArchitectureEventType.ARCHITECTURE_CHANGE,
            title=f"Architectural Decision Recorded: {title}",
            description=content[:250],
        )
        await self.memory_repository.create_event(event)

        await self.db.commit()
        await self.db.refresh(saved_entry)
        return saved_entry

    async def audit_drift(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> ArchitectureDriftReport:
        """
        Evaluate all active stored decisions & constraints against the latest snapshot graph edges.
        """
        await self._validate_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        entries = await self.memory_repository.list_entries(
            repository_id=repository_id,
            offset=0,
            limit=200,
        )
        latest_snapshot = await self.architecture_repository.get_latest_by_repository(repository_id)
        nodes: list[str] = []
        edges: list[dict[str, str]] = []
        if latest_snapshot and latest_snapshot.graph:
            try:
                g = json.loads(latest_snapshot.graph) if isinstance(latest_snapshot.graph, str) else latest_snapshot.graph
                nodes = [n if isinstance(n, str) else n.get("id", "") for n in g.get("nodes", [])]
                edges = g.get("edges", [])
            except Exception:
                pass
        return detect_architecture_drift(memory_entries=entries, nodes=nodes, edges=edges)

    async def list_events(
        self,
        *,
        organization_id: int,
        repository_id: int,
        offset: int = 0,
        limit: int = 50,
        event_type: ArchitectureEventType | None = None,
    ) -> tuple[Sequence[ArchitectureEvent], int]:
        """
        List architectural evolution events for a repository.
        """
        await self._validate_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        events = await self.memory_repository.list_events(
            repository_id=repository_id,
            offset=offset,
            limit=limit,
            event_type=event_type,
        )
        total = await self.memory_repository.count_events(
            repository_id=repository_id,
            event_type=event_type,
        )
        return events, total

    async def list_entries(
        self,
        *,
        organization_id: int,
        repository_id: int,
        offset: int = 0,
        limit: int = 50,
        memory_type: MemoryType | None = None,
    ) -> Sequence[ArchitectureMemoryEntry]:
        """
        List structured memory entries for a repository.
        """
        await self._validate_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        return await self.memory_repository.list_entries(
            repository_id=repository_id,
            offset=offset,
            limit=limit,
            memory_type=memory_type,
        )

    async def get_entry(
        self,
        *,
        organization_id: int,
        repository_id: int,
        entry_id: int,
    ) -> ArchitectureMemoryEntry:
        """
        Retrieve a single memory entry with tenant verification.
        """
        await self._validate_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        entry = await self.memory_repository.get_entry_by_id(entry_id)
        if entry is None or entry.repository_id != repository_id or entry.organization_id != organization_id:
            raise MemoryEntryNotFoundError("Memory entry not found.")
        return entry

    async def search_memory(
        self,
        *,
        organization_id: int,
        repository_id: int,
        query: str,
        memory_type: MemoryType | None = None,
        limit: int = 15,
    ) -> list[ScoredMemoryEntry]:
        """
        Semantic and keyword search over architectural memory entries.
        """
        await self._validate_repository(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        candidate_entries = await self.memory_repository.list_entries(
            repository_id=repository_id,
            offset=0,
            limit=200,
            memory_type=memory_type,
        )
        return self.retriever.rank_entries(
            entries=candidate_entries,
            query=query,
            limit=limit,
        )

    async def _validate_repository(
        self,
        *,
        organization_id: int,
        repository_id: int,
    ) -> None:
        """
        Validate repository exists and belongs to the given organization.
        """
        repo = await self.repository_repository.get_by_organization_and_id(
            organization_id=organization_id,
            repository_id=repository_id,
        )
        if repo is None:
            raise MemoryRepositoryNotFoundError("Repository not found.")
