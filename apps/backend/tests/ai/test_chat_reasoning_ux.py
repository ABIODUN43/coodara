"""
Tests for Chat Reasoning & Response UX Implementation.
Covers Section 18 Golden Cases & User Corrections:
1. Remove a component with direct dependents.
2. Compatible refactor ("zero direct public-contract breakage under the compatible-refactor assumption").
3. Breaking interface change.
4. Component inside a detected cycle.
5. Component with no dependents.
6. Boundary-crossing change.
7. Missing runtime telemetry (Structural: High, Runtime: Unknown).
8. Ambiguous natural-language intervention ("remove or refactor") returning independent alternatives.
9. Coordinator resolution with coupling metrics and tie detection.
"""

import pytest
from app.ai.chat.context_engine import StructuredArchitectureContext
from app.ai.chat.intent_resolver import ChatIntent, ChatIntentResolver
from app.ai.llm.base import LLMMessage
from app.ai.llm.reasoning_engine import ArchitectureReasoningProvider
from app.ai.tools.graph_tools import (
    calculate_coupling_metrics,
    detect_dependency_cycles,
    resolve_highest_coupling_coordinator,
    simulate_component_removal,
)
from app.architecture.models import (
    ArchitectureEdge,
    ArchitectureGraph,
    ArchitectureNode,
)
from app.architecture.simulation import (
    ConfidenceLevel,
    DeterministicSimulationEngine,
    InterventionType,
    normalize_intervention,
)
from app.schemas.chat import (
    ChatMessageResponse,
    ReasoningConfidence,
    StructuredReasoningResult,
)


# ============================================================================
# Golden Case 9: Coordinator resolution with coupling metrics & tie detection
# ============================================================================

def test_coordinator_resolution_unique_highest():
    nodes = ["Router", "OrderCoordinator", "BillingService", "InventoryService", "Database"]
    edges = [
        ("Router", "OrderCoordinator"),
        ("OrderCoordinator", "BillingService"),
        ("OrderCoordinator", "InventoryService"),
        ("BillingService", "Database"),
        ("InventoryService", "Database"),
    ]

    coord, candidates = resolve_highest_coupling_coordinator(nodes, edges)
    assert coord == "OrderCoordinator"
    assert len(candidates) == 1


def test_coordinator_resolution_tie_detection():
    nodes = ["Router", "CoordinatorA", "CoordinatorB", "Worker"]
    edges = [
        ("Router", "CoordinatorA"),
        ("CoordinatorA", "Worker"),
        ("Router", "CoordinatorB"),
        ("CoordinatorB", "Worker"),
    ]

    coord, candidates = resolve_highest_coupling_coordinator(nodes, edges)
    # CoordinatorA and CoordinatorB have identical metrics: Ca=1, Ce=1, degree=2
    assert coord is None  # Ambiguous tie detected, surfaced for user selection
    assert len(candidates) == 2
    assert "CoordinatorA" in candidates
    assert "CoordinatorB" in candidates


# ============================================================================
# Intervention Normalizer & Multi-Type Simulation
# ============================================================================

def test_intervention_normalizer():
    assert normalize_intervention("remove") == InterventionType.REMOVE
    assert normalize_intervention("delete") == InterventionType.REMOVE
    assert normalize_intervention("refactor") == InterventionType.REFACTOR
    assert normalize_intervention("compatible refactor") == InterventionType.COMPATIBLE_REFACTOR
    assert normalize_intervention("breaking change") == InterventionType.BREAKING_REFACTOR
    assert normalize_intervention("breaking refactor") == InterventionType.BREAKING_REFACTOR


# ============================================================================
# Golden Cases 1, 2, 3: Deterministic Simulation Engine Interventions
# ============================================================================

def test_deterministic_simulation_remove_vs_compatible_refactor():
    nodes = (
        ArchitectureNode(id="apps/api/routes", type="module"),
        ArchitectureNode(id="apps/core/services", type="module"),
        ArchitectureNode(id="apps/db/models", type="module"),
    )
    edges = (
        ArchitectureEdge(source="apps/api/routes", target="apps/core/services", kind="imports"),
        ArchitectureEdge(source="apps/core/services", target="apps/db/models", kind="imports"),
    )
    graph = ArchitectureGraph(version=1, nodes=nodes, edges=edges)
    engine = DeterministicSimulationEngine(graph=graph)

    # 1. REMOVE Intervention
    res_remove = engine.simulate(
        target_component_id="apps/core/services",
        explicit_intervention_type=InterventionType.REMOVE,
    )
    assert res_remove.intervention_type == InterventionType.REMOVE
    assert "apps/core/services" in res_remove.removed_nodes
    callers_remove = [d for d in res_remove.direct_impacts if d.entity_id == "apps/api/routes"]
    assert len(callers_remove) > 0
    assert "will break upon removal" in callers_remove[0].reason

    # 2. COMPATIBLE_REFACTOR Intervention
    res_refactor = engine.simulate(
        target_component_id="apps/core/services",
        explicit_intervention_type=InterventionType.COMPATIBLE_REFACTOR,
    )
    assert res_refactor.intervention_type == InterventionType.COMPATIBLE_REFACTOR
    assert len(res_refactor.removed_nodes) == 0
    callers_refactor = [d for d in res_refactor.direct_impacts if d.entity_id == "apps/api/routes"]
    assert len(callers_refactor) > 0
    # Must explicitly state zero direct public-contract breakage under compatible refactor
    assert "zero direct public-contract breakage under the compatible-refactor assumption" in callers_refactor[0].reason

    # 3. BREAKING_REFACTOR Intervention
    res_breaking = engine.simulate(
        target_component_id="apps/core/services",
        explicit_intervention_type=InterventionType.BREAKING_REFACTOR,
    )
    assert res_breaking.intervention_type == InterventionType.BREAKING_REFACTOR
    callers_breaking = [d for d in res_breaking.direct_impacts if d.entity_id == "apps/api/routes"]
    assert len(callers_breaking) > 0
    assert "interface contract change requires caller updates" in callers_breaking[0].reason


# ============================================================================
# Golden Case 4: Component inside a detected cycle
# ============================================================================

def test_simulation_cycle_detection():
    nodes = ["ServiceA", "ServiceB", "ServiceC"]
    edges = [("ServiceA", "ServiceB"), ("ServiceB", "ServiceC"), ("ServiceC", "ServiceA")]
    cycles = detect_dependency_cycles(nodes, edges)

    assert cycles.has_cycles is True
    assert "ServiceA" in cycles.participating_nodes
    assert "ServiceB" in cycles.participating_nodes
    assert "ServiceC" in cycles.participating_nodes


# ============================================================================
# Golden Case 5: Component with no dependents
# ============================================================================

def test_simulation_leaf_component_no_dependents():
    nodes = (
        ArchitectureNode(id="apps/core/services", type="module"),
        ArchitectureNode(id="apps/core/leaf_util", type="module"),
    )
    edges = ()
    graph = ArchitectureGraph(version=1, nodes=nodes, edges=edges)
    engine = DeterministicSimulationEngine(graph=graph)

    res = engine.simulate(
        target_component_id="apps/core/leaf_util",
        explicit_intervention_type=InterventionType.REMOVE,
    )
    assert res.indirect_impact_count == 0
    callers = [d for d in res.direct_impacts if d.relationship == "upstream_caller"]
    assert len(callers) == 0


# ============================================================================
# Golden Case 6: Boundary-crossing detection
# ============================================================================

def test_boundary_crossing_detection():
    nodes = (
        ArchitectureNode(id="apps/api/routes", type="module"),
        ArchitectureNode(id="apps/core/services", type="module"),
        ArchitectureNode(id="apps/db/models", type="module"),
    )
    edges = (
        ArchitectureEdge(source="apps/api/routes", target="apps/core/services", kind="imports"),
        ArchitectureEdge(source="apps/core/services", target="apps/db/models", kind="imports"),
    )
    graph = ArchitectureGraph(version=1, nodes=nodes, edges=edges)
    engine = DeterministicSimulationEngine(graph=graph)

    res = engine.simulate(
        target_component_id="apps/db/models",
        explicit_intervention_type=InterventionType.REMOVE,
    )
    assert res.boundaries_crossed_count > 0
    crossings = [(b.from_boundary, b.to_boundary) for b in res.boundaries_crossed]
    assert ("apps/db", "apps/core") in crossings or ("apps/core", "apps/api") in crossings


# ============================================================================
# Golden Case 7: Separated confidence metrics
# ============================================================================

def test_separated_confidence_dimensions():
    nodes = (
        ArchitectureNode(id="apps/api/routes", type="module"),
        ArchitectureNode(id="apps/core/services", type="module"),
    )
    edges = (
        ArchitectureEdge(source="apps/api/routes", target="apps/core/services", kind="imports"),
    )
    graph = ArchitectureGraph(version=1, nodes=nodes, edges=edges)
    engine = DeterministicSimulationEngine(graph=graph)

    res = engine.simulate(target_component_id="apps/core/services")
    assert res.confidence.structural_confidence == ConfidenceLevel.HIGH
    assert res.confidence.evidence_confidence == ConfidenceLevel.HIGH
    # Missing runtime telemetry must be UNKNOWN
    assert res.confidence.runtime_confidence == ConfidenceLevel.UNKNOWN


# ============================================================================
# Golden Case 8: Full Structured Reasoning with Compound Interventions
# ============================================================================

@pytest.mark.asyncio
async def test_reasoning_engine_compound_simulation():
    provider = ArchitectureReasoningProvider()

    nodes = ["Router", "OrderCoordinator", "BillingService", "InventoryService"]
    edges = [
        ("Router", "OrderCoordinator"),
        ("OrderCoordinator", "BillingService"),
        ("OrderCoordinator", "InventoryService"),
    ]

    ctx = StructuredArchitectureContext(
        repository_name="test-repo",
        repository_full_name="org/test-repo",
        primary_language="Python",
        architecture_style="Modular Monolith",
        score=85.0,
        maintainability=80.0,
        coupling_score=75.0,
        cohesion_score=80.0,
        complexity_score=70.0,
        loc=1200,
        files_count=4,
        classes_count=4,
        functions_count=10,
        nodes=nodes,
        edges=[{"source": s, "target": t} for s, t in edges],
    )

    query = "What happens if I remove or refactor the highest-coupling coordinator?"
    messages = [LLMMessage(role="user", content=query)]

    response = await provider.generate(messages=messages, structured_context=ctx)

    assert response.structured_reasoning is not None
    sr = response.structured_reasoning

    # Verify Executive Summary present
    assert "summary" in sr
    assert len(sr["summary"]) > 0

    # Verify 2 independent alternatives were evaluated and returned
    alternatives = sr["alternatives"]
    assert len(alternatives) == 2

    # Alternative A: Removal has broken callers
    alt_remove = next(a for a in alternatives if "remove" in a["intervention"].lower())
    assert alt_remove["direct_breakage_count"] >= 1

    # Alternative B: Compatible refactor has 0 direct breakage
    alt_refactor = next(a for a in alternatives if "refactor" in a["intervention"].lower())
    assert alt_refactor["direct_breakage_count"] == 0
    assert "zero direct public-contract breakage" in alt_refactor["summary"].lower()

    # Verify Separated Confidence Assessment
    confidence = sr["confidence"]
    assert confidence["structural"] == "HIGH"
    assert confidence["evidence"] == "HIGH"
    assert confidence["runtime"] == "UNKNOWN"

    # Verify Section 5 formatting in text content
    content = response.content
    assert "What happens if you remove or refactor" in content
    assert "What the repository shows" in content
    assert "Likely structural consequences" in content
    assert "zero direct public-contract breakage under the compatible-refactor assumption" in content
    assert "What is not verified" in content
    assert "Structural confidence: High" in content
    assert "Runtime confidence: Unknown" in content

    # Verify no arbitrary numeric confidence in text
    assert "0.95 / 1.0" not in content
    assert "0.94 / 1.0" not in content


# ============================================================================
# ChatMessageResponse Pydantic Serialization
# ============================================================================

def test_chat_message_response_pydantic_schema():
    sr_data = StructuredReasoningResult(
        summary="Removing Coordinator breaks 1 direct caller.",
        target_component="Coordinator",
        candidates=[],
        observed=[],
        structural_impacts=[],
        inferences=[],
        unknowns=[],
        confidence=ReasoningConfidence(
            structural="HIGH",
            evidence="HIGH",
            runtime="UNKNOWN",
        ),
        evidence=[],
        alternatives=[],
        actions=[],
    )

    resp = ChatMessageResponse(
        message="Full text message",
        model="coodara-reasoning-engine",
        confidence="HIGH",
        structured_reasoning=sr_data,
    )

    dumped = resp.model_dump()
    assert dumped["structured_reasoning"]["confidence"]["structural"] == "HIGH"
    assert dumped["structured_reasoning"]["confidence"]["runtime"] == "UNKNOWN"
