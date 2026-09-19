"""
Tests for Grounded Multi-Turn Chat Service & Module Importance Engine.
"""

from unittest.mock import AsyncMock

import pytest
from app.ai.llm import LLMManager
from app.ai.llm.reasoning_engine import ArchitectureReasoningProvider
from app.models.analysis import AnalysisJob, AnalysisResult, AnalysisStatus, DetectedTechnology, RepositoryMetrics
from app.models.architecture import ArchitectureScore, ArchitectureSnapshot
from app.models.memory import ArchitectureComponent, ArchitectureMemory, ArchitectureMemoryEntry, ComponentStatus, MemoryType
from app.models.repository import Repository
from app.schemas.chat import ChatMessageHistoryItem
from app.services.chat_service import ChatService


@pytest.mark.asyncio
async def test_chat_service_repository_grounding_and_multi_turn():
    repo = Repository(
        id=1,
        organization_id=10,
        github_id=12345,
        name="QuantGuard",
        full_name="ABIODUN43/QuantGuard",
        description="Quantitative Risk Protection",
        visibility="public",
        default_branch="main",
        primary_language="Python",
        clone_url="https://github.com/ABIODUN43/QuantGuard.git",
        html_url="https://github.com/ABIODUN43/QuantGuard",
    )

    job = AnalysisJob(
        id=101,
        repository_id=1,
        status=AnalysisStatus.COMPLETED,
    )

    result = AnalysisResult(
        id=201,
        analysis_job_id=101,
        metrics=RepositoryMetrics(
            loc=4500,
            files=32,
            classes=18,
            functions=74,
            maintainability=82.0,
            complexity=14.0,
        ),
        technologies=[
            DetectedTechnology(technology="FastAPI", version="0.115.0", confidence_score=0.98),
            DetectedTechnology(technology="PostgreSQL", version="16.0", confidence_score=0.95),
        ],
    )

    snapshot = ArchitectureSnapshot(
        id=301,
        repository_id=1,
        analysis_result_id=201,
        graph={
            "version": 1,
            "nodes": [
                {"id": "api-service", "type": "module"},
                {"id": "architecture-service", "type": "module"},
                {"id": "user-repository", "type": "module"},
            ],
            "edges": [
                {"source": "api-service", "target": "architecture-service", "kind": "import"},
                {"source": "architecture-service", "target": "user-repository", "kind": "import"},
            ],
        },
        score=ArchitectureScore(
            score=81.0,
            maintainability=82.0,
            coupling=80.0,
            cohesion=85.0,
            complexity=78.0,
        ),
    )

    memory = ArchitectureMemory(
        id=401,
        organization_id=10,
        repository_id=1,
        latest_analysis_id=101,
        components=[
            ArchitectureComponent(
                name="architecture-service",
                component_type="service",
                path="app/services/architecture_service.py",
                status=ComponentStatus.ACTIVE,
            ),
        ],
    )

    mem_entry = ArchitectureMemoryEntry(
        id=501,
        memory_id=401,
        organization_id=10,
        repository_id=1,
        memory_type=MemoryType.ARCHITECTURE_PATTERN,
        title="Layered Service Architecture",
        content="Business services coordinate domain operations and isolate database adapters.",
        confidence=0.95,
        source_analyzer="AST Scanner",
    )

    # Mock DB session and repositories
    db_mock = AsyncMock()
    service = ChatService(
        db=db_mock,
        llm_manager=LLMManager(provider=ArchitectureReasoningProvider()),
    )

    service.repository_repository.get_by_organization_and_id = AsyncMock(return_value=repo)
    service.analysis_repository.get_by_repository = AsyncMock(return_value=[job])
    service.analysis_repository.get_result_by_job = AsyncMock(return_value=result)
    service.architecture_repository.get_latest_by_repository = AsyncMock(return_value=snapshot)
    service.memory_repository.get_by_repository = AsyncMock(return_value=memory)
    service.memory_repository.list_entries = AsyncMock(return_value=[mem_entry])
    service.memory_repository.list_events = AsyncMock(return_value=[])

    # 1. Ask: Which modules are most important to the architecture, and why?
    res_importance = await service.chat(
        organization_id=10,
        repository_id=1,
        message="Which modules are most important to the architecture, and why?",
    )
    assert res_importance.content
    assert "architecture-service" in res_importance.content
    assert "Degree Centrality" in res_importance.content or "Centrality" in res_importance.content
    assert "Module A" not in res_importance.content  # Zero hallucination invariant!

    # 2. Ask about structure
    res1 = await service.chat(
        organization_id=10,
        repository_id=1,
        message="Explain the module dependency structure and how services connect.",
    )
    assert res1.content
    assert "Observed" in res1.content
    assert "Inferred" in res1.content
    assert "Recommendation" in res1.content
    assert "QuantGuard" in res1.content

    # 3. Multi-turn follow-up with pronoun "it": "What happens if I remove it?"
    history = [
        ChatMessageHistoryItem(role="user", content="Why is `architecture-service` tightly coupled?"),
        ChatMessageHistoryItem(role="assistant", content=res1.content),
    ]
    res2 = await service.chat(
        organization_id=10,
        repository_id=1,
        message="What happens if I remove it?",
        conversation_history=history,
    )
    assert res2.content
    assert "architecture-service" in res2.content
    assert "remove or refactor" in res2.content or "Blast Radius" in res2.content or "Simulation" in res2.content

    # 4. Organization portfolio chat
    service.repository_repository.list_by_organization = AsyncMock(return_value=[repo])
    res_org = await service.chat_organization(
        organization_id=10,
        message="How many repositories have you analyzed in this organization?",
    )
    assert res_org.content
    assert "Portfolio" in res_org.content
    assert "QuantGuard" in res_org.content
