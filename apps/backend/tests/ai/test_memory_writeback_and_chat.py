"""
Tests for Conversational ADR Capture, Memory Write-Back, and Chat Drift Queries.
"""

from unittest.mock import AsyncMock

import pytest
from app.ai.chat.context_engine import ArchitectureContextEngine
from app.ai.chat.intent_resolver import ChatIntent, ChatIntentResolver
from app.ai.llm.reasoning_engine import ArchitectureReasoningProvider
from app.models.memory import (
    ArchitectureMemory,
    ArchitectureMemoryEntry,
    MemoryType,
)
from app.models.repository import Repository
from app.services.architecture_memory_service import ArchitectureMemoryService


def test_intent_resolver_memory_intents():
    resolver = ChatIntentResolver()

    # 1. Save Decision
    q1 = resolver.resolve(query="Save this decision: Use PostgreSQL for event logs and Redis only for caching")
    assert q1.intent == ChatIntent.SAVE_MEMORY_DECISION

    # 2. Retrieve ADRs
    q2 = resolver.resolve(query="Show me all recorded architectural decisions (ADRs)")
    assert q2.intent == ChatIntent.RETRIEVE_ADR

    # 3. Detect Drift
    q3 = resolver.resolve(query="Check if any architectural decisions have drifted or been violated")
    assert q3.intent == ChatIntent.DETECT_DRIFT


@pytest.mark.asyncio
async def test_reasoning_engine_adr_capture_and_drift_response():
    provider = ArchitectureReasoningProvider()
    context_engine = ArchitectureContextEngine()

    repo = Repository(id=1, name="coodara-core", full_name="coodara/coodara-core", primary_language="Python")
    mem_entry = ArchitectureMemoryEntry(
        id=1,
        memory_id=1,
        organization_id=1,
        repository_id=1,
        analysis_id=1,
        memory_type=MemoryType.ARCHITECTURE_DECISION,
        title="Event-Driven Architecture with Kafka",
        content="Inter-service events must be published to Kafka topics.",
        confidence=1.0,
    )

    ctx = context_engine.build_repository_context(
        repository=repo,
        memory_entries=[mem_entry],
    )

    # 1. Test Save Decision Response
    from app.ai.llm.base import LLMMessage
    res_save = await provider.generate(
        messages=[
            LLMMessage(role="system", content=context_engine.format_system_prompt(ctx)),
            LLMMessage(role="user", content="Save this decision: Domain models must never import HTTP clients"),
        ],
        structured_context=ctx,
    )
    assert "Architectural Decision Recorded" in res_save.content
    assert "ADR-0" in res_save.content
    assert "PostgreSQL Architecture Memory" in res_save.content

    # 2. Test Retrieve ADRs Response
    res_adrs = await provider.generate(
        messages=[
            LLMMessage(role="system", content=context_engine.format_system_prompt(ctx)),
            LLMMessage(role="user", content="Show me all recorded architectural decisions (ADRs)"),
        ],
        structured_context=ctx,
    )
    assert "Active Architectural Decisions" in res_adrs.content
    assert "Event-Driven Architecture" in res_adrs.content

    # 3. Test Detect Drift Response
    res_drift = await provider.generate(
        messages=[
            LLMMessage(role="system", content=context_engine.format_system_prompt(ctx)),
            LLMMessage(role="user", content="Check if any architectural decisions have drifted"),
        ],
        structured_context=ctx,
    )
    assert "Architecture Drift" in res_drift.content
    assert "Drift Score" in res_drift.content


@pytest.mark.asyncio
async def test_architecture_memory_service_record_decision():
    db_mock = AsyncMock()
    service = ArchitectureMemoryService(db=db_mock)

    repo = Repository(id=1, name="coodara", organization_id=10)
    memory = ArchitectureMemory(id=100, organization_id=10, repository_id=1, latest_analysis_id=5)

    service.repository_repository.get_by_organization_and_id = AsyncMock(return_value=repo)
    service.memory_repository.get_by_repository = AsyncMock(return_value=memory)
    service.memory_repository.create_entry = AsyncMock(side_effect=lambda entry: entry)
    service.memory_repository.create_event = AsyncMock()

    saved = await service.record_decision(
        organization_id=10,
        repository_id=1,
        title="Layer Boundary Rule",
        content="Routers cannot query DB models directly",
        memory_type=MemoryType.ARCHITECTURE_CONSTRAINT,
    )

    assert saved.title == "Layer Boundary Rule"
    assert saved.organization_id == 10
    assert saved.repository_id == 1
    assert service.memory_repository.create_entry.called
    assert service.memory_repository.create_event.called
