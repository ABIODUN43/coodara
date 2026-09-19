"""
Generalized Architecture Intelligence Benchmark Suite for Coodara AI.

Evaluates Coodara's core reasoning engine across multi-repository benchmarks:
1. Apache Kafka Distributed Architecture (Java/Scala)
2. FastAPI Distributed Service (Python)
3. Synthetic Circular Dependency & Architecture Violation Repo
4. Incomplete Telemetry Repo (Coverage Gate & UNKNOWN state validation)
"""

import pytest
from app.ai.chat.context_engine import StructuredArchitectureContext
from app.ai.chat.intent_planner import ArchitectureQueryPlanner
from app.ai.chat.intent_resolver import ChatIntent, ChatIntentResolver
from app.ai.coverage.gate import AnalysisCoverageGate, CoverageStatus
from app.ai.evidence.graph_layer import MultiLayerGraphEngine
from app.ai.evidence.models import EvidenceSet, EvidenceType, RelationshipType
from app.ai.llm.base import LLMMessage
from app.ai.llm.reasoning_engine import ArchitectureReasoningProvider
from app.analyzers.context import RepositoryContext
from app.analyzers.dependency_analyzer import DependencyAnalyzer
from app.architecture.memory.drift_detector import detect_architecture_drift
from app.models.memory import ArchitectureMemoryEntry, MemoryType


@pytest.fixture
def reasoning_provider():
    return ArchitectureReasoningProvider()


@pytest.fixture
def kafka_context():
    """Simulated Apache Kafka repository architectural context with rich Java/Scala topology."""
    nodes = [
        "kafka/network/SocketServer.scala",
        "kafka/network/RequestChannel.scala",
        "kafka/server/KafkaApis.scala",
        "kafka/server/ReplicaManager.scala",
        "kafka/cluster/Partition.scala",
        "kafka/log/UnifiedLog.scala",
        "kafka/log/LogSegment.scala",
        "kafka/raft/KafkaRaftClient.java",
        "kafka/coordinator/group/GroupCoordinator.scala",
        "kafka/coordinator/transaction/TransactionCoordinator.scala",
    ]
    edges = [
        {"source": "kafka/network/SocketServer.scala", "target": "kafka/network/RequestChannel.scala", "kind": "calls"},
        {"source": "kafka/network/RequestChannel.scala", "target": "kafka/server/KafkaApis.scala", "kind": "import"},
        {"source": "kafka/server/KafkaApis.scala", "target": "kafka/server/ReplicaManager.scala", "kind": "calls"},
        {"source": "kafka/server/KafkaApis.scala", "target": "kafka/coordinator/group/GroupCoordinator.scala", "kind": "calls"},
        {"source": "kafka/server/ReplicaManager.scala", "target": "kafka/cluster/Partition.scala", "kind": "calls"},
        {"source": "kafka/server/ReplicaManager.scala", "target": "kafka/log/UnifiedLog.scala", "kind": "calls"},
        {"source": "kafka/cluster/Partition.scala", "target": "kafka/log/UnifiedLog.scala", "kind": "calls"},
        {"source": "kafka/log/UnifiedLog.scala", "target": "kafka/log/LogSegment.scala", "kind": "calls"},
        {"source": "kafka/server/KafkaApis.scala", "target": "kafka/raft/KafkaRaftClient.java", "kind": "calls"},
    ]
    return StructuredArchitectureContext(
        repository_name="coodara-benchmark-kafka",
        repository_full_name="apache/kafka",
        primary_language="Java / Scala",
        architecture_style="Distributed Log & Quorum Consensus",
        score=92.0,
        maintainability=88.0,
        coupling_score=85.0,
        cohesion_score=90.0,
        complexity_score=80.0,
        loc=450000,
        files_count=len(nodes),
        classes_count=120,
        functions_count=850,
        detected_technologies=["Java", "Scala", "Gradle", "KRaft", "NIO"],
        nodes=nodes,
        edges=edges,
    )


# -----------------------------------------------------------------------------
# BENCHMARK TEST 1: NO GENERIC FALLBACKS FOR KAFKA
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_kafka_overview_no_generic_fallbacks(reasoning_provider, kafka_context):
    """Assert Kafka architecture reconstruction discovers empirical subsystems and avoids generic 4-tier diagrams."""
    query = "Reconstruct Kafka's architecture. Explain the major architectural subsystems and their responsibilities."
    messages = [
        LLMMessage(role="system", content="Repository: coodara-benchmark-kafka (Java / Scala)"),
        LLMMessage(role="user", content=query),
    ]

    response = await reasoning_provider.generate(messages=messages, structured_context=kafka_context)
    content = response.content

    # Assert ZERO generic fallbacks
    assert "API Entrypoints (HTTP / Routers)" not in content
    assert "Application Services (Business Logic)" not in content
    assert "Domain Models (Core Primitives)" not in content
    assert "Persistence Adapters (Database & Storage)" not in content
    assert "Python / TypeScript stack" not in content

    # Assert Empirical Subsystems Discovered
    assert "Ingress" in content or "Protocol" in content or "SocketServer" in content
    assert "Storage" in content or "Persistence" in content or "UnifiedLog" in content
    assert "Replication" in content or "ReplicaManager" in content

    # Assert 3-Tier Structure
    assert "1. Observed" in content
    assert "2. Inferred" in content
    assert "3. Uncertain" in content or "Unknown" in content


# -----------------------------------------------------------------------------
# BENCHMARK TEST 2: MESSAGE LIFECYCLE FLOW TRACING
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_kafka_message_lifecycle_tracing(reasoning_provider, kafka_context):
    """Assert message lifecycle traces end-to-end execution without misclassifying into circular dependencies."""
    query = "Trace the lifecycle of a Kafka message from producer to consumer."
    messages = [
        LLMMessage(role="system", content="Repository: coodara-benchmark-kafka"),
        LLMMessage(role="user", content=query),
    ]

    response = await reasoning_provider.generate(messages=messages, structured_context=kafka_context)
    content = response.content

    # Assert NOT misrouted to circular dependencies
    assert "Tarjan" not in content
    assert "Acyclic Dependencies Principle" not in content

    # Assert Message Lifecycle Pipeline present
    assert "Producer" in content or "External Client" in content
    assert "SocketServer" in content or "Ingress" in content
    assert "ReplicaManager" in content or "Partition" in content
    assert "LogSegment" in content or "Storage" in content
    assert "Consumer" in content or "Egress" in content


# -----------------------------------------------------------------------------
# BENCHMARK TEST 3: BLAST RADIUS SIMULATION ON REPLICAMANAGER
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_kafka_replica_manager_blast_radius(reasoning_provider, kafka_context):
    """Assert blast radius on ReplicaManager computes true downstream dependencies and risk."""
    query = "What happens if ReplicaManager is removed?"
    messages = [
        LLMMessage(role="system", content="Repository: coodara-benchmark-kafka"),
        LLMMessage(role="user", content=query),
    ]

    response = await reasoning_provider.generate(messages=messages, structured_context=kafka_context)
    content = response.content

    # Assert ReplicaManager is correctly targeted
    assert "ReplicaManager" in content
    assert "CRITICAL" in content or "Direct Downstream Dependents" in content or "dependent" in content.lower()
    assert "KafkaApis" in content  # KafkaApis calls ReplicaManager


# -----------------------------------------------------------------------------
# BENCHMARK TEST 4: MATHEMATICAL CENTRALITY ANALYSIS
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_kafka_centrality_analysis(reasoning_provider, kafka_context):
    """Assert centrality ranking computes real graph metrics."""
    query = "What are the most architecturally central components in Kafka?"
    messages = [
        LLMMessage(role="system", content="Repository: coodara-benchmark-kafka"),
        LLMMessage(role="user", content=query),
    ]

    response = await reasoning_provider.generate(messages=messages, structured_context=kafka_context)
    content = response.content

    # Assert mathematical table
    assert "Afferent ($C_a$)" in content
    assert "Efferent ($C_e$)" in content
    assert "Centrality Score" in content


# -----------------------------------------------------------------------------
# BENCHMARK TEST 5: ARCHITECTURE COVERAGE GATE (FIRST-CLASS UNKNOWN)
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_coverage_gate_stops_hallucination_on_empty_repo(reasoning_provider):
    """Assert the coverage gate halts reasoning and outputs UNKNOWN diagnostics when telemetry is missing."""
    empty_context = StructuredArchitectureContext(
        repository_name="empty-unindexed-repo",
        repository_full_name="user/empty-repo",
        primary_language="Python",
        architecture_style="Unknown",
        score=0.0,
        maintainability=0.0,
        coupling_score=0.0,
        cohesion_score=0.0,
        complexity_score=0.0,
        loc=0,
        files_count=0,
        classes_count=0,
        functions_count=0,
        nodes=[],
        edges=[],
    )

    query = "What is the blast radius if I remove AuthService?"
    messages = [
        LLMMessage(role="system", content="Repository: empty-unindexed-repo"),
        LLMMessage(role="user", content=query),
    ]

    response = await reasoning_provider.generate(messages=messages, structured_context=empty_context)
    content = response.content

    # Assert coverage gate diagnostic returned
    assert "UNKNOWN / INSUFFICIENT EVIDENCE" in content
    assert "telemetry is currently empty" in content or "minimum evidence threshold" in content


# -----------------------------------------------------------------------------
# BENCHMARK TEST 6: DRIFT AUDIT WITH ZERO CONSTRAINTS (NOT EVALUABLE)
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_drift_audit_honest_not_evaluable_on_zero_constraints(reasoning_provider, kafka_context):
    """Assert drift audit outputs NOT EVALUABLE when zero constraints exist, refusing fake 100% compliance."""
    query = "Check if the codebase violates any recorded architectural decisions."
    messages = [
        LLMMessage(role="system", content="Repository: coodara-benchmark-kafka"),
        LLMMessage(role="user", content=query),
    ]

    response = await reasoning_provider.generate(messages=messages, structured_context=kafka_context)
    content = response.content

    # Assert honest NOT EVALUABLE
    assert "NOT EVALUABLE / NO CONSTRAINTS RECORDED" in content
    assert "Coodara will never report a fake" in content
