"""
End-to-End Silicon Valley 95%+ Architecture Chat & Reasoning Tests.
"""

import pytest

from app.ai.chat.context_engine import ArchitectureContextEngine
from app.ai.chat.intent_resolver import ChatIntent, ChatIntentResolver
from app.ai.llm.base import LLMMessage
from app.ai.llm.reasoning_engine import ArchitectureReasoningProvider
from app.models.architecture import ArchitectureSnapshot
from app.models.repository import Repository


def test_intent_resolver_sv_standard_queries():
    resolver = ChatIntentResolver()

    # 1. Request flow
    r1 = resolver.resolve(query="Trace the request flow from API to database for order checkout")
    assert r1.intent == ChatIntent.TRACE_REQUEST_FLOW

    # 2. Fitness rules
    r2 = resolver.resolve(query="Are there any layer boundary violations or architectural fitness rule failures?")
    assert r2.intent == ChatIntent.AUDIT_ARCHITECTURE_RULES

    # 3. Concept search
    r3 = resolver.resolve(query="Where is rate limiting implemented in this repository?")
    assert r3.intent == ChatIntent.SEARCH_CONCEPTS

    # 4. Patch generation
    r4 = resolver.resolve(query="Give me a code patch to refactor this service and invert the dependency")
    assert r4.intent == ChatIntent.GENERATE_CODE_PATCH

    # 5. Symbol inspection
    r5 = resolver.resolve(query="Show me the symbol definition and callers for OrderService")
    assert r5.intent == ChatIntent.SYMBOL_INSPECTION


@pytest.mark.asyncio
async def test_reasoning_engine_request_flow_and_fitness_audit():
    provider = ArchitectureReasoningProvider()
    context_engine = ArchitectureContextEngine()

    repo = Repository(id=1, name="coodara-core", full_name="coodara/coodara-core", primary_language="Python")
    snapshot = ArchitectureSnapshot(
        id=1,
        repository_id=1,
        analysis_result_id=1,
        snapshot_version=1,
        graph={
            "nodes": ["app/api/orders.py", "app/services/order_service.py", "app/models/order.py"],
            "edges": [
                {"source": "app/api/orders.py", "target": "app/services/order_service.py"},
                {"source": "app/services/order_service.py", "target": "app/models/order.py"},
            ],
        },
    )

    ctx = context_engine.build_repository_context(repository=repo, snapshot=snapshot)

    # 1. Test Request Flow Response
    resp_flow = await provider.generate(
        messages=[
            LLMMessage(role="system", content=context_engine.format_system_prompt(ctx)),
            LLMMessage(role="user", content="Trace the request flow from API to database"),
        ],
        structured_context=ctx,
    )
    assert "Request & Data-Flow Pipeline" in resp_flow.content
    assert "HTTP Ingress Client" in resp_flow.content

    # 2. Test Fitness Audit Response
    resp_fitness = await provider.generate(
        messages=[
            LLMMessage(role="system", content=context_engine.format_system_prompt(ctx)),
            LLMMessage(role="user", content="Audit architectural fitness rules and check for violations"),
        ],
        structured_context=ctx,
    )
    assert "Architecture Fitness Audit" in resp_fitness.content
    assert "Fitness Score" in resp_fitness.content

    # 3. Test Patch Generation Response
    resp_patch = await provider.generate(
        messages=[
            LLMMessage(role="system", content=context_engine.format_system_prompt(ctx)),
            LLMMessage(role="user", content="Generate a code patch to decouple OrderService"),
        ],
        structured_context=ctx,
    )
    assert "Active Architecture Refactoring Patch" in resp_patch.content
    assert "```diff" in resp_patch.content
